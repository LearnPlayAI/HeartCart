import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Package, Plus, X, Trash2, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  costPrice?: number;
  salePrice?: number;
  imageUrl?: string;
  isPublished?: boolean;
  category?: {
    id: number;
    name: string;
    parentCategory?: {
      id: number;
      name: string;
    };
  };
}

interface ProductPromotion {
  id: number;
  productId: number;
  promotionId: number;
  discountOverride?: number;
  promotionalPrice?: number;
  product?: Product;
}

interface Promotion {
  id: number;
  promotionName: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  promotionType: 'percentage' | 'fixed' | 'bogo';
  discountValue?: number;
  minimumOrderValue?: number;
}

interface Category {
  id: number;
  name: string;
  parentId?: number;
  children?: Category[];
}

export default function PromotionProductsPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<number | null>(null);
  const [promotionalPrices, setPromotionalPrices] = useState<Record<number, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [shouldLoadProducts, setShouldLoadProducts] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const promotionId = parseInt(id as string);

  // Fetch promotion details
  const { data: promotionData } = useQuery({
    queryKey: [`/api/promotions/${promotionId}`],
  });

  const promotion = promotionData?.data as Promotion;

  // Fetch promotion products
  const { data: promotionProductsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: [`/api/promotions/${promotionId}/products`],
  });

  const promotionProducts = promotionProductsData?.data || [];

  // Fetch categories for filtering
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/categories/main/with-children'],
  });

  const categoriesWithChildren = categoriesData?.success ? categoriesData.data : [];
  
  // Extract parent categories and organize children
  const parentCategories = categoriesWithChildren.map((item: any) => item.category);
  const getChildCategories = (parentId: number) => {
    const parentItem = categoriesWithChildren.find((item: any) => item.category.id === parentId);
    return parentItem?.children || [];
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [productSearchQuery, selectedCategoryId, selectedParentCategoryId]);

  // Scroll to top when page changes
  useEffect(() => {
    if (currentPage > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  // Fetch products with comprehensive pagination and filtering
  const { data: productsData, isLoading: isSearching } = useQuery({
    queryKey: ['/api/products', { 
      search: productSearchQuery,
      categoryId: selectedCategoryId,
      parentCategoryId: selectedParentCategoryId,
      page: currentPage,
      limit: 20
    }],
    enabled: shouldLoadProducts,
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '20',
        offset: ((currentPage - 1) * 20).toString()
      });
      
      // Add search query if provided
      if (productSearchQuery.trim()) {
        params.set('search', productSearchQuery.trim());
      }
      
      // Add category filtering
      if (selectedCategoryId) {
        params.set('categoryId', selectedCategoryId.toString());
      } else if (selectedParentCategoryId) {
        params.set('parentCategoryId', selectedParentCategoryId.toString());
      }
      
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      
      // Update pagination state
      if (data.success && data.meta) {
        setTotalProducts(data.meta.total || 0);
        setTotalPages(Math.ceil((data.meta.total || 0) / 20));
      }
      
      return data;
    }
  });

  // Add product to promotion mutation
  const addProductToPromotionMutation = useMutation({
    mutationFn: ({ productId, discountOverride }: { productId: number; discountOverride?: number }) =>
      apiRequest(`/api/promotions/${promotionId}/products`, {
        method: 'POST',
        body: JSON.stringify({ productId, discountOverride }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/promotions/${promotionId}/products`] });
      queryClient.invalidateQueries({ queryKey: ['/api/promotions'] });
      toast({
        title: "Success",
        description: "Product added to promotion successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add product to promotion",
        variant: "destructive",
      });
    },
  });

  // Remove product from promotion mutation
  const removeProductFromPromotionMutation = useMutation({
    mutationFn: (productId: number) =>
      apiRequest(`/api/promotions/${promotionId}/products/${productId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/promotions/${promotionId}/products`] });
      queryClient.invalidateQueries({ queryKey: ['/api/promotions'] });
      toast({
        title: "Success",
        description: "Product removed from promotion successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to remove product from promotion",
        variant: "destructive",
      });
    },
  });

  // Update promotional price mutation
  const updatePromotionalPriceMutation = useMutation({
    mutationFn: ({ productId, price }: { productId: number; price: number }) => 
      apiRequest(`/api/promotions/${promotionId}/products/${productId}/price`, {
        method: 'PATCH',
        body: JSON.stringify({ promotionalPrice: price }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/promotions/${promotionId}/products`] });
      toast({
        title: "Success",
        description: "Promotional price updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update promotional price",
        variant: "destructive",
      });
    },
  });

  // Mass publish mutation
  const massPublishMutation = useMutation({
    mutationFn: () => 
      apiRequest(`/api/promotions/${promotionId}/products/mass-publish`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/promotions/${promotionId}/products`] });
      queryClient.invalidateQueries({ queryKey: ['/api/promotions/active-with-products'] });
      toast({
        title: "Success",
        description: "All promotion products published successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to publish promotion products",
        variant: "destructive",
      });
    },
  });

  const handleAddProduct = (product: Product) => {
    addProductToPromotionMutation.mutate({ productId: product.id });
  };

  const handleRemoveProduct = (productId: number) => {
    removeProductFromPromotionMutation.mutate(productId);
  };

  const handlePromotionalPriceChange = (productId: number, value: string) => {
    setPromotionalPrices(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const handleUpdatePromotionalPrice = (productId: number, price: string | undefined) => {
    const numericPrice = parseFloat(price || '0');
    if (numericPrice > 0) {
      updatePromotionalPriceMutation.mutate({ productId, price: numericPrice });
    }
  };

  const handleMassPublish = () => {
    massPublishMutation.mutate();
  };

  const isProductInPromotion = (productId: number) => {
    return promotionProducts.some((pp: ProductPromotion) => pp.productId === productId);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/admin/promotions')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Promotions
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Manage Products
              </h1>
              <p className="text-muted-foreground">
                {promotion?.promotionName} - Add or remove products from this promotion
              </p>
            </div>
          </div>
        </div>

        {promotion && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Promotion Details</span>
                <Badge variant={promotion.isActive ? "default" : "secondary"}>
                  {promotion.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <p className="text-lg">{promotion.promotionType}</p>
                </div>
                {promotion.discountValue && (
                  <div>
                    <p className="text-sm font-medium">Discount</p>
                    <p className="text-lg">
                      {promotion.promotionType === 'percentage' ? `${promotion.discountValue}%` : `R${promotion.discountValue}`}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-lg">
                    {new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search & Add Products</TabsTrigger>
            <TabsTrigger value="current">
              Current Products ({promotionProducts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Products to Promotion</CardTitle>
                <CardDescription>
                  Search for products and add them to this promotion campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name, SKU, or description..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Parent Category</label>
                    <Select 
                      value={selectedParentCategoryId?.toString() || "all"} 
                      onValueChange={(value) => {
                        const parentId = value === "all" ? null : parseInt(value);
                        setSelectedParentCategoryId(parentId);
                        setSelectedCategoryId(null); // Reset child category when parent changes
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {parentCategories.map((category: any) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Child Category</label>
                    <Select 
                      value={selectedCategoryId?.toString() || "all"} 
                      onValueChange={(value) => setSelectedCategoryId(value === "all" ? null : parseInt(value))}
                      disabled={!selectedParentCategoryId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedParentCategoryId ? "Select subcategory" : "Select parent first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All subcategories</SelectItem>
                        {selectedParentCategoryId && getChildCategories(selectedParentCategoryId).map((child: any) => (
                          <SelectItem key={child.id} value={child.id.toString()}>
                            {child.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(selectedParentCategoryId || selectedCategoryId || productSearchQuery.trim()) && (
                  <div className="flex items-center gap-2 pt-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Active filters:</span>
                    {productSearchQuery.trim() && (
                      <Badge variant="secondary" className="text-xs">
                        Search: "{productSearchQuery.trim()}"
                        <X 
                          className="h-3 w-3 ml-1 cursor-pointer" 
                          onClick={() => setProductSearchQuery("")}
                        />
                      </Badge>
                    )}
                    {selectedParentCategoryId && (
                      <Badge variant="secondary" className="text-xs">
                        {parentCategories.find((cat: any) => cat.id === selectedParentCategoryId)?.name || 'Unknown'}
                        <X 
                          className="h-3 w-3 ml-1 cursor-pointer" 
                          onClick={() => {
                            setSelectedParentCategoryId(null);
                            setSelectedCategoryId(null);
                          }}
                        />
                      </Badge>
                    )}
                    {selectedCategoryId && (
                      <Badge variant="secondary" className="text-xs">
                        {categoriesWithChildren
                          .find((cat: any) => cat.category.id === selectedParentCategoryId)
                          ?.children?.find((child: any) => child.id === selectedCategoryId)?.name || 'Unknown'}
                        <X 
                          className="h-3 w-3 ml-1 cursor-pointer" 
                          onClick={() => setSelectedCategoryId(null)}
                        />
                      </Badge>
                    )}
                  </div>
                )}

                {/* Product Results Section */}
                <div className="space-y-4">
                  {/* Results Summary */}
                  {!isSearching && productsData?.success && (
                    <div className="flex items-center justify-between py-2">
                      <p className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalProducts)} of {totalProducts} products
                      </p>
                      <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </div>
                    </div>
                  )}

                  {isSearching ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                      Loading products...
                    </div>
                  ) : productsData?.success && productsData?.data?.length > 0 ? (
                    <>
                      {/* Products Grid */}
                      <div className="grid gap-4">
                        {productsData.data.map((product: Product) => (
                          <Card key={product.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {product.imageUrl && (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-16 h-16 object-cover rounded-lg"
                                  />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-semibold">{product.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    SKU: {product.sku} | Price: R{product.price}
                                    {product.salePrice && product.salePrice !== product.price && (
                                      <span className="ml-2 text-green-600">Sale: R{product.salePrice}</span>
                                    )}
                                  </p>
                                  {product.category && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {product.category.parentCategory?.name && (
                                        <span>{product.category.parentCategory.name} → </span>
                                      )}
                                      {product.category.name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                onClick={() => handleAddProduct(product)}
                                disabled={addProductToPromotionMutation.isPending || isProductInPromotion(product.id)}
                                size="sm"
                              >
                                {isProductInPromotion(product.id) ? (
                                  "Already Added"
                                ) : (
                                  <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add to Promotion
                                  </>
                                )}
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center space-x-2 pt-6">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1 || isSearching}
                          >
                            Previous
                          </Button>
                          
                          {/* Page Numbers */}
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  disabled={isSearching}
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages || isSearching}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>
                        {productSearchQuery.trim() || selectedCategoryId || selectedParentCategoryId
                          ? "No products found matching your criteria"
                          : "No products available"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="current" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Products in Promotion ({promotionProducts.length})</CardTitle>
                  <CardDescription>
                    Manage products currently included in this promotion
                  </CardDescription>
                </div>
                <Button 
                  onClick={handleMassPublish}
                  disabled={massPublishMutation.isPending || promotionProducts.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {massPublishMutation.isPending ? "Publishing..." : "Mass Publish Products"}
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingProducts ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Loading promotion products...
                  </div>
                ) : promotionProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Product</th>
                          <th className="text-left p-3 font-medium">Categories</th>
                          <th className="text-left p-3 font-medium">Cost Price</th>
                          <th className="text-left p-3 font-medium">Base Price</th>
                          <th className="text-left p-3 font-medium">Sale Price</th>
                          <th className="text-left p-3 font-medium">Promotional Price</th>
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-center p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {promotionProducts.map((item: ProductPromotion) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div className="flex items-center space-x-3">
                                {item.product?.imageUrl ? (
                                  <img
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    className="w-12 h-12 object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <Package className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-medium text-sm">{item.product?.name || `Product ID: ${item.productId}`}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    SKU: {item.product?.sku || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm">
                                <div className="font-medium">{item.product?.category?.name || 'N/A'}</div>
                                <div className="text-xs text-muted-foreground">
                                  {item.product?.category?.parentCategory?.name || 'No parent'}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-sm">R{item.product?.costPrice || '0.00'}</span>
                            </td>
                            <td className="p-3">
                              <span className="text-sm">R{item.product?.price || '0.00'}</span>
                            </td>
                            <td className="p-3">
                              <span className="text-sm">
                                {item.product?.salePrice ? `R${item.product.salePrice}` : 'N/A'}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="number"
                                  value={promotionalPrices[item.productId] || item.promotionalPrice || ''}
                                  onChange={(e) => handlePromotionalPriceChange(item.productId, e.target.value)}
                                  placeholder="Set price"
                                  className="w-24 h-8 text-sm"
                                  step="0.01"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdatePromotionalPrice(item.productId, promotionalPrices[item.productId] || item.promotionalPrice?.toString())}
                                  disabled={updatePromotionalPriceMutation.isPending}
                                  className="h-8 px-2"
                                >
                                  Save
                                </Button>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant={item.product?.isPublished ? "default" : "secondary"}>
                                {item.product?.isPublished ? "Published" : "Draft"}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveProduct(item.productId)}
                                disabled={removeProductFromPromotionMutation.isPending}
                                className="h-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No products added to this promotion yet</p>
                    <p className="text-sm">Switch to the Search tab to add products</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}