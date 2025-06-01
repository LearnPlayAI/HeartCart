import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, Plus, Trash2, Package, Users, Building2 } from "lucide-react";
import type { Product, Category, Supplier, Catalog, Promotion } from "@/../../shared/schema";

interface PromotionProduct {
  id: number;
  productId: number;
  promotionId: number;
  discountOverride?: string;
  createdAt: string;
  product: Product;
}

export default function PromotionProductsPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [selectedCatalog, setSelectedCatalog] = useState<string>("");
  const [bulkOperation, setBulkOperation] = useState<string>("");

  // Fetch promotion details
  const { data: promotion } = useQuery({
    queryKey: ["/api/promotions", id],
    enabled: !!id,
  });

  // Fetch promotion products
  const { data: promotionProducts = [], refetch: refetchPromotionProducts } = useQuery({
    queryKey: ["/api/promotions", id, "products"],
    enabled: !!id,
  });

  // Fetch available products for selection
  const { data: availableProducts = [] } = useQuery({
    queryKey: ["/api/products", { 
      search: searchTerm,
      category: selectedCategory,
      supplier: selectedSupplier,
      catalog: selectedCatalog,
      limit: 50
    }],
    enabled: searchTerm.length > 2 || selectedCategory || selectedSupplier || selectedCatalog,
  });

  // Fetch categories, suppliers, catalogs for filters
  const { data: categories = [] } = useQuery({ queryKey: ["/api/categories"] });
  const { data: suppliers = [] } = useQuery({ queryKey: ["/api/suppliers"] });
  const { data: catalogs = [] } = useQuery({ queryKey: ["/api/catalogs"] });

  // Add products to promotion
  const addProductsMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      return apiRequest(`/api/promotions/${id}/products`, {
        method: "POST",
        body: { productIds, discountOverride: null }
      });
    },
    onSuccess: () => {
      toast({ title: "Products added to promotion successfully" });
      refetchPromotionProducts();
      setSelectedProducts([]);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add products", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Remove product from promotion
  const removeProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest(`/api/promotions/${id}/products/${productId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({ title: "Product removed from promotion" });
      refetchPromotionProducts();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to remove product", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Bulk operations
  const bulkAddMutation = useMutation({
    mutationFn: async (params: { type: string; id: string }) => {
      return apiRequest(`/api/promotions/${id}/products/bulk`, {
        method: "POST",
        body: params
      });
    },
    onSuccess: (data) => {
      toast({ 
        title: "Bulk operation completed", 
        description: `Added ${data.count} products to promotion`
      });
      refetchPromotionProducts();
      setBulkOperation("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Bulk operation failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleAddSelectedProducts = () => {
    if (selectedProducts.length > 0) {
      addProductsMutation.mutate(selectedProducts);
    }
  };

  const handleBulkAdd = () => {
    if (bulkOperation && selectedCategory) {
      const [type, includeSubcategories] = bulkOperation.split("-");
      bulkAddMutation.mutate({ 
        type: "category", 
        id: selectedCategory,
        includeSubcategories: includeSubcategories === "sub"
      });
    } else if (bulkOperation === "supplier" && selectedSupplier) {
      bulkAddMutation.mutate({ type: "supplier", id: selectedSupplier });
    } else if (bulkOperation === "catalog" && selectedCatalog) {
      bulkAddMutation.mutate({ type: "catalog", id: selectedCatalog });
    }
  };

  const handleProductSelection = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  const filteredAvailableProducts = availableProducts.filter(
    product => !promotionProducts.some(pp => pp.productId === product.id)
  );

  return (
    <AdminLayout title="Manage Promotion Products" subtitle={`${promotion?.promotionName || 'Loading...'}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/admin/promotions')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Promotions
          </Button>
          
          {selectedProducts.length > 0 && (
            <Button 
              onClick={handleAddSelectedProducts}
              disabled={addProductsMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Selected ({selectedProducts.length})
            </Button>
          )}
        </div>

        <Tabs defaultValue="current" className="space-y-4">
          <TabsList>
            <TabsTrigger value="current">Current Products ({promotionProducts.length})</TabsTrigger>
            <TabsTrigger value="add">Add Products</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          </TabsList>

          {/* Current Products Tab */}
          <TabsContent value="current" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Products in Promotion</CardTitle>
              </CardHeader>
              <CardContent>
                {promotionProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No products added to this promotion yet.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {promotionProducts.map((pp: PromotionProduct) => (
                      <div key={pp.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <img 
                            src={pp.product.imageUrl || '/api/placeholder/60/60'} 
                            alt={pp.product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <h3 className="font-medium">{pp.product.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              SKU: {pp.product.sku} • Price: R{pp.product.price}
                            </p>
                            {pp.discountOverride && (
                              <Badge variant="secondary">
                                Override: {pp.discountOverride}%
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProductMutation.mutate(pp.productId)}
                          disabled={removeProductMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add Products Tab */}
          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Search and Add Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {categories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Suppliers</SelectItem>
                      {suppliers.map((supplier: Supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedCatalog} onValueChange={setSelectedCatalog}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by catalog" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Catalogs</SelectItem>
                      {catalogs.map((catalog: Catalog) => (
                        <SelectItem key={catalog.id} value={catalog.id.toString()}>
                          {catalog.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Available Products */}
                <div className="space-y-2">
                  {filteredAvailableProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm.length <= 2 && !selectedCategory && !selectedSupplier && !selectedCatalog 
                        ? "Enter at least 3 characters to search or select a filter"
                        : "No products found"
                      }
                    </div>
                  ) : (
                    filteredAvailableProducts.map((product: Product) => (
                      <div key={product.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => 
                            handleProductSelection(product.id, checked as boolean)
                          }
                        />
                        <img 
                          src={product.imageUrl || '/api/placeholder/40/40'} 
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            SKU: {product.sku} • Price: R{product.price}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Operations Tab */}
          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Product Operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Add by Category
                    </h3>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category: Category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setBulkOperation("category")}
                        disabled={!selectedCategory}
                      >
                        Add Category Products
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setBulkOperation("category-sub")}
                        disabled={!selectedCategory}
                      >
                        Add Category + Subcategories
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Add by Supplier
                    </h3>
                    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier: Supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setBulkOperation("supplier")}
                      disabled={!selectedSupplier}
                    >
                      Add All Supplier Products
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      Add by Catalog
                    </h3>
                    <Select value={selectedCatalog} onValueChange={setSelectedCatalog}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select catalog" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogs.map((catalog: Catalog) => (
                          <SelectItem key={catalog.id} value={catalog.id.toString()}>
                            {catalog.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setBulkOperation("catalog")}
                      disabled={!selectedCatalog}
                    >
                      Add All Catalog Products
                    </Button>
                  </div>
                </div>

                {bulkOperation && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Confirm Bulk Operation</h4>
                        <p className="text-sm text-muted-foreground">
                          This will add all products from the selected {bulkOperation.replace("-sub", " and subcategories")} to this promotion.
                        </p>
                      </div>
                      <div className="space-x-2">
                        <Button variant="outline" onClick={() => setBulkOperation("")}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleBulkAdd}
                          disabled={bulkAddMutation.isPending}
                        >
                          {bulkAddMutation.isPending ? "Adding..." : "Confirm"}
                        </Button>
                      </div>
                    </div>
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