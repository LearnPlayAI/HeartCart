import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Loader2, Save, ChevronLeft, CalendarIcon, Tags, Wand2 } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Product, Category, insertProductSchema } from '@shared/schema';
import ProductImageUploader from './product-image-uploader';
import ProductImageManager from './product-image-manager';
import { AiProductAnalyzer } from './ai-product-analyzer';

// Extend the product schema with additional validation
const productFormSchema = insertProductSchema
  .extend({
    categoryId: z.coerce.number().min(1, 'Category is required'),
    name: z.string().min(3, 'Name must be at least 3 characters'),
    price: z.coerce.number().min(0, 'Price cannot be negative'),
    salePrice: z.coerce.number().optional().nullable(),
    tags: z.array(z.string()).default([]),
    newTag: z.string().optional(),
    flashDealEnd: z.date().optional().nullable(),
  })
  .refine(data => !data.isFlashDeal || data.flashDealEnd, {
    message: 'Flash deal end date is required when flash deal is enabled',
    path: ['flashDealEnd']
  })
  .refine(data => !data.salePrice || data.salePrice < data.price, {
    message: 'Sale price must be less than regular price',
    path: ['salePrice']
  });

type ProductFormValues = z.infer<typeof productFormSchema>;
type ProductFormProps = {
  productId?: number;
  onSuccess?: () => void;
};

export default function ProductForm({ productId, onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('details');
  const [tagInput, setTagInput] = useState('');
  
  // Fetch categories for the dropdown
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json() as Promise<Category[]>;
    }
  });
  
  // Fetch product data if editing
  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['/api/products', productId],
    queryFn: async () => {
      if (!productId) return null;
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      return res.json() as Promise<Product>;
    },
    enabled: !!productId,
  });
  
  // Form setup
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      categoryId: undefined,
      price: 0,
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
    }
  }, [product, form]);
  
  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      // Convert flashDealEnd to ISO string if it exists
      const formattedData = {
        ...data,
        flashDealEnd: data.flashDealEnd ? new Date(data.flashDealEnd).toISOString() : null,
      };
      
      delete formattedData.newTag;
      
      const res = await apiRequest('POST', '/api/products', formattedData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create product');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Product created',
        description: 'The product has been created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
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
      if (!productId) throw new Error('Product ID is required for update');
      
      // Convert flashDealEnd to ISO string if it exists
      const formattedData = {
        ...data,
        flashDealEnd: data.flashDealEnd ? new Date(data.flashDealEnd).toISOString() : null,
      };
      
      delete formattedData.newTag;
      
      const res = await apiRequest('PUT', `/api/products/${productId}`, formattedData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update product');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Product updated',
        description: 'The product has been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId] });
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
  const onSubmit = (values: ProductFormValues) => {
    if (productId) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };
  
  // Handle adding a new tag
  const addTag = () => {
    if (!tagInput.trim()) return;
    const currentTags = form.getValues('tags') || [];
    if (!currentTags.includes(tagInput.trim())) {
      form.setValue('tags', [...currentTags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  // Handle removing a tag
  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };
  
  // Handle price change to automatically calculate discount
  const handlePriceChange = (type: 'regular' | 'sale', value: number) => {
    const currentPrice = form.getValues('price');
    const currentSalePrice = form.getValues('salePrice');
    
    if (type === 'regular') {
      form.setValue('price', value);
      // Update discount if sale price exists
      if (currentSalePrice) {
        const discountPercent = Math.round(((value - currentSalePrice) / value) * 100);
        form.setValue('discount', discountPercent);
      }
    } else if (type === 'sale') {
      form.setValue('salePrice', value);
      // Update discount
      if (currentPrice) {
        const discountPercent = Math.round(((currentPrice - value) / currentPrice) * 100);
        form.setValue('discount', discountPercent);
      }
    }
  };
  
  // Generate slug from name
  const generateSlug = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    form.setValue('slug', slug);
  };
  
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="details">Basic Details</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Inventory</TabsTrigger>
            <TabsTrigger 
              value="images" 
              disabled={!productId}
              className={!productId ? 'tooltip-wrapper' : ''}
              data-tooltip={!productId ? 'Save product first to manage images' : ''}
            >
              Images
            </TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g., Samsung Galaxy S21" 
                            onChange={(e) => {
                              field.onChange(e);
                              if (!productId) {
                                generateSlug(e.target.value);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Slug</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g., samsung-galaxy-s21" 
                            disabled={!!productId}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe your product..."
                          className="min-h-[120px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Samsung" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="border rounded-md p-4 space-y-3">
                  <div className="flex items-center">
                    <Tags className="h-5 w-5 mr-2 text-gray-500" />
                    <h3 className="text-sm font-medium">Product Tags</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {form.watch('tags')?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="py-1 px-2">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        >
                          &times;
                        </button>
                      </Badge>
                    ))}
                    {(!form.watch('tags') || form.watch('tags').length === 0) && (
                      <div className="text-gray-500 text-sm">No tags added yet</div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      Add
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      className="gap-1 bg-pink-50 text-pink-600 hover:bg-pink-100 hover:text-pink-700 border-pink-200"
                      onClick={async () => {
                        const productName = form.getValues('name');
                        const description = form.getValues('description') || '';
                        
                        if (!productName) {
                          toast({
                            title: "Missing information",
                            description: "Please enter a product name first",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        try {
                          toast({
                            title: "Generating tags",
                            description: "Using AI to generate product tags based on your product details..."
                          });
                          
                          const response = await fetch('/api/ai/generate-tags', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              productName,
                              productDescription: description,
                              imageUrl: product?.imageUrl || ''
                            })
                          });
                          
                          if (!response.ok) {
                            throw new Error("Failed to generate tags");
                          }
                          
                          const data = await response.json();
                          
                          if (data.tags && data.tags.length > 0) {
                            // Add new tags without duplicates
                            const currentTags = form.getValues('tags') || [];
                            // Use filter to remove duplicates instead of Set
                            const uniqueTags = [...currentTags];
                            
                            // Add only tags that don't already exist
                            data.tags.forEach(tag => {
                              if (!uniqueTags.includes(tag)) {
                                uniqueTags.push(tag);
                              }
                            });
                            
                            form.setValue('tags', uniqueTags);
                            
                            toast({
                              title: "Tags generated",
                              description: `Successfully added ${data.tags.length} tags to your product.`
                            });
                          }
                        } catch (error) {
                          toast({
                            title: "Tag generation failed",
                            description: error instanceof Error ? error.message : "Unknown error occurred",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      <Wand2 className="h-4 w-4" />
                      AI Generate
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="pricing" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Regular Price (ZAR)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="0" 
                            step="0.01"
                            onChange={(e) => handlePriceChange('regular', parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sale Price (ZAR)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''}
                            type="number" 
                            min="0" 
                            step="0.01"
                            placeholder="Optional" 
                            onChange={(e) => {
                              const value = e.target.value ? parseFloat(e.target.value) : null;
                              handlePriceChange('sale', value as number);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount (%)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="0" 
                            max="100"
                            disabled
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="freeShipping"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Free Shipping</FormLabel>
                          <FormDescription>
                            Offer free shipping for this product
                          </FormDescription>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Enable to make this product visible in the store
                          </FormDescription>
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
                  
                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Featured</FormLabel>
                          <FormDescription>
                            Show this product in featured sections
                          </FormDescription>
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
                
                <FormField
                  control={form.control}
                  name="isFlashDeal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Flash Deal</FormLabel>
                        <FormDescription>
                          Mark this product as a time-limited flash deal
                        </FormDescription>
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
                
                {form.watch('isFlashDeal') && (
                  <FormField
                    control={form.control}
                    name="flashDealEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flash Deal End Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DatePicker
                              selected={field.value}
                              onChange={(date) => field.onChange(date)}
                              showTimeSelect
                              timeFormat="HH:mm"
                              timeIntervals={15}
                              dateFormat="MMMM d, yyyy h:mm aa"
                              minDate={new Date()}
                              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholderText="Select end date and time"
                            />
                            <CalendarIcon className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="images" className="space-y-6">
                {productId ? (
                  <>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Current Images</h3>
                      <p className="text-sm text-gray-500">Manage your product images</p>
                      <ProductImageManager productId={productId} />
                    </div>
                    
                    <div className="space-y-2 pt-6 border-t">
                      <h3 className="text-lg font-medium">Upload New Images</h3>
                      <p className="text-sm text-gray-500">Add more images to your product</p>
                      <ProductImageUploader 
                        productId={productId}
                        onUploadComplete={() => {
                          queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/images`] });
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2 pt-6 border-t">
                      <h3 className="text-lg font-medium">AI-Powered Product Analysis</h3>
                      <p className="text-sm text-gray-500">
                        Use AI to analyze your product image and automatically generate product details.
                      </p>
                      
                      <AiProductAnalyzer
                        imageUrl={product?.imageUrl || ''}
                        onApplyChanges={(changes) => {
                          if (changes.name) {
                            form.setValue('name', changes.name);
                            // Also update slug
                            if (!productId) {
                              generateSlug(changes.name);
                            }
                          }
                          
                          if (changes.description) {
                            form.setValue('description', changes.description);
                          }
                          
                          if (changes.brand) {
                            form.setValue('brand', changes.brand);
                          }
                          
                          if (changes.tags && changes.tags.length > 0) {
                            form.setValue('tags', changes.tags);
                          }
                          
                          // Show success message
                          toast({
                            title: 'Product details updated',
                            description: 'AI-suggested details have been applied to the form',
                          });
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center p-12 border border-dashed rounded-lg">
                    <p className="text-gray-500">Save the product first to manage images</p>
                  </div>
                )}
              </TabsContent>
              
              <div className={activeTab !== 'images' ? 'flex justify-end' : 'hidden'}>
                <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  {productId ? 'Update Product' : 'Create Product'}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </CardContent>
    </Card>
  );
}