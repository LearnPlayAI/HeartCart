import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Supplier, Catalog } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2 } from 'lucide-react';
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
import slugify from 'slugify';

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
  isLoading: boolean;
  isPublishing?: boolean;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ draft, onSave, onSaveAndPublish, isLoading, isPublishing }) => {
  const { toast } = useToast();
  const [isNameTouched, setIsNameTouched] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [aiDescriptionSuggestions, setAiDescriptionSuggestions] = useState<string[]>([]);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // State for category selection
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<number | null>(null);
  const [selectedChildCategoryId, setSelectedChildCategoryId] = useState<number | null>(null);

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

  // Get parent categories (categories with no parentId)
  const parentCategories = React.useMemo(() => {
    return categoriesWithParents.filter((cat: any) => !cat.parentId);
  }, [categoriesWithParents]);

  // Get child categories for the selected parent
  const childCategories = React.useMemo(() => {
    if (!selectedParentCategoryId) return [];
    const children = categoriesWithParents.filter((cat: any) => cat.parentId === selectedParentCategoryId);
    console.log('Child categories for parent', selectedParentCategoryId, ':', children);
    return children;
  }, [categoriesWithParents, selectedParentCategoryId]);

  // Initialize category selection state based on draft
  React.useEffect(() => {
    if (draft.categoryId && categoriesWithParents.length > 0) {
      console.log('Initializing categories. Draft categoryId:', draft.categoryId);
      console.log('Available categories:', categoriesWithParents);
      const currentCategory = categoriesWithParents.find((cat: any) => cat.id === draft.categoryId);
      console.log('Found current category:', currentCategory);
      if (currentCategory) {
        if (currentCategory.parentId) {
          // This is a child category
          console.log('Setting parent category:', currentCategory.parentId, 'and child category:', currentCategory.id);
          setSelectedParentCategoryId(currentCategory.parentId);
          setSelectedChildCategoryId(currentCategory.id);
        } else {
          // This is a parent category
          console.log('Setting parent category only:', currentCategory.id);
          setSelectedParentCategoryId(currentCategory.id);
          setSelectedChildCategoryId(null);
        }
      }
    }
  }, [draft.categoryId, categoriesWithParents]);

  // Update the draft's category selection state when categories load
  React.useEffect(() => {
    if (!selectedParentCategoryId && !selectedChildCategoryId && draft.categoryId && categoriesWithParents.length > 0) {
      const currentCategory = categoriesWithParents.find((cat: any) => cat.id === draft.categoryId);
      if (currentCategory) {
        if (currentCategory.parentId) {
          // This is a child category
          setSelectedParentCategoryId(currentCategory.parentId);
          setSelectedChildCategoryId(currentCategory.id);
        } else {
          // This is a parent category
          setSelectedParentCategoryId(currentCategory.id);
          setSelectedChildCategoryId(null);
        }
      }
    }
  }, [categoriesWithParents, draft.categoryId, selectedParentCategoryId, selectedChildCategoryId]);

  // Handle parent category selection
  const handleParentCategoryChange = (parentId: string) => {
    const parentIdNum = Number(parentId);
    setSelectedParentCategoryId(parentIdNum);
    setSelectedChildCategoryId(null); // Reset child selection
    
    // Update form with parent category
    form.setValue('categoryId', parentIdNum);
  };

  // Handle child category selection
  const handleChildCategoryChange = (childId: string) => {
    const childIdNum = Number(childId);
    setSelectedChildCategoryId(childIdNum);
    
    // Update form with child category
    form.setValue('categoryId', childIdNum);
  };

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
  };

  // Handle sale price changes
  const handleSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const salePrice = parseFloat(e.target.value);
    const regularPrice = form.getValues('regularPrice');
    
    if (!isNaN(salePrice) && salePrice > 0 && salePrice < regularPrice) {
      form.setValue('onSale', true);
    }
  };
  
  // Function to generate AI-powered description suggestions
  const generateDescriptionSuggestions = async () => {
    try {
      setIsGeneratingDescription(true);
      setAiError(null);
      
      // Get current form values
      const formValues = form.getValues();
      const productName = formValues.name;
      const currentDescription = formValues.description || '';
      const brandName = formValues.brand || '';
      
      // Get category name from the selected categoryId
      let categoryName = '';
      if (formValues.categoryId && categoriesData?.data) {
        const category = categoriesData.data.find(cat => cat.id === formValues.categoryId);
        categoryName = category?.name || '';
      }
      
      // Get product images if available to enhance AI descriptions
      let imageUrls: string[] = [];
      if (draft.imageUrls && draft.imageUrls.length > 0) {
        // Filter out any undefined or empty image URLs
        imageUrls = draft.imageUrls
          .filter(url => url && typeof url === 'string' && !url.includes('undefined'))
          .slice(0, 3); // Limit to 3 images to avoid token limits
      }
      
      // API request to generate descriptions
      const response = await apiRequest('/api/ai/suggest-description', {
        method: 'POST',
        data: {
          productName,
          currentDescription,
          categoryName,
          brandName,
          keyFeatures: [], // You could add key features here in the future
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined
        }
      });
      
      if (response.success && response.data.suggestions) {
        setAiDescriptionSuggestions(response.data.suggestions);
        setShowAiDialog(true);
      } else {
        throw new Error(response.error?.message || 'Failed to generate descriptions');
      }
    } catch (error) {
      console.error('Error generating AI descriptions:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Something went wrong. Please try again.';
      
      setAiError(errorMessage);
      toast({
        title: 'AI Generation Failed',
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
                        onChange={handleNameChange}
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
                      onClick={generateDescriptionSuggestions}
                      disabled={isGeneratingDescription || !form.getValues('name')}
                    >
                      {isGeneratingDescription ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-3 w-3" />
                          <span>AI Generate</span>
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

            {/* Category Selection - Parent Category */}
            <div>
              <Label htmlFor="parent-category">Parent Category*</Label>
              <Select
                onValueChange={handleParentCategoryChange}
                value={selectedParentCategoryId?.toString() || undefined}
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
                Child Category {selectedParentCategoryId && childCategories.length > 0 && "(Optional)"}
              </Label>
              <Select
                onValueChange={handleChildCategoryChange}
                value={selectedChildCategoryId?.toString() || undefined}
                disabled={!selectedParentCategoryId || childCategories.length === 0}
              >
                <SelectTrigger className="h-9 sm:h-10" id="child-category">
                  <SelectValue placeholder={
                    !selectedParentCategoryId 
                      ? "Select parent category first" 
                      : childCategories.length === 0 
                        ? "No child categories available"
                        : "Select child category (optional)"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {childCategories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </>
  );
};

export default BasicInfoStep;