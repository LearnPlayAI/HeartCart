import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, Package, Plus, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  imageUrl?: string;
}

interface ProductPromotion {
  id: number;
  productId: number;
  promotionId: number;
  discountOverride?: number;
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

export default function PromotionProductsPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [productSearchQuery, setProductSearchQuery] = useState("");
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

  // Fetch products search results
  const { data: productsData, isLoading: isSearching } = useQuery({
    queryKey: ['/api/products', { search: productSearchQuery }],
    enabled: productSearchQuery.length > 2,
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

  const handleAddProduct = (product: Product) => {
    addProductToPromotionMutation.mutate({ productId: product.id });
  };

  const handleRemoveProduct = (productId: number) => {
    removeProductFromPromotionMutation.mutate(productId);
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
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name, SKU, or description..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {productSearchQuery.length > 2 && (
                  <div className="space-y-4">
                    {isSearching ? (
                      <div className="p-8 text-center text-muted-foreground">
                        Searching products...
                      </div>
                    ) : productsData?.data?.length > 0 ? (
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
                                <div>
                                  <h4 className="font-semibold">{product.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    SKU: {product.sku} | Price: R{product.price}
                                  </p>
                                </div>
                              </div>
                              <Button
                                onClick={() => handleAddProduct(product)}
                                disabled={addProductToPromotionMutation.isPending || isProductInPromotion(product.id)}
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
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        No products found matching "{productSearchQuery}"
                      </div>
                    )}
                  </div>
                )}

                {productSearchQuery.length <= 2 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Type at least 3 characters to search for products</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="current" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Products in Promotion</CardTitle>
                <CardDescription>
                  Manage products currently included in this promotion
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProducts ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Loading promotion products...
                  </div>
                ) : promotionProducts.length > 0 ? (
                  <div className="grid gap-4">
                    {promotionProducts.map((item: ProductPromotion) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {item.product?.imageUrl && (
                              <img
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div>
                              <h4 className="font-semibold">
                                {item.product?.name || `Product ID: ${item.productId}`}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {item.product?.sku && `SKU: ${item.product.sku} | `}
                                Base Price: R{item.product?.price}
                                {item.discountOverride && ` | Override: ${item.discountOverride}%`}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleRemoveProduct(item.productId)}
                            disabled={removeProductFromPromotionMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </Card>
                    ))}
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