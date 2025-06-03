import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Supplier, Catalog, Category } from '@shared/schema';
import { slugify } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2, Plus, Sparkles, RefreshCw, Check } from 'lucide-react';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductDraft } from '../ProductWizard';
import { AICategorySuggestionDialog } from '../components/AICategorySuggestionDialog';

// Validation schema for the basic information step
const basicInfoSchema = z.object({
  name: z.string().min(3, { message: 'Product name must be at least 3 characters' }),
  slug: z.string().min(3, { message: 'Product slug must be at least 3 characters' }),
  sku: z.string().nullable().optional(), // SKU field for supplier ordering
  description: z.string().nullable().optional(),
  categoryId: z.coerce.number().int().positive({ message: 'Please select a category' }),
  supplierId: z.coerce.number().int().positive({ message: 'Please select a supplier' }),
  catalogId: z.coerce.number().int().positive({ message: 'Please select a catalog' }),
  regularPrice: z.coerce.number().min(0, { message: 'Regular price must be at least 0' }),
  salePrice: z.coerce.number().nullable().optional(),
  costPrice: z.coerce.number().nullable().optional(),
  onSale: z.boolean().default(false),
  stockLevel: z.coerce.number().int().min(0, { message: 'Stock level must be at least 0' }),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;

interface BasicInfoStepProps {
  draft: ProductDraft;
  onSave: (data: any, autoAdvance?: boolean) => void;
  onSaveAndPublish?: (data: any) => void;
  onProductNameChange?: (name: string) => void;
  isLoading: boolean;
  isPublishing?: boolean;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ draft, onSave, onSaveAndPublish, onProductNameChange, isLoading, isPublishing }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNameTouched, setIsNameTouched] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [aiDescriptionSuggestions, setAiDescriptionSuggestions] = useState<string[]>([]);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // State for AI enhancement preview modal
  const [showEnhancementPreview, setShowEnhancementPreview] = useState(false);
  const [aiEnhancementResult, setAiEnhancementResult] = useState<{
    title: string;
    description: string;
  } | null>(null);
  
  // Editable versions of AI enhancement results
  const [editableAiTitle, setEditableAiTitle] = useState('');
  const [editableAiDescription, setEditableAiDescription] = useState('');
  
  // Category creation modal state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);
  const [newCategoryLevel, setNewCategoryLevel] = useState<number>(0);
  const [newCategoryDisplayOrder, setNewCategoryDisplayOrder] = useState<number>(0);
  
  // AI category suggestion state
  const [showAiCategorySuggestions, setShowAiCategorySuggestions] = useState(false);
  
  // Fetch categories for the dropdown
  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      return response.json();
    },
  });

  // Fetch suppliers for the dropdown
  const { data: suppliersData, isLoading: isSuppliersLoading } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/suppliers');
      return response.json();
    },
  });

  // Initialize form with draft values
  const form = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: draft.name || '',
      slug: draft.slug || '',
      sku: draft.sku || '',
      description: draft.description || '',
      categoryId: draft.categoryId || 0,
      supplierId: draft.supplierId || 0,
      catalogId: draft.catalogId || 0,
      regularPrice: draft.regularPrice || 0,
      salePrice: draft.salePrice || null,
      costPrice: draft.costPrice || null,
      onSale: draft.onSale || false,
      stockLevel: draft.stockLevel || 0,
      isActive: draft.isActive !== undefined ? draft.isActive : true,
      isFeatured: draft.isFeatured || false,
    },
  });

  // Update form values when draft data AND categories data are both available
  React.useEffect(() => {
    if (draft && categoriesData?.data?.length > 0) {
      form.reset({
        name: draft.name || '',
        slug: draft.slug || '',
        sku: draft.sku || '',
        description: draft.description || '',
        categoryId: draft.categoryId || 0,
        supplierId: draft.supplierId || 0,
        catalogId: draft.catalogId || 0,
        regularPrice: draft.regularPrice || 0,
        salePrice: draft.salePrice || null,
        costPrice: draft.costPrice || null,
        onSale: draft.onSale || false,
        stockLevel: draft.stockLevel || 0,
        isActive: draft.isActive !== undefined ? draft.isActive : true,
        isFeatured: draft.isFeatured || false,
      });
    }
  }, [draft, categoriesData, form]);

  // Organize categories into parent/child relationships
  const categoriesWithParents = React.useMemo(() => {
    const categories = categoriesData?.data || [];
    
    // Create a map for quick lookup
    const categoryMap = new Map(categories.map((cat: any) => [cat.id, cat]));
    
    // Add parent information to each category
    return categories.map((category: any) => ({
      ...category,
      parent: category.parentId ? categoryMap.get(category.parentId) : null
    }));
  }, [categoriesData]);

  // Get parent categories (categories with no parentId) - only active ones
  const parentCategories = React.useMemo(() => {
    return categoriesWithParents.filter((cat: any) => !cat.parentId && cat.isActive);
  }, [categoriesWithParents]);

  // Get the current categoryId from the form (this will be the source of truth)
  const formCategoryId = form.watch('categoryId');
  
  // Determine parent and child categories from the current form categoryId
  const currentCategory = React.useMemo(() => {
    if (!formCategoryId || !categoriesWithParents.length) return null;
    return categoriesWithParents.find((cat: any) => cat.id === formCategoryId);
  }, [formCategoryId, categoriesWithParents]);

  const parentCategoryId = React.useMemo(() => {
    if (!currentCategory) return null;
    // If current category has a parent, return the parent ID
    // If current category IS a parent (no parentId), return its own ID
    return currentCategory.parentId || currentCategory.id;
  }, [currentCategory]);

  const childCategoryId = React.useMemo(() => {
    if (!currentCategory) return null;
    // Only return child ID if current category actually has a parent
    return currentCategory.parentId ? currentCategory.id : null;
  }, [currentCategory]);

  // Get child categories for the selected parent - only active ones
  const childCategories = React.useMemo(() => {
    if (!parentCategoryId) return [];
    return categoriesWithParents.filter((cat: any) => cat.parentId === parentCategoryId && cat.isActive);
  }, [categoriesWithParents, parentCategoryId]);



  // Update form values when draft changes
  useEffect(() => {
    if (draft) {
      form.reset({
        name: draft.name || '',
        slug: draft.slug || '',
        sku: draft.sku || '',
        description: draft.description || '',
        categoryId: draft.categoryId || 0,
        supplierId: draft.supplierId || 0,
        catalogId: draft.catalogId || 0,
        regularPrice: draft.regularPrice || 0,
        salePrice: draft.salePrice || null,
        costPrice: draft.costPrice || null,
        onSale: draft.onSale || false,
        stockLevel: draft.stockLevel || 0,
        isActive: draft.isActive !== undefined ? draft.isActive : true,
        isFeatured: draft.isFeatured || false,
      });
    }
  }, [draft, form]);

  // Auto-generate slug when name changes
  const watchName = form.watch('name');
  useEffect(() => {
    if (watchName && isNameTouched && !form.getValues('slug')) {
      const generatedSlug = slugify(watchName, { lower: true, strict: true });
      form.setValue('slug', generatedSlug);
    }
  }, [watchName, form, isNameTouched]);
  
  // Watch supplier ID to load related catalogs
  const watchSupplierId = form.watch('supplierId');
  
  // Fetch catalogs for the selected supplier
  const { data: catalogsData, isLoading: isCatalogsLoading } = useQuery({
    queryKey: ['/api/suppliers', watchSupplierId || draft.supplierId, 'catalogs'],
    queryFn: async () => {
      const supplierIdToUse = watchSupplierId || draft.supplierId;
      if (!supplierIdToUse) return { data: [] };
      
      const response = await apiRequest('GET', `/api/suppliers/${supplierIdToUse}/catalogs`);
      return response.json();
    },
    // Enable the query if we have a supplier ID from the form or from the draft
    enabled: !!(watchSupplierId || draft.supplierId),
  });
  
  // Handle catalog selection when supplier changes or on initial load
  useEffect(() => {
    if (watchSupplierId) {
      const currentCatalogId = form.getValues('catalogId');
      const catalogs = catalogsData?.data || [];
      
      // If there's a catalog ID but it doesn't belong to this supplier,
      // reset the catalog selection
      if (currentCatalogId && catalogs.length > 0) {
        const catalogBelongsToSupplier = catalogs.some(
          (catalog: any) => catalog.id === currentCatalogId
        );
        
        if (!catalogBelongsToSupplier) {
          form.setValue('catalogId', 0);
        }
      }
    }
  }, [watchSupplierId, catalogsData, form]);

  // Handle form submission
  const onSubmit = (data: BasicInfoFormValues) => {
    // Validate 20% minimum TMY markup if both cost price and sale price are set
    if (data.costPrice && data.salePrice) {
      const markup = calculateTMYMarkup(data.costPrice, data.salePrice);
      if (markup !== null && markup < 20) {
        const minimumPrice = data.costPrice * 1.2;
        toast({
          title: 'Invalid Pricing',
          description: `Sale price must be at least R${minimumPrice.toFixed(2)} to maintain 20% TMY markup. Current markup: ${markup.toFixed(1)}%`,
          variant: 'destructive'
        });
        return; // Stop form submission
      }
    }

    // If sale price is set, ensure onSale is true
    if (data.salePrice && data.salePrice < data.regularPrice) {
      data.onSale = true;
    } else if (!data.salePrice || data.salePrice >= data.regularPrice) {
      data.onSale = false;
      data.salePrice = null;
    }

    console.log('BasicInfoStep submitting data:', data);
    
    // Pass the validated data to parent component for saving with auto-advancement
    onSave(data, true);
  };

  // Handle name input changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsNameTouched(true);
    form.setValue('name', e.target.value);
    // Update the product name in real-time for the heading
    if (onProductNameChange) {
      onProductNameChange(e.target.value);
    }
  };

  // Handle sale price changes
  const handleSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const salePrice = parseFloat(e.target.value);
    const regularPrice = form.getValues('regularPrice');
    const costPrice = form.getValues('costPrice');
    
    if (!isNaN(salePrice) && salePrice > 0 && salePrice < regularPrice) {
      form.setValue('onSale', true);
    }
    
    // Check minimum 20% TMY markup
    if (costPrice && !isNaN(salePrice) && salePrice > 0) {
      const minimumPrice = costPrice * 1.2; // 20% markup
      if (salePrice < minimumPrice) {
        toast({
          title: 'Price Warning',
          description: `Sale price must be at least R${minimumPrice.toFixed(2)} to maintain 20% TMY markup.`,
          variant: 'destructive'
        });
      }
    }
  };

  // Calculate TMY Markup percentage
  const calculateTMYMarkup = (costPrice: number | null, salePrice: number | null) => {
    if (!costPrice || !salePrice || costPrice <= 0) return null;
    return ((salePrice - costPrice) / costPrice) * 100;
  };

  // Calculate customer discount percentage
  const calculateCustomerDiscount = (regularPrice: number, salePrice: number | null) => {
    if (!salePrice || salePrice >= regularPrice || regularPrice <= 0) return null;
    return ((regularPrice - salePrice) / regularPrice) * 100;
  };

  // Watch pricing fields for real-time calculations
  const watchCostPrice = form.watch('costPrice');
  const watchRegularPrice = form.watch('regularPrice');
  const watchSalePrice = form.watch('salePrice');

  // Category creation mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      slug: string; 
      description: string; 
      parentId?: number;
      level: number;
      displayOrder: number;
    }) => {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create category");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to create category");
      }
      return result.data;
    },
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      
      // Reset form fields
      setNewCategoryName("");
      setNewCategorySlug("");
      setNewCategoryDescription("");
      setNewCategoryParentId(null);
      setNewCategoryLevel(0);
      setNewCategoryDisplayOrder(0);
      setIsCreateDialogOpen(false);

      // Auto-select the newly created category
      form.setValue('categoryId', newCategory.id);

      
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  // Handle category creation
  const handleCreateCategory = () => {
    if (!newCategoryName) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    const parentId = newCategoryParentId ? parseInt(newCategoryParentId) : undefined;
    const level = parentId ? 1 : 0;
    
    // Generate slug with parent-child format for child categories
    let slug = newCategorySlug;
    if (!slug) {
      const childSlug = slugify(newCategoryName, { lower: true, strict: true });
      if (parentId) {
        // Find parent category to get its slug
        const parentCategory = parentCategories.find((cat: any) => cat.id === parentId);
        if (parentCategory) {
          slug = `${parentCategory.slug}-${childSlug}`;
        } else {
          slug = childSlug;
        }
      } else {
        slug = childSlug;
      }
    }

    createCategoryMutation.mutate({
      name: newCategoryName,
      slug,
      description: newCategoryDescription,
      parentId,
      level,
      displayOrder: newCategoryDisplayOrder,
    });
  };

  // Update category level when parent changes
  React.useEffect(() => {
    if (newCategoryParentId) {
      setNewCategoryLevel(1);
    } else {
      setNewCategoryLevel(0);
    }
  }, [newCategoryParentId]);
  
  // Handle AI category selection - FIXED to immediately save to database
  const handleAiCategorySelection = async (parentId: number, childId: number | null) => {
    try {
      // Determine the final category ID to use
      const finalCategoryId = childId || parentId;
      
      // Update the form with the selected category and trigger validation
      form.setValue('categoryId', finalCategoryId, { shouldValidate: true, shouldDirty: true });
      
      // CRITICAL FIX: Immediately save the category assignment to the database
      // Using snake_case column name to match actual database structure
      const updateData = {
        category_id: finalCategoryId  // Using snake_case as per database schema
      };
      
      console.log('Saving AI category selection to database:', updateData);
      
      // Save the category assignment using the wizard step endpoint to match form submission
      const response = await apiRequest('PATCH', `/api/product-drafts/${draft.id}/wizard-step`, {
        step: 0, // Basic info step
        draftData: {
          categoryId: finalCategoryId
        }
      });
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to save category assignment');
      }
      
      // Force complete refresh of categories data to show newly created categories
      await queryClient.removeQueries({ queryKey: ['/api/categories'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      await queryClient.refetchQueries({ queryKey: ['/api/categories'] });
      
      // Refresh the current product draft to get updated data
      await queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', draft.id] });
      
      // Wait for category data to be fully refreshed, then update form
      setTimeout(() => {
        form.setValue('categoryId', finalCategoryId, { shouldValidate: true, shouldDirty: true });
        console.log('Form category updated to:', finalCategoryId);
      }, 300);
      
      toast({
        title: 'Category Applied',
        description: 'Product category has been saved successfully.',
      });
      
    } catch (error) {
      console.error('Error saving AI category selection:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save category assignment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      // Close the dialog
      setShowAiCategorySuggestions(false);
    }
  };
  
  // Function to enhance existing product title and description using AI
  const enhanceProductWithAI = async () => {
    try {
      setIsGeneratingDescription(true);
      setAiError(null);
      
      // Get current form values
      const formValues = form.getValues();
      const productName = formValues.name;
      const currentDescription = formValues.description || '';
      
      // Validate required fields
      if (!productName.trim()) {
        toast({
          title: 'Product Name Required',
          description: 'Please enter a product name before using AI enhancement.',
          variant: 'destructive'
        });
        return;
      }
      
      if (!currentDescription.trim()) {
        toast({
          title: 'Description Required',
          description: 'Please enter a product description before using AI enhancement.',
          variant: 'destructive'
        });
        return;
      }
      
      // Get category name from the selected categoryId
      let categoryName = '';
      if (formValues.categoryId && categoriesData?.data) {
        const category = categoriesData.data.find(cat => cat.id === formValues.categoryId);
        categoryName = category?.name || '';
      }
      
      // API request to enhance product
      const response = await apiRequest('POST', '/api/ai/enhance-product', {
        productName,
        productDescription: currentDescription,
        categoryName,
        brand: formValues.brand || undefined,
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Store the AI enhancement result and show preview modal
        const enhancementData = {
          title: data.data.title || formValues.name,
          description: data.data.description || currentDescription,
        };
        setAiEnhancementResult(enhancementData);
        setEditableAiTitle(enhancementData.title);
        setEditableAiDescription(enhancementData.description);
        setShowEnhancementPreview(true);
      } else {
        throw new Error(data.message || 'Failed to enhance product');
      }
    } catch (error) {
      console.error('Error enhancing product:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Something went wrong. Please try again.';
      
      setAiError(errorMessage);
      toast({
        title: 'AI Enhancement Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };
  
  // Function to apply a selected AI description
  const applyDescription = (description: string) => {
    form.setValue('description', description);
    setShowAiDialog(false);
    
    
  };

  // Functions for AI enhancement preview modal
  const applyAiEnhancement = () => {
    if (editableAiTitle && editableAiDescription) {
      // Apply the edited title and description
      form.setValue('name', editableAiTitle);
      form.setValue('description', editableAiDescription);
      
      // Update the product name in real-time for the heading
      if (onProductNameChange) {
        onProductNameChange(editableAiTitle);
      }
      
      toast({
        title: 'AI Enhancement Applied',
        description: 'Product title and description have been updated.',
      });
    }
    setShowEnhancementPreview(false);
    setAiEnhancementResult(null);
    setEditableAiTitle('');
    setEditableAiDescription('');
  };

  const regenerateAiEnhancement = async () => {
    setShowEnhancementPreview(false);
    setAiEnhancementResult(null);
    // Trigger AI enhancement again
    await enhanceProductWithAI();
  };

  const discardAiEnhancement = () => {
    setShowEnhancementPreview(false);
    setAiEnhancementResult(null);
    setEditableAiTitle('');
    setEditableAiDescription('');
  };
  
  // Handle sale price changes
  // This function is already defined earlier, removing duplicate

  // State variables for AI descriptions are already declared above

  return (
    <>
      {/* AI Description Suggestions Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI-Generated Description Suggestions</DialogTitle>
            <DialogDescription>
              Choose one of the suggestions below or close to keep your current description.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 max-h-[300px] overflow-y-auto space-y-4">
            {aiDescriptionSuggestions.map((suggestion, index) => (
              <Card key={index} className="shadow-sm hover:shadow transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="text-sm text-muted-foreground">Option {index + 1}</div>
                    <p className="text-sm">{suggestion}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="self-end"
                      onClick={() => applyDescription(suggestion)}
                    >
                      Use This Description
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <DialogFooter className="flex items-center justify-between mt-4">
            <div>
              {aiError && (
                <p className="text-sm text-destructive">{aiError}</p>
              )}
            </div>
            <Button variant="secondary" onClick={() => setShowAiDialog(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Product Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter product name" 
                        onChange={(e) => {
                          field.onChange(e); // Update the form state
                          handleNameChange(e); // Update the heading
                        }}
                        className="h-9 sm:h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Product SKU */}
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (Supplier Code)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter supplier SKU/product code" 
                        className="h-9 sm:h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden Product Slug - auto-generated */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Description</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={enhanceProductWithAI}
                      disabled={isGeneratingDescription || !form.getValues('name') || !form.getValues('description')}
                    >
                      {isGeneratingDescription ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Enhancing...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-3 w-3" />
                          <span>AI Enhance</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter product description"
                      className="min-h-[80px] sm:min-h-[100px]"
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Add Category Button */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Category Selection</span>
              <Button 
                type="button"
                variant="outline"
                size="sm"
                className="space-x-2"
                onClick={() => {
                  setNewCategoryName("");
                  setNewCategorySlug("");
                  setNewCategoryDescription("");
                  setNewCategoryParentId(null);
                  setNewCategoryLevel(0);
                  setNewCategoryDisplayOrder(0);
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                <span>Add Category</span>
              </Button>
            </div>

            {/* Category Selection - Parent Category */}
            <div>
              <Label htmlFor="parent-category">Parent Category*</Label>
              <Select
                onValueChange={(value) => {
                  const parentIdNum = Number(value);
                  form.setValue('categoryId', parentIdNum);
                }}
                value={parentCategoryId?.toString() || undefined}
              >
                <SelectTrigger className="h-9 sm:h-10" id="parent-category">
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  {isCategoriesLoading ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Loading categories...</span>
                    </div>
                  ) : (
                    parentCategories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Category Selection - Child Category */}
            <div>
              <Label htmlFor="child-category">
                Child Category {parentCategoryId && childCategories.length > 0 && "(Optional)"}
              </Label>
              <Select
                onValueChange={(value) => {
                  if (value === "clear-selection") {
                    // User is clearing child selection, save parent category
                    if (parentCategoryId) {
                      form.setValue('categoryId', parentCategoryId);
                    }
                  } else {
                    // User selected a child category, save child category
                    const childIdNum = Number(value);
                    form.setValue('categoryId', childIdNum);
                  }
                }}
                value={childCategoryId ? childCategoryId.toString() : ""}
                disabled={!parentCategoryId || childCategories.length === 0}
              >
                <SelectTrigger className="h-9 sm:h-10" id="child-category">
                  <SelectValue placeholder={
                    !parentCategoryId 
                      ? "Select parent category first" 
                      : childCategories.length === 0 
                        ? "No child categories available"
                        : "Select child category (optional)"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {childCategoryId && (
                    <SelectItem value="clear-selection">
                      <span className="text-muted-foreground">Clear selection</span>
                    </SelectItem>
                  )}
                  {childCategories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AI Category Suggestion Button */}
            <div className="col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const productName = form.getValues('name');
                  const productDescription = form.getValues('description');
                  
                  if (!productName?.trim()) {
                    toast({
                      title: 'Product Name Required',
                      description: 'Please enter a product name before getting AI category suggestions.',
                      variant: 'destructive'
                    });
                    return;
                  }
                  
                  if (!productDescription?.trim()) {
                    toast({
                      title: 'Description Required',
                      description: 'Please enter a product description before getting AI category suggestions.',
                      variant: 'destructive'
                    });
                    return;
                  }
                  
                  setShowAiCategorySuggestions(true);
                }}
                className="w-full h-10 border-purple-200 hover:border-purple-300 hover:bg-purple-50"
              >
                <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                Get AI Category Suggestions
              </Button>
            </div>

            {/* Hidden field to maintain form validation */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Supplier Selection */}
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier*</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    defaultValue={field.value?.toString() || undefined}
                    value={field.value?.toString() || undefined}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9 sm:h-10">
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isSuppliersLoading ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Loading suppliers...</span>
                        </div>
                      ) : (
                        suppliersData?.data?.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Catalog Selection */}
            <FormField
              control={form.control}
              name="catalogId"
              render={({ field }) => {
                // This useEffect ensures the field value is updated when the catalog data is loaded
                React.useEffect(() => {
                  if (catalogsData?.data?.length > 0 && field.value) {
                    // Check if the current value exists in the available catalogs
                    const catalogExists = catalogsData.data.some(
                      (catalog: any) => catalog.id === field.value
                    );
                    
                    // If it doesn't exist, we still want to keep the value so the UI shows
                    // the number, but we'll update it if needed
                    if (!catalogExists && field.value !== 0) {
                      console.log(`Catalog ID ${field.value} exists in draft but not in available catalogs`);
                    }
                  }
                }, [catalogsData, field.value]);
                
                return (
                  <FormItem>
                    <FormLabel>Catalog*</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString() || undefined}
                      disabled={!(watchSupplierId || draft.supplierId) || isCatalogsLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 sm:h-10">
                          <SelectValue placeholder={watchSupplierId || draft.supplierId ? "Select a catalog" : "Select a supplier first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!(watchSupplierId || draft.supplierId) ? (
                          <div className="flex items-center justify-center p-2">
                            <span className="text-muted-foreground">Please select a supplier first</span>
                          </div>
                        ) : isCatalogsLoading ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span>Loading catalogs...</span>
                          </div>
                        ) : catalogsData?.data?.length === 0 ? (
                          <div className="flex items-center justify-center p-2">
                            <span className="text-muted-foreground">No catalogs found for this supplier</span>
                          </div>
                        ) : (
                          // Here we handle the catalog selection from the database
                          <>
                            {catalogsData?.data?.map((catalog: any) => (
                              <SelectItem key={catalog.id} value={catalog.id.toString()}>
                                {catalog.name}
                              </SelectItem>
                            ))}
                            {/* Display a special option if the saved catalog ID isn't in the returned list */}
                            {field.value && 
                             !catalogsData?.data?.some((c: any) => c.id === field.value) && 
                             field.value !== 0 && (
                              <SelectItem value={field.value.toString()}>
                                Catalog ID: {field.value} (Not Found)
                              </SelectItem>
                            )}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Pricing Section */}
            <div>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Pricing</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                {/* Regular Price */}
                <FormField
                  control={form.control}
                  name="regularPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regular Price*</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="0.00" 
                          className="h-9 sm:h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sale Price */}
                <FormField
                  control={form.control}
                  name="salePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Price</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="0.00" 
                          value={field.value || ''} 
                          className="h-9 sm:h-10"
                          onChange={(e) => {
                            field.onChange(e.target.value === '' ? null : parseFloat(e.target.value));
                            handleSalePriceChange(e);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                      {/* Customer Discount Display */}
                      {(() => {
                        const regularPrice = typeof watchRegularPrice === 'string' ? parseFloat(watchRegularPrice) : watchRegularPrice;
                        const salePrice = watchSalePrice ? (typeof watchSalePrice === 'string' ? parseFloat(watchSalePrice) : watchSalePrice) : null;
                        
                        if (regularPrice && salePrice && salePrice < regularPrice) {
                          const discount = calculateCustomerDiscount(regularPrice, salePrice);
                          if (discount !== null) {
                            return (
                              <div className="mt-1">
                                <div className="text-xs flex items-center gap-1 text-pink-600">
                                  <span className="font-medium">Customer Savings:</span>
                                  <span>{discount.toFixed(1)}%</span>
                                </div>
                              </div>
                            );
                          }
                        }
                        return null;
                      })()}
                    </FormItem>
                  )}
                />

                {/* Cost Price */}
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>Cost Price</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="0.00" 
                          value={field.value || ''} 
                          className="h-9 sm:h-10"
                          onChange={(e) => {
                            field.onChange(e.target.value === '' ? null : parseFloat(e.target.value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                      {/* TMY Markup Display */}
                      {watchCostPrice && watchSalePrice && (
                        <div className="mt-1">
                          {(() => {
                            const markup = calculateTMYMarkup(watchCostPrice, watchSalePrice);
                            if (markup !== null) {
                              const isValidMarkup = markup >= 20;
                              return (
                                <div className={`text-xs flex items-center gap-1 ${
                                  isValidMarkup ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  <span className="font-medium">TMY Markup:</span>
                                  <span>{markup.toFixed(1)}%</span>
                                  {!isValidMarkup && (
                                    <span className="text-red-500 font-medium">(Min: 20%)</span>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Stock & Status */}
            <div>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Stock & Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Stock Level */}
                <FormField
                  control={form.control}
                  name="stockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Level</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="0" 
                          step="1" 
                          placeholder="0" 
                          className="h-9 sm:h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* On Sale Toggle */}
                <FormField
                  control={form.control}
                  name="onSale"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm sm:text-base">On Sale</FormLabel>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          Mark this product as being on sale.
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Product Status */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Active Toggle */}
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm sm:text-base">Active</FormLabel>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          This product will be visible on the store.
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Featured Toggle */}
                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm sm:text-base">Featured</FormLabel>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          This product will be featured on the homepage.
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-between sm:justify-end gap-3 pt-2">
              {/* Save & Publish button - only show when editing an existing product */}
              {draft.originalProductId && onSaveAndPublish && (
                <Button 
                  type="button"
                  variant="default"
                  disabled={isLoading || isPublishing}
                  className="h-9 px-3 sm:h-10 sm:px-4 bg-green-600 hover:bg-green-700"
                  onClick={form.handleSubmit((data) => {
                    // Validate 20% minimum TMY markup if both cost price and sale price are set
                    if (data.costPrice && data.salePrice) {
                      const markup = calculateTMYMarkup(data.costPrice, data.salePrice);
                      if (markup !== null && markup < 20) {
                        const minimumPrice = data.costPrice * 1.2;
                        toast({
                          title: 'Invalid Pricing',
                          description: `Sale price must be at least R${minimumPrice.toFixed(2)} to maintain 20% TMY markup. Current markup: ${markup.toFixed(1)}%`,
                          variant: 'destructive'
                        });
                        return; // Stop form submission
                      }
                    }
                    
                    // Process the data same as onSubmit
                    if (data.salePrice && data.salePrice < data.regularPrice) {
                      data.onSale = true;
                    } else if (!data.salePrice || data.salePrice >= data.regularPrice) {
                      data.onSale = false;
                      data.salePrice = null;
                    }
                    onSaveAndPublish(data);
                  })}
                >
                  {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save & Publish
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={isLoading || isPublishing}
                className="h-9 px-3 sm:h-10 sm:px-4"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Continue
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>

    {/* Create Category Dialog */}
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Category</DialogTitle>
          <DialogDescription>
            Add a new category to organize your products.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name*</Label>
            <Input 
              id="name" 
              value={newCategoryName} 
              onChange={(e) => setNewCategoryName(e.target.value)} 
              placeholder="Category Name" 
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="parent">Parent Category</Label>
            <Select value={newCategoryParentId || "none"} onValueChange={(value) => setNewCategoryParentId(value === "none" ? null : value)}>
              <SelectTrigger id="parent">
                <SelectValue placeholder="No Parent (Main Category)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Parent (Main Category)</SelectItem>
                {parentCategories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Current level: {newCategoryLevel} {newCategoryLevel === 0 ? "(Main Category)" : "(Subcategory)"}
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <div className="flex gap-2">
              <Input 
                id="slug" 
                value={newCategorySlug} 
                onChange={(e) => setNewCategorySlug(e.target.value)} 
                placeholder={(() => {
                  const childSlug = slugify(newCategoryName, { lower: true, strict: true }) || "category-slug";
                  if (newCategoryParentId) {
                    const parentCategory = parentCategories.find((cat: any) => cat.id === parseInt(newCategoryParentId));
                    return parentCategory ? `${parentCategory.slug}-${childSlug}` : childSlug;
                  }
                  return childSlug;
                })()} 
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  const childSlug = slugify(newCategoryName, { lower: true, strict: true });
                  if (newCategoryParentId) {
                    const parentCategory = parentCategories.find((cat: any) => cat.id === parseInt(newCategoryParentId));
                    setNewCategorySlug(parentCategory ? `${parentCategory.slug}-${childSlug}` : childSlug);
                  } else {
                    setNewCategorySlug(childSlug);
                  }
                }}
              >
                Generate
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {newCategoryParentId ? 
                "Format: parent-category-child-category" : 
                "The URL-friendly version of the name."
              }
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="displayOrder">Display Order</Label>
            <Input 
              id="displayOrder" 
              type="number" 
              value={newCategoryDisplayOrder} 
              onChange={(e) => setNewCategoryDisplayOrder(parseInt(e.target.value))} 
            />
            <p className="text-sm text-muted-foreground">
              Controls the display order within the same level.
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description"
              value={newCategoryDescription} 
              onChange={(e) => setNewCategoryDescription(e.target.value)} 
              placeholder="Category description" 
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleCreateCategory} 
            disabled={createCategoryMutation.isPending}
          >
            {createCategoryMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* AI Enhancement Preview Modal */}
    <Dialog open={showEnhancementPreview} onOpenChange={setShowEnhancementPreview}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Enhancement Preview
          </DialogTitle>
          <DialogDescription>
            Review the AI-generated improvements for your product title and description.
          </DialogDescription>
        </DialogHeader>

        {aiEnhancementResult && (
          <div className="space-y-6">
            {/* Title Comparison */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Product Title</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Current Title</Label>
                  <div className="p-3 bg-muted rounded-lg border">
                    <p className="text-sm">{form.getValues('name')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-green-600">AI Enhanced Title</Label>
                  <Input
                    value={editableAiTitle}
                    onChange={(e) => setEditableAiTitle(e.target.value)}
                    className="bg-green-50 border-green-200 focus:border-green-400"
                    placeholder="Enter enhanced title..."
                  />
                </div>
              </div>
            </div>

            {/* Description Comparison */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Product Description</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Current Description</Label>
                  <div className="p-3 bg-muted rounded-lg border max-h-40 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{form.getValues('description')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-green-600">AI Enhanced Description</Label>
                  <Textarea
                    value={editableAiDescription}
                    onChange={(e) => setEditableAiDescription(e.target.value)}
                    className="bg-green-50 border-green-200 focus:border-green-400 min-h-[120px]"
                    placeholder="Enter enhanced description..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={discardAiEnhancement}
            className="w-full sm:w-auto"
          >
            Discard
          </Button>
          <Button
            variant="outline"
            onClick={regenerateAiEnhancement}
            disabled={isGeneratingDescription}
            className="w-full sm:w-auto"
          >
            {isGeneratingDescription ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>
          <Button
            onClick={applyAiEnhancement}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
          >
            <Check className="mr-2 h-4 w-4" />
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* AI Category Suggestion Dialog */}
    <AICategorySuggestionDialog
      isOpen={showAiCategorySuggestions}
      onOpenChange={setShowAiCategorySuggestions}
      productName={form.getValues('name') || ''}
      productDescription={form.getValues('description') || ''}
      onCategorySelected={handleAiCategorySelection}
    />
    </>
  );
};

export default BasicInfoStep;