import React, { useState } from 'react';
import AdminLayout from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
  Package, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  Eye,
  Tag,
  ArrowUpDown,
  Image
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, slugify } from '@/lib/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Category, Product, InsertProduct } from '@shared/schema';

// Example product data
const products = [
  {
    id: 1,
    name: "Wireless Earbuds",
    category: "Electronics",
    price: 59.99,
    stock: 45,
    status: "Active"
  },
  {
    id: 2,
    name: "Smart Watch",
    category: "Electronics",
    price: 129.99,
    stock: 28,
    status: "Active"
  },
  {
    id: 3,
    name: "Phone Case - Black",
    category: "Accessories",
    price: 19.99,
    stock: 102,
    status: "Active"
  },
  {
    id: 4,
    name: "Bluetooth Speaker",
    category: "Electronics",
    price: 89.99,
    stock: 17,
    status: "Active"
  },
  {
    id: 5,
    name: "Laptop Sleeve",
    category: "Accessories",
    price: 29.99,
    stock: 53,
    status: "Active"
  },
  {
    id: 6,
    name: "Power Bank 20000mAh",
    category: "Electronics",
    price: 49.99,
    stock: 31,
    status: "Active"
  },
  {
    id: 7,
    name: "Fitness Tracker",
    category: "Electronics",
    price: 79.99,
    stock: 0,
    status: "Out of Stock"
  },
  {
    id: 8,
    name: "Wireless Mouse",
    category: "Electronics",
    price: 24.99,
    stock: 42,
    status: "Active"
  }
];

// Product creation/edit form type
interface ProductFormData {
  name: string;
  description: string;
  categoryId: number | undefined;
  price: number | string;
  salePrice?: number | string;
  stock: number | string;
  imageUrl?: string;
  additionalImages?: string[];
  isFeatured?: boolean;
  isFlashDeal?: boolean;
}

function ProductsPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    categoryId: undefined,
    price: '',
    salePrice: '',
    stock: '0',
  });
  
  // Fetch categories for the dropdown
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });
  
  // Fetch real products from API
  const { data: realProducts = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });
  
  // Get a category name by id
  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : "Unknown Category";
  };
  
  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: Omit<InsertProduct, 'id'>) => {
      const res = await apiRequest('POST', '/api/products', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsCreateDialogOpen(false);
      clearForm();
      toast({
        title: 'Product created',
        description: 'The product has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create product',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Clear form data
  const clearForm = () => {
    setFormData({
      name: '',
      description: '',
      categoryId: undefined,
      price: '',
      salePrice: '',
      stock: '0',
    });
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Validation error',
        description: 'Product name is required',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.categoryId) {
      toast({
        title: 'Validation error',
        description: 'Please select a category',
        variant: 'destructive',
      });
      return;
    }
    
    const price = parseFloat(formData.price.toString());
    if (isNaN(price) || price <= 0) {
      toast({
        title: 'Validation error',
        description: 'Price must be a positive number',
        variant: 'destructive',
      });
      return;
    }
    
    // Prepare product data
    const productData: Omit<InsertProduct, 'id'> = {
      name: formData.name,
      slug: slugify(formData.name),
      description: formData.description,
      categoryId: formData.categoryId,
      price: parseFloat(formData.price.toString()),
      stock: parseInt(formData.stock.toString()),
      imageUrl: formData.imageUrl || null,
      additionalImages: formData.additionalImages || null,
      isFeatured: formData.isFeatured || false,
      isFlashDeal: formData.isFlashDeal || false,
    };
    
    // Add sale price if provided
    if (formData.salePrice && parseFloat(formData.salePrice.toString()) > 0) {
      productData.salePrice = parseFloat(formData.salePrice.toString());
      
      // Calculate discount percentage
      if (productData.price > 0 && productData.salePrice < productData.price) {
        const discount = Math.round(((productData.price - productData.salePrice) / productData.price) * 100);
        productData.discount = discount;
      }
    }
    
    createProductMutation.mutate(productData);
  };
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle number input changes
  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Allow empty string for optional fields
    if (value === '' && (name === 'salePrice')) {
      setFormData((prev) => ({ ...prev, [name]: '' }));
      return;
    }
    
    // Validate that value is a number
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    }
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };
  
  // Handle category selection
  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, categoryId: parseInt(value) }));
  };
  
  return (
    <AdminLayout>
      <div className="flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Products</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-pink-500 hover:bg-pink-600">
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
                <DialogDescription>
                  Add a new product to your inventory. Fill in the product details below.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Product name"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="categoryId">Category</Label>
                    <Select 
                      value={formData.categoryId?.toString()} 
                      onValueChange={handleCategoryChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Product description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="price">Price (R)</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.price}
                        onChange={handleNumberInput}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="salePrice">Sale Price (R) (Optional)</Label>
                      <Input
                        id="salePrice"
                        name="salePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.salePrice}
                        onChange={handleNumberInput}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="stock">Stock Quantity</Label>
                      <Input
                        id="stock"
                        name="stock"
                        type="number"
                        step="1"
                        min="0"
                        placeholder="0"
                        value={formData.stock}
                        onChange={handleNumberInput}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="imageUrl">Main Image URL (Optional)</Label>
                      <Input
                        id="imageUrl"
                        name="imageUrl"
                        placeholder="https://example.com/image.jpg"
                        value={formData.imageUrl || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isFeatured"
                        name="isFeatured"
                        checked={formData.isFeatured || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                      <Label htmlFor="isFeatured" className="text-sm font-medium">
                        Featured product
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isFlashDeal"
                        name="isFlashDeal"
                        checked={formData.isFlashDeal || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                      <Label htmlFor="isFlashDeal" className="text-sm font-medium">
                        Flash deal
                      </Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProductMutation.isPending}
                    className="bg-pink-500 hover:bg-pink-600"
                  >
                    {createProductMutation.isPending ? 'Creating...' : 'Create Product'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              type="search" 
              placeholder="Search products..." 
              className="pl-8"
            />
          </div>
          <Button variant="outline">
            <Tag className="mr-2 h-4 w-4" />
            Categories
          </Button>
          <Button variant="outline">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Sort
          </Button>
        </div>
        
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Products</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="out-of-stock">Out of Stock</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Products</CardTitle>
                <CardDescription>
                  Manage your product inventory, prices, and categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProducts ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500" />
                  </div>
                ) : realProducts.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <Package className="h-12 w-12 mx-auto opacity-50" />
                    <p className="mt-2">No products found. Create your first product to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 text-left">Name</th>
                          <th className="py-3 text-left">Category</th>
                          <th className="py-3 text-right">Price</th>
                          <th className="py-3 text-right">Stock</th>
                          <th className="py-3 text-left">Status</th>
                          <th className="py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {realProducts.map((product) => (
                          <tr 
                            key={product.id} 
                            className="border-b hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 text-left font-medium">
                              <div className="flex items-center">
                                {product.imageUrl && (
                                  <div className="h-8 w-8 mr-3 rounded bg-gray-100 overflow-hidden">
                                    <img 
                                      src={product.imageUrl} 
                                      alt={product.name} 
                                      className="h-full w-full object-cover"
                                      onError={(e) => { 
                                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                                      }}
                                    />
                                  </div>
                                )}
                                <span>{product.name}</span>
                              </div>
                            </td>
                            <td className="py-3 text-left">{getCategoryName(product.categoryId)}</td>
                            <td className="py-3 text-right">
                              {product.salePrice ? (
                                <div>
                                  <span className="line-through text-gray-400 mr-2">
                                    {formatCurrency(product.price)}
                                  </span>
                                  <span className="text-green-600 font-medium">
                                    {formatCurrency(product.salePrice)}
                                  </span>
                                </div>
                              ) : (
                                formatCurrency(product.price)
                              )}
                            </td>
                            <td className="py-3 text-right">{product.stock}</td>
                            <td className="py-3 text-left">
                              <Badge 
                                variant={product.stock > 0 ? "default" : "destructive"}
                                className={product.stock > 0 ? "bg-green-500 hover:bg-green-600" : ""}
                              >
                                {product.stock > 0 ? "In Stock" : "Out of Stock"}
                              </Badge>
                            </td>
                            <td className="py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <a href={`/product/${product.slug}`} target="_blank" className="flex items-center w-full">
                                      <Eye className="mr-2 h-4 w-4" />
                                      <span>View</span>
                                    </a>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600">
                                    <Trash className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Other tabs will have similar content - we're just implementing the UI structure now */}
          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Products</CardTitle>
                <CardDescription>
                  Products that are currently available for purchase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-gray-500">
                  <Package className="h-12 w-12 mx-auto opacity-50" />
                  <p className="mt-2">Active products will be listed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="out-of-stock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Out of Stock Products</CardTitle>
                <CardDescription>
                  Products that need to be restocked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-gray-500">
                  <Package className="h-12 w-12 mx-auto opacity-50" />
                  <p className="mt-2">Out of stock products will be listed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="archived" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Archived Products</CardTitle>
                <CardDescription>
                  Products that are no longer available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-gray-500">
                  <Package className="h-12 w-12 mx-auto opacity-50" />
                  <p className="mt-2">Archived products will be listed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

export default ProductsPage;