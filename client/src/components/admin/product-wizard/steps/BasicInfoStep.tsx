import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ProductDraft } from '../ProductWizard';
import slugify from 'slugify';

// Validation schema for the basic information step
const basicInfoSchema = z.object({
  name: z.string().min(3, { message: 'Product name must be at least 3 characters' }),
  slug: z.string().min(3, { message: 'Product slug must be at least 3 characters' }),
  description: z.string().nullable().optional(),
  categoryId: z.coerce.number().int().positive({ message: 'Please select a category' }),
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
  onSave: (data: any) => void;
  isLoading: boolean;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ draft, onSave, isLoading }) => {
  const { toast } = useToast();
  const [isNameTouched, setIsNameTouched] = useState(false);

  // Fetch categories for the dropdown
  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      return response.json();
    },
  });

  // Initialize form with draft values
  const form = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: draft.name || '',
      slug: draft.slug || '',
      description: draft.description || '',
      categoryId: draft.categoryId || 0,
      regularPrice: draft.regularPrice || 0,
      salePrice: draft.salePrice || null,
      costPrice: draft.costPrice || null,
      onSale: draft.onSale || false,
      stockLevel: draft.stockLevel || 0,
      isActive: draft.isActive !== undefined ? draft.isActive : true,
      isFeatured: draft.isFeatured || false,
    },
  });

  // Update form values when draft changes
  useEffect(() => {
    if (draft) {
      form.reset({
        name: draft.name || '',
        slug: draft.slug || '',
        description: draft.description || '',
        categoryId: draft.categoryId || 0,
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
    
    // Pass the validated data to parent component for saving
    onSave(data);
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
    } else {
      form.setValue('onSale', false);
    }
  };

  return (
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

              {/* Product Slug */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Slug*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter product slug" 
                        className="h-9 sm:h-10"
                      />
                    </FormControl>
                    <FormMessage />
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
                  <FormLabel>Description</FormLabel>
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

            {/* Category Selection */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category*</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    defaultValue={field.value?.toString() || undefined}
                    value={field.value?.toString() || undefined}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9 sm:h-10">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isCategoriesLoading ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Loading categories...</span>
                        </div>
                      ) : (
                        categoriesData?.data?.map((category: any) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
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

            <div className="flex justify-end pt-2">
              <Button 
                type="submit" 
                disabled={isLoading}
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
  );
};

export default BasicInfoStep;