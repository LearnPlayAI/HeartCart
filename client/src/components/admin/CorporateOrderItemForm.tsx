import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

const corporateOrderItemSchema = z.object({
  productId: z.number().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.string().min(1, "Unit price is required"),
});

type CorporateOrderItemFormData = z.infer<typeof corporateOrderItemSchema>;

interface Product {
  id: number;
  name: string;
  sku: string | null;
  imageUrls: string[] | null;
  salePrice: string;
  originalPrice: string;
}

interface CorporateOrderItem {
  id: number;
  corporateOrderId: number;
  productId: number;
  productName: string;
  productSku: string | null;
  productImageUrl: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  createdAt: string;
}

interface CorporateOrderItemFormProps {
  corporateOrderId: number;
  item?: CorporateOrderItem;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CorporateOrderItemForm({ corporateOrderId, item, onSuccess, onCancel }: CorporateOrderItemFormProps) {
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CorporateOrderItemFormData>({
    resolver: zodResolver(corporateOrderItemSchema),
    defaultValues: {
      productId: item?.productId || 0,
      quantity: item?.quantity || 1,
      unitPrice: item?.unitPrice || "",
    },
  });

  // Search products
  const { data: productsData, isLoading: isSearching } = useQuery({
    queryKey: ['/api/admin/products/search', productSearch],
    queryFn: () => apiRequest('GET', `/api/admin/products/search?q=${encodeURIComponent(productSearch)}`),
    enabled: productSearch.length > 2,
  });

  const products = productsData?.products || [];

  // Create or update corporate order item mutation
  const saveMutation = useMutation({
    mutationFn: (data: CorporateOrderItemFormData) => {
      if (item) {
        return apiRequest('PATCH', `/api/admin/corporate-orders/${corporateOrderId}/items/${item.id}`, data);
      } else {
        return apiRequest('POST', `/api/admin/corporate-orders/${corporateOrderId}/items`, data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: item ? "Order item updated successfully" : "Order item added successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${item ? 'update' : 'add'} order item`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CorporateOrderItemFormData) => {
    saveMutation.mutate(data);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    form.setValue("productId", product.id);
    form.setValue("unitPrice", product.salePrice);
  };

  const calculateTotal = () => {
    const quantity = form.watch("quantity") || 0;
    const unitPrice = parseFloat(form.watch("unitPrice") || "0");
    return quantity * unitPrice;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item ? "Edit Order Item" : "Add Order Item"}</CardTitle>
        <CardDescription>
          {item ? "Update the order item details" : "Add a new item to this corporate order"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Product Selection */}
          {!item && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productSearch">Search Products</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="productSearch"
                    placeholder="Search by product name or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Product Search Results */}
              {productSearch.length > 2 && (
                <div className="space-y-2">
                  <Label>Search Results</Label>
                  {isSearching ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Searching products...
                    </div>
                  ) : products.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {products.map((product: Product) => (
                        <div
                          key={product.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedProduct?.id === product.id
                              ? "border-pink-600 bg-pink-50"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => handleProductSelect(product)}
                        >
                          <div className="flex items-center gap-3">
                            {product.imageUrls && product.imageUrls[0] && (
                              <img
                                src={product.imageUrls[0]}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium">{product.name}</h4>
                              {product.sku && (
                                <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                              )}
                              <p className="text-sm font-medium text-pink-600">
                                {formatCurrency(parseFloat(product.salePrice))}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No products found matching your search
                    </div>
                  )}
                </div>
              )}

              {/* Selected Product Display */}
              {selectedProduct && (
                <div className="p-3 border-2 border-pink-200 bg-pink-50 rounded-lg">
                  <Label className="text-sm font-medium text-pink-700">Selected Product</Label>
                  <div className="flex items-center gap-3 mt-2">
                    {selectedProduct.imageUrls && selectedProduct.imageUrls[0] && (
                      <img
                        src={selectedProduct.imageUrls[0]}
                        alt={selectedProduct.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <h4 className="font-medium">{selectedProduct.name}</h4>
                      {selectedProduct.sku && (
                        <p className="text-sm text-muted-foreground">SKU: {selectedProduct.sku}</p>
                      )}
                      <p className="text-sm font-medium text-pink-600">
                        {formatCurrency(parseFloat(selectedProduct.salePrice))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Item Details */}
          {(selectedProduct || item) && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    {...form.register("quantity", { valueAsNumber: true })}
                    placeholder="Enter quantity"
                  />
                  {form.formState.errors.quantity && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.quantity.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Unit Price (R) *</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("unitPrice")}
                    placeholder="0.00"
                  />
                  {form.formState.errors.unitPrice && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.unitPrice.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Total Calculation Display */}
              {(form.watch("quantity") && form.watch("unitPrice")) && (
                <div className="p-4 bg-pink-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Price:</span>
                    <span className="text-lg font-bold text-pink-600">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending || (!selectedProduct && !item)}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {item ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}