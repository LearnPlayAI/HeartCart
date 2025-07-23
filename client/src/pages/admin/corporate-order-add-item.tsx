import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  imageUrl: string;
}

interface CorporateOrderItem {
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  employeeName: string;
  employeeEmail: string;
  employeePhone: string;
  employeeAddress: string;
  size?: string;
  color?: string;
}

export default function CorporateOrderAddItemPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemData, setItemData] = useState<Partial<CorporateOrderItem>>({
    quantity: 1,
    // Employee details optional initially - will be added after customer provides details via email
    employeeName: "",
    employeeEmail: "",
    employeePhone: "",
    employeeAddress: "",
  });

  // Fetch products for selection
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products', { search: searchTerm }],
    enabled: searchTerm.length > 2,
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (newItem: CorporateOrderItem) => {
      const response = await apiRequest('POST', `/api/admin/corporate-orders/${orderId}/items`, newItem);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item added to corporate order successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/corporate-orders/${orderId}`] });
      navigate(`/admin/corporate-orders/${orderId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add item",
        variant: "destructive",
      });
    },
  });

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setItemData(prev => ({
      ...prev,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unitPrice: product.price,
      totalPrice: (parseFloat(product.price) * (itemData.quantity || 1)).toFixed(2),
    }));
  };

  const handleQuantityChange = (quantity: number) => {
    setItemData(prev => {
      const newQuantity = Math.max(1, quantity);
      const unitPrice = parseFloat(prev.unitPrice || "0");
      return {
        ...prev,
        quantity: newQuantity,
        totalPrice: (unitPrice * newQuantity).toFixed(2),
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive",
      });
      return;
    }

    // Employee details are optional initially - will be added after customer provides details via email
    // No validation required for employee fields during initial item creation

    addItemMutation.mutate(itemData as CorporateOrderItem);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/corporate-orders/${orderId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Order
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Add Item to Corporate Order</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Select Product
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search">Search Products</Label>
                <Input
                  id="search"
                  placeholder="Search by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {searchTerm.length > 2 && (
                <div className="space-y-2">
                  {productsLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600 mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Searching products...</p>
                    </div>
                  ) : products && products.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                      {products.map((product) => (
                        <div
                          key={product.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedProduct?.id === product.id
                              ? 'border-pink-500 bg-pink-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleProductSelect(product)}
                        >
                          <div className="flex items-start gap-3">
                            {product.imageUrl && (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                              <p className="text-sm font-semibold text-pink-600">
                                {formatCurrency(parseFloat(product.price))}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 text-center py-4">
                      No products found. Try a different search term.
                    </p>
                  )}
                </div>
              )}

              {selectedProduct && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Selected Product</h4>
                  <div className="flex items-center gap-3">
                    {selectedProduct.imageUrl && (
                      <img
                        src={selectedProduct.imageUrl}
                        alt={selectedProduct.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium text-green-900">{selectedProduct.name}</p>
                      <p className="text-sm text-green-700">SKU: {selectedProduct.sku}</p>
                      <p className="text-lg font-semibold text-green-800">
                        {formatCurrency(parseFloat(selectedProduct.price))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Item Details */}
          {selectedProduct && (
            <Card>
              <CardHeader>
                <CardTitle>Item Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={itemData.quantity || 1}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>Total Price</Label>
                    <Input
                      value={formatCurrency(parseFloat(itemData.totalPrice || "0"))}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="size">Size (Optional)</Label>
                    <Input
                      id="size"
                      value={itemData.size || ""}
                      onChange={(e) => setItemData(prev => ({ ...prev, size: e.target.value }))}
                      placeholder="e.g., M, L, XL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Color (Optional)</Label>
                    <Input
                      id="color"
                      value={itemData.color || ""}
                      onChange={(e) => setItemData(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="e.g., Red, Blue"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Employee Details */}
          {selectedProduct && (
            <Card>
              <CardHeader>
                <CardTitle>Employee Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employeeName">Employee Name *</Label>
                    <Input
                      id="employeeName"
                      value={itemData.employeeName || ""}
                      onChange={(e) => setItemData(prev => ({ ...prev, employeeName: e.target.value }))}
                      placeholder="Full name and surname"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="employeeEmail">Employee Email *</Label>
                    <Input
                      id="employeeEmail"
                      type="email"
                      value={itemData.employeeEmail || ""}
                      onChange={(e) => setItemData(prev => ({ ...prev, employeeEmail: e.target.value }))}
                      placeholder="employee@company.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="employeePhone">Employee Phone</Label>
                  <Input
                    id="employeePhone"
                    value={itemData.employeePhone || ""}
                    onChange={(e) => setItemData(prev => ({ ...prev, employeePhone: e.target.value }))}
                    placeholder="+27 12 345 6789"
                  />
                </div>

                <div>
                  <Label htmlFor="employeeAddress">Employee Address</Label>
                  <Textarea
                    id="employeeAddress"
                    value={itemData.employeeAddress || ""}
                    onChange={(e) => setItemData(prev => ({ ...prev, employeeAddress: e.target.value }))}
                    placeholder="Complete delivery address"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {selectedProduct && (
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/admin/corporate-orders/${orderId}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addItemMutation.isPending}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {addItemMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}