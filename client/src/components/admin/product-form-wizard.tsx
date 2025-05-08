import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Loader2, ChevronLeft, ChevronRight, Save, Check } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useProductAnalysis } from '@/hooks/use-ai';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Product, Category, insertProductSchema } from '@shared/schema';

// Import the step components
import ImagesBasicInfoStep from './steps/images-basic-info-step';
import AdditionalInfoStep from './steps/additional-info-step';
import { ReviewStep } from './steps/review-step';

// Define product form schema for validation
const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  slug: z.string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, numbers, and hyphens only"),
  description: z.string().nullable().optional(),
  categoryId: z.number({
    required_error: "Category is required",
    invalid_type_error: "Please select a category",
  }),
  catalogId: z.number().nullable().optional(), // Allow selecting catalog for organization
  price: z.number().min(0.01, "Price must be greater than 0"),
  costPrice: z.number().min(0, "Cost price must be greater than or equal to 0").optional(),
  salePrice: z.number().nullable().optional(),
  // stock field removed as business doesn't keep inventory
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isFlashDeal: z.boolean().default(false),
  flashDealEnd: z.date().nullable().optional().refine(
    (date) => !date || date > new Date(),
    { message: "Flash deal end time must be in the future" }
  ),
  discount: z.number().min(0).max(100).default(0),
  tags: z.array(z.string()).default([]).optional(),
  freeShipping: z.boolean().default(false),
  brand: z.string().nullable().optional(),
  newTag: z.string().optional(), // For handling tag input in the UI
});

type ProductFormValues = z.infer<typeof productFormSchema>;

type ProductFormWizardProps = {
  productId?: number;
  catalogId?: number;
  onSuccess?: () => void;
};

export default function ProductFormWizard({ productId, catalogId, onSuccess }: ProductFormWizardProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);

  // Define the form steps
  const steps = [
    { id: 'images-basic-info', label: 'Images & Basic Info' },
    { id: 'additional-info', label: 'Additional Info' },
    { id: 'review', label: 'Review & Submit' }
  ];
  
  const [currentStep, setCurrentStep] = useState(0);
  
  // Fetch categories for the dropdown
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useQuery<{ success: boolean, data: Category[] }>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    }
  });
  
  const categories = categoriesResponse?.data;
  
  // Fetch product data if editing
  const { data: productResponse, isLoading: isLoadingProduct } = useQuery<{ success: boolean, data: Product }>({
    queryKey: ['/api/products', productId],
    queryFn: async () => {
      if (!productId) return { success: true, data: null };
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      return res.json();
    },
    enabled: !!productId,
  });
  
  const product = productResponse?.data;
  
  // Fetch catalog data if creating from catalog context
  const { data: catalogResponse, isLoading: isLoadingCatalog } = useQuery<{ success: boolean, data: any }>({
    queryKey: ['/api/catalogs', catalogId],
    queryFn: async () => {
      if (!catalogId) return { success: true, data: null };
      const res = await fetch(`/api/catalogs/${catalogId}`);
      if (!res.ok) throw new Error('Failed to fetch catalog');
      return res.json();
    },
    enabled: !!catalogId && !productId, // Only fetch if creating new product from catalog
  });
  
  const catalog = catalogResponse?.data;
  
  // Form setup
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      categoryId: undefined,
      catalogId: catalogId || null, // Initial catalog ID from props
      price: 0,
      costPrice: 0,
      salePrice: null,
      isActive: true,
      isFeatured: false,
      isFlashDeal: false,
      flashDealEnd: null,
      discount: 0,
      tags: [],
      freeShipping: false,
      brand: '',
    },
  });
  
  // Update form values when product data is loaded
  useEffect(() => {
    if (product) {
      form.reset({
        ...product,
        // Ensure flashDealEnd is a Date object
        flashDealEnd: product.flashDealEnd ? new Date(product.flashDealEnd) : null,
        // Default tags to empty array if undefined
        tags: product.tags || [],
      });

      // Skip to the details step for existing products
      setCurrentStep(3);
    }
  }, [product, form]);
  
  // Pre-populate with catalog data when creating from catalog context
  useEffect(() => {
    if (catalog && !product && !form.getValues('name')) {
      console.log("Pre-populating form with catalog data:", catalog);
      
      // Pre-populate relevant form fields from catalog
      form.setValue('isActive', catalog.isActive);
      
      // Set the supplier ID from the catalog
      if (catalog.supplierId) {
        console.log("Setting supplier ID from catalog:", catalog.supplierId);
        form.setValue('supplierId', catalog.supplierId);
      }
      
      // Initialize default values for dimensions, sale price and discount
      form.setValue('salePrice', null);
      form.setValue('discount', 0);
      form.setValue('dimensions', '');
      
      // If catalog has default markup percentage, use it to help with pricing calculations
      if (catalog.defaultMarkupPercentage) {
        // Listen for changes in cost price to auto-calculate retail price
        const costPriceSubscription = form.watch((value, { name }) => {
          if (name === 'costPrice' && value.costPrice) {
            const costPrice = parseFloat(value.costPrice.toString());
            if (!isNaN(costPrice) && costPrice > 0) {
              const calculatedPrice = costPrice * (1 + (catalog.defaultMarkupPercentage / 100));
              form.setValue('price', Math.round(calculatedPrice * 100) / 100);
            }
          }
        });
        
        // Cleanup subscription
        return () => costPriceSubscription.unsubscribe();
      }
    }
  }, [catalog, form, product]);
  
  // Fetch product images if editing
  useEffect(() => {
    const fetchProductImages = async () => {
      if (!productId) return;
      
      try {
        const res = await fetch(`/api/products/${productId}/images`);
        if (!res.ok) throw new Error('Failed to fetch product images');
        const response = await res.json();
        // Extract images data from standardized response
        const images = response.success ? response.data : [];
        setUploadedImages(images);
      } catch (error) {
        console.error('Error fetching product images:', error);
      }
    };
    
    if (productId) {
      fetchProductImages();
    }
  }, [productId]);
  
  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      // Convert flashDealEnd to ISO string if it exists
      const formattedData = {
        ...data,
        flashDealEnd: data.flashDealEnd ? new Date(data.flashDealEnd).toISOString() : null,
        // Use catalog ID from form or from props
        catalogId: data.catalogId !== undefined ? data.catalogId : catalogId,
        // Add supplier ID from catalog if creating from catalog context
        supplierId: catalog?.supplierId,
      };
      
      delete formattedData.newTag;
      
      console.log("Creating product with data:", formattedData);
      
      // Use centralized error handling in apiRequest
      const res = await apiRequest('POST', '/api/products', formattedData);
      return res.json();
    },
    onSuccess: async (response) => {
      // Extract the product data from standardized response
      if (!response.success) {
        throw new Error(response.error?.message || "Failed to create product");
      }
      
      const data = response.data;
      // First, move any temporary images to permanent storage
      if (uploadedImages.length > 0) {
        try {
          // Filter only temporary images
          const tempImages = uploadedImages.filter(img => img.isTemp && img.file && img.file.objectKey);
          
          if (tempImages.length > 0) {
            console.log(`Moving ${tempImages.length} temporary images to permanent storage`);
            
            // Process each temp image
            for (const img of tempImages) {
              try {
                console.log(`Processing temp image: ${img.file.objectKey}`);
                
                // Create form data for the image move operation
                const moveData = {
                  sourceKey: img.file.objectKey,
                  productId: data.id
                };
                
                // Move the image file using centralized error handling
                const moveRes = await apiRequest('POST', '/api/products/images/move', moveData);
                const movedImage = await moveRes.json();
                console.log(`Successfully moved image to ${movedImage.objectKey}`);
                
                // Create product image record 
                const imageData = {
                  productId: data.id,
                  url: movedImage.url,
                  objectKey: movedImage.objectKey,
                  isMain: img.isMain || false,
                  alt: img.alt || '',
                };
                
                // Create image record with centralized error handling
                const imgRes = await apiRequest('POST', `/api/products/${data.id}/images`, imageData);
                await imgRes.json();
                console.log("Product image record created successfully");
              } catch (imgError) {
                console.error(`Error processing image:`, imgError);
              }
            }
          }
        } catch (error) {
          console.error('Failed to process temporary images:', error);
          toast({
            title: 'Image Processing Warning',
            description: 'Product was created, but there was an issue with some images',
          });
        }
      }
      
      toast({
        title: 'Product created',
        description: 'The product has been created successfully',
      });
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      if (catalogId) {
        // Also invalidate catalog products queries to update catalog product list
        queryClient.invalidateQueries({ queryKey: [`/api/catalogs/${catalogId}/products`] });
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/admin/products/${data.id}/edit`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create product',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const formattedData = {
        ...data,
        flashDealEnd: data.flashDealEnd ? new Date(data.flashDealEnd).toISOString() : null,
      };
      
      delete formattedData.newTag;
      
      // Use centralized error handling in apiRequest
      const res = await apiRequest('PUT', `/api/products/${productId}`, formattedData);
      return res.json();
    },
    onSuccess: (response) => {
      // Extract the product data from standardized response
      if (!response.success) {
        throw new Error(response.error?.message || "Failed to update product");
      }
      
      const updatedProduct = response.data;
      toast({
        title: 'Product updated',
        description: 'The product has been updated successfully',
      });
      
      // Invalidate product queries
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      // Invalidate catalog product queries if catalogId is present
      if (updatedProduct.catalogId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/catalogs/${updatedProduct.catalogId}/products`] 
        });
      }
      
      // If we have access to the previous product data and the catalog has changed,
      // also invalidate the previous catalog's products
      if (product && product.catalogId && product.catalogId !== updatedProduct.catalogId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/catalogs/${product.catalogId}/products`] 
        });
      }
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update product',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Handle form submission
  const onSubmitProduct = (data: ProductFormValues) => {
    console.log("Form submission attempt with data:", data);
    if (productId) {
      updateMutation.mutate(data);
    } else {
      console.log("Creating new product with data:", data);
      createMutation.mutate(data);
    }
  }
  
  // Debug form submission errors (log errors on failed validation)
  const handleFormSubmit = () => {
    console.log("Preparing to submit form...");
    
    // Check for form validation errors
    const errors = form.formState.errors;
    if (Object.keys(errors).length > 0) {
      console.error("Form validation errors:", errors);
      // Show validation errors in UI
      toast({
        title: "Validation Errors",
        description: "Please fix the form errors before submitting",
        variant: "destructive",
      });
      return;
    }
    
    // If no errors, proceed with submission
    form.handleSubmit(onSubmitProduct)();
  };
  
  // Handle navigation between steps
  const goToNextStep = async () => {
    // Validate current step
    const fieldsToValidate = {
      0: ['name', 'costPrice', 'categoryId', 'price'], // Images & Basic Info step
      1: [], // Additional Info step
      2: []  // Review step doesn't require validation
    }[currentStep];
    
    const result = await form.trigger(fieldsToValidate as Array<keyof ProductFormValues>);
    if (!result) return;
    
    // For the images step, validate that at least one image is uploaded
    if (currentStep === 0 && !productId && uploadedImages.length === 0) {
      toast({
        title: "Image Required",
        description: "Please upload at least one product image",
        variant: "destructive"
      });
      return;
    }
    
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };
  
  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // Handle AI analysis of product images
  const analyzeImagesWithAI = async () => {
    if (uploadedImages.length === 0) {
      toast({
        title: "No Images Found",
        description: "Please upload at least one image for AI analysis",
        variant: "destructive"
      });
      return;
    }

    // Get the product name from the form
    const productName = form.getValues('name');
    if (!productName) {
      toast({
        title: "Product Name Required",
        description: "Please enter a product name before running AI analysis",
        variant: "destructive"
      });
      return;
    }

    try {
      setAiAnalysisLoading(true);
      // Use the first image for analysis
      const imageUrl = uploadedImages[0].url;
      
      // Use centralized error handling in apiRequest
      const res = await apiRequest('POST', '/api/ai/analyze-product', { 
        imageUrl,
        productName
      });
      
      const response = await res.json();
      // Extract the analysis data from standardized response
      if (!response.success) {
        throw new Error(response.error?.message || "Failed to analyze product");
      }
      
      const analysis = response.data;
      setAiSuggestions(analysis);
    } catch (error: any) {
      toast({
        title: "AI Analysis Failed",
        description: error.message || "Failed to analyze product images",
        variant: "destructive"
      });
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // Apply AI suggestions to the form
  const applyAISuggestion = (key: string, value: any) => {
    switch (key) {
      case 'suggestedName':
        form.setValue('name', value);
        // Also generate a slug from name
        form.setValue('slug', value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
        break;
      case 'suggestedDescription':
        form.setValue('description', value);
        break;
      case 'suggestedBrand':
        form.setValue('brand', value);
        break;
      case 'suggestedTags':
        form.setValue('tags', value);
        break;
      case 'suggestedCostPrice':
        form.setValue('costPrice', value);
        break;
      case 'suggestedPrice':
        form.setValue('price', value);
        break;
      // Handle category matching
      case 'suggestedCategory':
        if (categories) {
          const matchedCategory = categories.find(
            cat => cat.name.toLowerCase() === value.toLowerCase()
          );
          if (matchedCategory) {
            form.setValue('categoryId', matchedCategory.id);
          }
        }
        break;
      // Display market research data in a toast notification
      case 'marketResearch':
        toast({
          title: "Market Research",
          description: value,
          duration: 10000, // Show for 10 seconds
        });
        break;
    }
  };

  // Initialize the product analysis hooks
  const { suggestPrice } = useProductAnalysis();

  // AI suggest price based on cost price and product info
  const suggestPriceWithAI = async () => {
    try {
      setPriceLoading(true);
      const costPrice = form.getValues('costPrice');
      const productName = form.getValues('name');
      const categoryId = form.getValues('categoryId');
      
      if (!costPrice || !productName) {
        throw new Error('Please provide the product name and cost price before requesting a price suggestion');
      }
      
      // Use the hook to suggest price
      const priceSuggestion = await suggestPrice({
        costPrice,
        productName,
        categoryId,
        categoryName: categories?.find(cat => cat.id === categoryId)?.name
      });
      
      if (priceSuggestion) {
        form.setValue('price', priceSuggestion.suggestedPrice);
        toast({
          title: "Price Suggested",
          description: `AI suggested a selling price of R${priceSuggestion.suggestedPrice.toFixed(2)} 
          (${priceSuggestion.markupPercentage}% markup from ${priceSuggestion.markupSource})`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Price Suggestion Failed",
        description: error.message || "Failed to get AI price suggestion",
        variant: "destructive"
      });
    } finally {
      setPriceLoading(false);
    }
  };

  // AI suggest tags based on product info
  const suggestTagsWithAI = async () => {
    try {
      setTagsLoading(true);
      const productName = form.getValues('name');
      const description = form.getValues('description');
      
      if (!productName) {
        throw new Error('Please provide at least the product name before requesting tag suggestions');
      }
      
      // Use centralized error handling in apiRequest
      const res = await apiRequest('POST', '/api/ai/generate-tags', { 
        productName,
        description: description || '',
        categoryName: categories?.find(cat => cat.id === form.getValues('categoryId'))?.name
      });
      
      const response = await res.json();
      // Extract the suggestion data from standardized response
      if (!response.success) {
        throw new Error(response.error?.message || "Failed to generate tags");
      }
      
      const suggestion = response.data;
      
      if (suggestion.tags && suggestion.tags.length > 0) {
        form.setValue('tags', suggestion.tags);
        toast({
          title: "Tags Generated",
          description: `AI generated ${suggestion.tags.length} tags for your product`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Tag Generation Failed",
        description: error.message || "Failed to generate AI tags",
        variant: "destructive"
      });
    } finally {
      setTagsLoading(false);
    }
  };

  const applyAllAISuggestions = () => {
    if (!aiSuggestions) return;
    
    if (aiSuggestions.suggestedName) {
      applyAISuggestion('suggestedName', aiSuggestions.suggestedName);
    }
    if (aiSuggestions.suggestedDescription) {
      applyAISuggestion('suggestedDescription', aiSuggestions.suggestedDescription);
    }
    if (aiSuggestions.suggestedBrand) {
      applyAISuggestion('suggestedBrand', aiSuggestions.suggestedBrand);
    }
    if (aiSuggestions.suggestedCategory) {
      applyAISuggestion('suggestedCategory', aiSuggestions.suggestedCategory);
    }
    if (aiSuggestions.suggestedTags) {
      applyAISuggestion('suggestedTags', aiSuggestions.suggestedTags);
    }
    if (aiSuggestions.suggestedCostPrice) {
      applyAISuggestion('suggestedCostPrice', aiSuggestions.suggestedCostPrice);
    }
    if (aiSuggestions.suggestedPrice) {
      applyAISuggestion('suggestedPrice', aiSuggestions.suggestedPrice);
    }

    toast({
      title: "Applied AI Suggestions",
      description: "All AI suggestions have been applied to the form",
    });
  };

  // Loading state
  const isLoading = isLoadingCategories || isLoadingProduct || 
                    createMutation.isPending || updateMutation.isPending;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{productId ? 'Edit Product' : 'Create New Product'}</CardTitle>
            <CardDescription>
              {productId
                ? 'Update product information and manage images'
                : 'Add a new product to your store'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/products')}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Step navigation bar */}
        <nav aria-label="Progress" className="mb-6">
          <ol role="list" className="flex space-x-2">
            {steps.map((step, index) => (
              <li key={step.id} className="flex-1">
                <div
                  className={cn(
                    "group flex flex-col border rounded-md p-2 cursor-pointer",
                    currentStep === index
                      ? "border-pink-500 bg-pink-50 dark:bg-pink-900/10"
                      : index < currentStep
                      ? "border-green-500/30 bg-green-50 dark:bg-green-900/10"
                      : "border-gray-200 dark:border-gray-800"
                  )}
                  onClick={() => {
                    // Only allow going back or to completed steps
                    if (index <= currentStep) {
                      setCurrentStep(index);
                    }
                  }}
                >
                  <span className="text-xs font-medium">
                    Step {index + 1}
                  </span>
                  <span className={cn(
                    "text-sm",
                    currentStep === index 
                      ? "text-pink-600 dark:text-pink-400 font-medium" 
                      : "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </nav>
        
        <Form {...form}>
          <form id="product-form">
            {/* Step content */}
            <div className="mb-6">
              {currentStep === 0 && (
                <ImagesBasicInfoStep 
                  form={form}
                  categories={categories || []}
                  uploadedImages={uploadedImages}
                  setUploadedImages={setUploadedImages}
                  productId={productId}
                  analyzeImagesWithAI={analyzeImagesWithAI}
                  aiAnalysisLoading={aiAnalysisLoading}
                  aiSuggestions={aiSuggestions}
                  applyAISuggestion={applyAISuggestion}
                  suggestPriceWithAI={suggestPriceWithAI}
                  suggestTagsWithAI={suggestTagsWithAI}
                />
              )}
              
              {currentStep === 1 && (
                <AdditionalInfoStep form={form} />
              )}
              
              {currentStep === 2 && (
                <ReviewStep 
                  form={form} 
                  uploadedImages={uploadedImages}
                  categories={categories || []}
                />
              )}
            </div>
          </form>
        </Form>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t p-4 bg-slate-50 dark:bg-slate-900">
        {currentStep > 0 && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={goToPreviousStep}
            disabled={isLoading}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
        )}
        
        {currentStep === 0 && (
          <Button
            variant="outline"
            onClick={() => navigate('/admin/products')}
          >
            Cancel
          </Button>
        )}
        
        <div className="flex-1" />
        
        {currentStep < steps.length - 1 ? (
          <Button 
            type="button" 
            onClick={goToNextStep}
            disabled={isLoading}
            className="bg-pink-600 hover:bg-pink-700"
          >
            Continue
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button 
            type="button" 
            disabled={isLoading}
            onClick={handleFormSubmit}
            className="bg-pink-600 hover:bg-pink-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {productId ? 'Update Product' : 'Create Product'}
            {!isLoading && <Check className="ml-2 h-4 w-4" />}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}