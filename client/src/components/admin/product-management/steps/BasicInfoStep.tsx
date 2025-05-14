/**
 * Basic Info Step Component
 * 
 * First step in the product wizard for entering basic product information.
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useDraft } from '../DraftContext';
import { Loader2 } from 'lucide-react';
import { debounce } from '@/lib/utils';

// Form schema for basic product information
const basicInfoSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Product slug is required'),
  sku: z.string().optional(),
  brand: z.string().optional(),
  categoryId: z.coerce.number().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
});

type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;

const BasicInfoStep: React.FC = () => {
  const { draft, draftLoading, updateDraft, updateDraftStep } = useDraft();
  
  // Create form with draft data as default values
  const form = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: draft?.name || '',
      slug: draft?.slug || '',
      sku: draft?.sku || '',
      brand: draft?.brand || '',
      categoryId: draft?.categoryId,
      isActive: draft?.isActive ?? true,
      isFeatured: draft?.isFeatured ?? false,
      metaTitle: draft?.metaTitle || '',
      metaDescription: draft?.metaDescription || '',
      metaKeywords: draft?.metaKeywords || '',
    },
  });
  
  // Fetch categories for the dropdown
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      return data.success ? data.data : [];
    },
  });
  
  // Update form when draft data changes
  useEffect(() => {
    if (draft && !draftLoading) {
      form.reset({
        name: draft.name || '',
        slug: draft.slug || '',
        sku: draft.sku || '',
        brand: draft.brand || '',
        categoryId: draft.categoryId,
        isActive: draft.isActive ?? true,
        isFeatured: draft.isFeatured ?? false,
        metaTitle: draft.metaTitle || '',
        metaDescription: draft.metaDescription || '',
        metaKeywords: draft.metaKeywords || '',
      });
    }
  }, [draft, draftLoading, form]);
  
  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };
  
  // Handle field changes with debounce for auto-save
  const handleFieldChange = debounce((field: string, value: any) => {
    updateDraft(field as any, value);
    
    // If name changes, also update slug if slug is empty or was auto-generated
    if (field === 'name') {
      const currentSlug = form.getValues('slug');
      const currentName = form.getValues('name');
      
      // Only auto-update slug if it looks like it was auto-generated
      if (!currentSlug || currentSlug === generateSlug(currentName.replace(value, ''))) {
        const newSlug = generateSlug(value);
        form.setValue('slug', newSlug);
        updateDraft('slug', newSlug);
      }
    }
  }, 500);
  
  // Submit handler to update the step
  const onSubmit = async (data: BasicInfoFormValues) => {
    await updateDraftStep('basic-info', data);
  };
  
  if (draftLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Product Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter product name" 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange('name', e.target.value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  The name of your product as it will appear to customers.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Product Slug */}
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Slug</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="product-url-slug" 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange('slug', e.target.value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  URL-friendly version of the product name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* SKU */}
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="SKU123" 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange('sku', e.target.value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Stock Keeping Unit - unique identifier for the product.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Brand */}
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Brand name" 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange('brand', e.target.value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Manufacturer or brand name of the product.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Category */}
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  disabled={categoriesLoading}
                  onValueChange={(value) => {
                    const numValue = parseInt(value);
                    field.onChange(numValue);
                    handleFieldChange('categoryId', numValue);
                  }}
                  value={field.value?.toString() || ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoriesLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      categoriesData?.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The product category helps with organization and browsing.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Status Checkboxes */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleFieldChange('isActive', checked);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active Product</FormLabel>
                    <FormDescription>
                      Make this product visible and available for purchase.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleFieldChange('isFeatured', checked);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Featured Product</FormLabel>
                    <FormDescription>
                      Show this product in featured sections on the site.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* SEO Metadata */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">SEO Metadata</h3>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="SEO title for the product" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          handleFieldChange('metaTitle', e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      The title that appears in search engine results.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Brief description for search engines" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          handleFieldChange('metaDescription', e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      A short description that appears in search results.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="metaKeywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Keywords</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="keyword1, keyword2, keyword3" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          handleFieldChange('metaKeywords', e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Comma-separated keywords for search engines.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};

export default BasicInfoStep;