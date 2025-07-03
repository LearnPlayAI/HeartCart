import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { StepComponentProps } from '../types';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { slugify } from '@/lib/utils';

// Schema for basic info validation
const basicInfoSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').max(100),
  categoryId: z.string().min(1, 'Category is required'),
  regularPrice: z.string().min(1, 'Regular price is required'),
  costPrice: z.string().min(1, 'Cost price is required'),
  salePrice: z.string().optional(),
  catalogId: z.string().min(1, 'Catalog is required'),
  supplierId: z.string().optional(),
});

type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;

export const StepBasicInfo: React.FC<StepComponentProps> = ({ 
  draft, 
  onSave, 
  onNext, 
  isLoading 
}) => {
  // Set up the form
  const form = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: draft.name || '',
      description: draft.description || '',
      slug: draft.slug || '',
      categoryId: draft.categoryId ? String(draft.categoryId) : '',
      regularPrice: draft.regularPrice ? String(draft.regularPrice) : '',
      costPrice: draft.costPrice ? String(draft.costPrice) : '',
      salePrice: draft.salePrice ? String(draft.salePrice) : '',
      catalogId: draft.catalogId ? String(draft.catalogId) : '',
      supplierId: draft.supplierId ? String(draft.supplierId) : '',
    },
  });
  
  // Watch the name field to autogenerate slug
  const watchName = form.watch('name');
  
  // Fetch categories for dropdown
  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      return response;
    },
  });
  
  // Fetch catalogs for dropdown
  const { data: catalogsData, isLoading: isCatalogsLoading } = useQuery({
    queryKey: ['/api/catalogs'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/catalogs');
      return response;
    },
  });
  
  // Fetch suppliers for dropdown
  const { data: suppliersData, isLoading: isSuppliersLoading } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/suppliers');
      return response;
    },
  });
  
  // Auto-generate slug when name changes
  React.useEffect(() => {
    if (watchName && !form.getValues('slug')) {
      form.setValue('slug', slugify(watchName));
    }
  }, [watchName, form]);
  
  // Handle form submission
  const onSubmit = (data: BasicInfoFormValues) => {
    // Convert string values to appropriate types for API
    const formattedData = {
      name: data.name,
      description: data.description,
      slug: data.slug,
      categoryId: parseInt(data.categoryId),
      regularPrice: parseFloat(data.regularPrice),
      costPrice: parseFloat(data.costPrice),
      salePrice: data.salePrice ? parseFloat(data.salePrice) : null,
      catalogId: parseInt(data.catalogId),
      supplierId: data.supplierId && data.supplierId !== "0" ? parseInt(data.supplierId) : null,
    };
    
    // Save and move to next step
    onSave(formattedData, true);
  };
  
  // Handle save without advancing
  const handleSaveOnly = () => {
    const values = form.getValues();
    
    // Convert string values to appropriate types for API
    const formattedData = {
      name: values.name,
      description: values.description,
      slug: values.slug,
      categoryId: values.categoryId ? parseInt(values.categoryId) : null,
      regularPrice: values.regularPrice ? parseFloat(values.regularPrice) : null,
      costPrice: values.costPrice ? parseFloat(values.costPrice) : null,
      salePrice: values.salePrice ? parseFloat(values.salePrice) : null,
      catalogId: values.catalogId ? parseInt(values.catalogId) : null,
      supplierId: values.supplierId && values.supplierId !== "0" ? parseInt(values.supplierId) : null,
    };
    
    // Save without advancing
    onSave(formattedData, false);
  };
  
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      disabled={isLoading}
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
                  <FormLabel>Product URL Slug</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="product-url-slug" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
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
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading || isCategoriesLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoriesData?.data?.map((category: any) => (
                        <SelectItem 
                          key={category.id} 
                          value={String(category.id)}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Catalog */}
            <FormField
              control={form.control}
              name="catalogId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catalog</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading || isCatalogsLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a catalog" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {catalogsData?.data?.map((catalog: any) => (
                        <SelectItem 
                          key={catalog.id} 
                          value={String(catalog.id)}
                        >
                          {catalog.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Supplier */}
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading || isSuppliersLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {suppliersData?.data?.map((supplier: any) => (
                        <SelectItem 
                          key={supplier.id} 
                          value={String(supplier.id)}
                        >
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Regular Price */}
              <FormField
                control={form.control}
                name="regularPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regular Price (R)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="0.00" 
                        step="0.01"
                        {...field} 
                        disabled={isLoading}
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
                  <FormItem>
                    <FormLabel>Cost Price (R)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="0.00" 
                        step="0.01"
                        {...field} 
                        disabled={isLoading}
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
                    <FormLabel>Sale Price (R) (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="0.00" 
                        step="0.01"
                        {...field} 
                        disabled={isLoading}
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
                  <FormLabel>Product Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your product..." 
                      className="min-h-[120px]"
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveOnly}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              
              <Button 
                type="submit"
                disabled={isLoading}
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