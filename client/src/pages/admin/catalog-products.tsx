import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminLayout } from "@/components/admin/layout";
import { QuickEditProductForm } from "@/components/admin/quick-edit-product-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  PlusCircle,
  Search,
  Loader2,
  MoreVertical,
  Edit,
  Trash,
  RefreshCw,
  ShoppingBag,
  Tag,
  Package,
  Scissors,
  Eye,
  Undo2,
  GripVertical,
  Save,
  PlusSquare
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Type definitions
type Catalog = {
  id: number;
  name: string;
  description: string;
  supplierId: number;
  supplierName: string;
  isActive: boolean;
  productsCount: number;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  defaultMarkupPercentage?: number;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  listPrice?: number;
  categoryId: number;
  categoryName?: string;
  supplierId: number;
  supplierName?: string;
  catalogId: number;
  catalogName?: string;
  sku: string;
  stockQuantity: number;
  isActive: boolean;
  hasAttributes: boolean;
  discountPercentage?: number;
  thumbnailUrl?: string;
  rating?: number;
  salesCount?: number;
  createdAt: string;
  displayOrder?: number;
};

type CategoryAttribute = {
  id: number;
  categoryId: number;
  name: string;
  displayName: string;
  description: string | null;
  required: boolean;
  type: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

type ProductAttributeValue = {
  id: number;
  productId: number;
  attributeId: number;
  value: string;
  priceAdjustment: number;
  attributeDisplayName?: string;
};

type ProductAttributeCombination = {
  id: number;
  productId: number;
  combinationHash: string;
  priceAdjustment: number;
  attributes: Record<string, string>;
};

// Component for editing product attributes
function ProductAttributesDialog({ 
  product, 
  isOpen, 
  onClose 
}: { 
  product: Product | null; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("values");
  const [newAttributeValue, setNewAttributeValue] = useState({
    attributeId: '',
    value: '',
    priceAdjustment: '0'
  });
  
  // Query for category attributes
  const { data: categoryAttributes, isLoading: attributesLoading } = useQuery({
    queryKey: ['/api/categories', product?.categoryId, 'attributes'],
    queryFn: async () => {
      if (!product?.categoryId) return [];
      const res = await fetch(`/api/categories/${product.categoryId}/attributes`);
      if (!res.ok) throw new Error("Failed to fetch category attributes");
      return res.json();
    },
    enabled: !!product?.categoryId && isOpen
  });
  
  // Query for product attribute values
  const { data: attributeValues, isLoading: valuesLoading, refetch: refetchValues } = useQuery({
    queryKey: ['/api/products', product?.id, 'attributes'],
    queryFn: async () => {
      if (!product?.id) return [];
      const res = await fetch(`/api/products/${product.id}/attributes`);
      if (!res.ok) throw new Error("Failed to fetch attribute values");
      return res.json();
    },
    enabled: !!product?.id && isOpen
  });
  
  // Query for attribute combinations
  const { data: combinations, isLoading: combinationsLoading, refetch: refetchCombinations } = useQuery({
    queryKey: ['/api/products', product?.id, 'combinations'],
    queryFn: async () => {
      if (!product?.id) return [];
      const res = await fetch(`/api/products/${product.id}/combinations`);
      if (!res.ok) throw new Error("Failed to fetch combinations");
      return res.json();
    },
    enabled: !!product?.id && isOpen
  });
  
  // Add attribute value mutation
  const { mutate: addAttributeValue, isPending: isAddingValue } = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/products/${product?.id}/attributes`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Attribute value added",
        description: "The attribute value has been added successfully."
      });
      refetchValues();
      setNewAttributeValue({
        attributeId: '',
        value: '',
        priceAdjustment: '0'
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add attribute value",
        variant: "destructive"
      });
    }
  });
  
  // Delete attribute value mutation
  const { mutate: deleteAttributeValue, isPending: isDeletingValue } = useMutation({
    mutationFn: async (valueId: number) => {
      const response = await apiRequest("DELETE", `/api/products/${product?.id}/attributes/${valueId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Attribute value deleted",
        description: "The attribute value has been removed."
      });
      refetchValues();
      refetchCombinations();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attribute value",
        variant: "destructive"
      });
    }
  });
  
  const handleAddAttributeValue = () => {
    if (!newAttributeValue.attributeId || !newAttributeValue.value) {
      toast({
        title: "Validation error",
        description: "Please select an attribute and enter a value",
        variant: "destructive"
      });
      return;
    }
    
    addAttributeValue({
      attributeId: parseInt(newAttributeValue.attributeId),
      value: newAttributeValue.value,
      priceAdjustment: parseFloat(newAttributeValue.priceAdjustment) || 0
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Product Attributes</DialogTitle>
          <DialogDescription>
            {product ? `Edit attributes for ${product.name}` : 'Loading product...'}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="values">Attribute Values</TabsTrigger>
            <TabsTrigger value="combinations">Combinations & Pricing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="values" className="space-y-4">
            {/* Add new attribute value */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Add New Attribute</CardTitle>
                <CardDescription>
                  Assign a new attribute value to this product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="attributeId">Attribute</Label>
                    <Select
                      value={newAttributeValue.attributeId}
                      onValueChange={(value) => setNewAttributeValue({...newAttributeValue, attributeId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an attribute" />
                      </SelectTrigger>
                      <SelectContent>
                        {attributesLoading ? (
                          <div className="p-2 text-center">Loading...</div>
                        ) : categoryAttributes?.length === 0 ? (
                          <div className="p-2 text-center">No attributes available</div>
                        ) : (
                          categoryAttributes?.map((attr: CategoryAttribute) => (
                            <SelectItem key={attr.id} value={attr.id.toString()}>
                              {attr.displayName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="value">Value</Label>
                    <Input
                      id="value"
                      placeholder="Enter value"
                      value={newAttributeValue.value}
                      onChange={(e) => setNewAttributeValue({...newAttributeValue, value: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="priceAdjustment">Price Adjustment (R)</Label>
                    <Input
                      id="priceAdjustment"
                      type="number"
                      placeholder="0.00"
                      value={newAttributeValue.priceAdjustment}
                      onChange={(e) => setNewAttributeValue({...newAttributeValue, priceAdjustment: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleAddAttributeValue}
                    disabled={isAddingValue}
                  >
                    {isAddingValue ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <PlusSquare className="mr-2 h-4 w-4" />
                        Add Value
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Current attribute values */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Current Values</CardTitle>
                <CardDescription>
                  Existing attribute values for this product
                </CardDescription>
              </CardHeader>
              <CardContent>
                {valuesLoading ? (
                  <div className="py-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="mt-2">Loading attribute values...</p>
                  </div>
                ) : attributeValues?.length === 0 ? (
                  <div className="py-4 text-center text-muted-foreground">
                    <p>No attribute values assigned to this product yet.</p>
                    <p className="text-sm mt-1">Add your first attribute value above.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Attribute</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Price Adjustment</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attributeValues?.map((value: ProductAttributeValue) => (
                        <TableRow key={value.id}>
                          <TableCell>{value.attributeDisplayName}</TableCell>
                          <TableCell>{value.value}</TableCell>
                          <TableCell>
                            {value.priceAdjustment === 0 
                              ? "—" 
                              : `R${value.priceAdjustment.toFixed(2)}`
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAttributeValue(value.id)}
                              disabled={isDeletingValue}
                            >
                              <Trash className="h-4 w-4 text-red-500" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="combinations" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Attribute Combinations</CardTitle>
                <CardDescription>
                  Manage price adjustments for different attribute combinations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {combinationsLoading ? (
                  <div className="py-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="mt-2">Loading combinations...</p>
                  </div>
                ) : combinations?.length === 0 ? (
                  <div className="py-4 text-center text-muted-foreground">
                    <p>No attribute combinations defined yet.</p>
                    <p className="text-sm mt-1">Add multiple attribute values before creating combinations.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Combination</TableHead>
                        <TableHead>Price Adjustment</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {combinations?.map((combo: ProductAttributeCombination) => (
                        <TableRow key={combo.id}>
                          <TableCell>
                            {Object.entries(combo.attributes).map(([attr, value]) => (
                              <Badge key={attr} variant="outline" className="mr-1 mb-1">
                                {attr}: {value}
                              </Badge>
                            ))}
                          </TableCell>
                          <TableCell>
                            {combo.priceAdjustment === 0 
                              ? "—" 
                              : `R${combo.priceAdjustment.toFixed(2)}`
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CatalogProducts() {
  const { id } = useParams<{ id: string }>();
  const catalogId = parseInt(id);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactiveProducts, setShowInactiveProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showQuickEditDialog, setShowQuickEditDialog] = useState(false);
  const [showAttributesDialog, setShowAttributesDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  // Query for the catalog details
  const { data: catalogResponse, isLoading: catalogLoading } = useQuery({
    queryKey: [`/api/catalogs/${catalogId}`],
    queryFn: async () => {
      const response = await fetch(`/api/catalogs/${catalogId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch catalog details");
      }
      return response.json();
    }
  });
  
  // Extract catalog data from the standardized response
  const catalog = catalogResponse?.data;

  // Query for products belonging to this catalog
  const { 
    data: productsResponse, 
    isLoading: productsLoading,
    refetch: refetchProducts
  } = useQuery({
    queryKey: [`/api/catalogs/${catalogId}/products`, searchQuery, showInactiveProducts],
    queryFn: async () => {
      const response = await fetch(
        `/api/catalogs/${catalogId}/products?q=${encodeURIComponent(searchQuery)}&includeInactive=${showInactiveProducts}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch catalog products");
      }
      return response.json();
    }
  });
  
  // Extract products data from the standardized response
  const products = productsResponse?.data || [];

  // Delete product mutation
  const { mutate: deleteProduct, isPending: isDeleting } = useMutation({
    mutationFn: async (productId: number) => {
      // Simply call apiRequest and let the centralized error handling in queryClient.ts do its job
      const response = await apiRequest("DELETE", `/api/products/${productId}`);
      const data = await response.json();
      
      // Check if the response follows the standardized format
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to delete product");
      }
      
      return data.data;
    },
    onSuccess: () => {
      toast({
        title: "Product deleted",
        description: `${selectedProduct?.name} has been deleted.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/catalogs/${catalogId}/products`] });
      setShowDeleteDialog(false);
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      console.error("Product deletion error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
      setShowDeleteDialog(false); // Close dialog on error too
    },
  });

  // Bulk activate products mutation
  const { mutate: bulkActivateProducts, isPending: isBulkActivating } = useMutation({
    mutationFn: async (data: { productIds: number[], active: boolean }) => {
      // Use centralized error handling in apiRequest
      const response = await apiRequest("PATCH", `/api/products/bulk-update-status`, data);
      const result = await response.json();
      
      // Check if the response follows the standardized format
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to update products");
      }
      
      return result.data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: `Products ${variables.active ? 'activated' : 'deactivated'}`,
        description: `${selectedProducts.length} products have been ${variables.active ? 'activated' : 'deactivated'}.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/catalogs/${catalogId}/products`] });
      setSelectedProducts([]);
    },
    onError: (error: any) => {
      console.error("Bulk activation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update products",
        variant: "destructive",
      });
    },
  });

  // Update product display order mutation
  const { mutate: updateProductOrder, isPending: isUpdatingOrder } = useMutation({
    mutationFn: async (data: { productIds: number[], catalogId: number }) => {
      // Use centralized error handling in apiRequest
      const response = await apiRequest("PATCH", `/api/catalogs/${catalogId}/products/reorder`, data);
      const result = await response.json();
      
      // Check if the response follows the standardized format
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to reorder products");
      }
      
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Products reordered",
        description: "Product display order has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/catalogs/${catalogId}/products`] });
    },
    onError: (error: any) => {
      console.error("Product reordering error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reorder products",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleAddProduct = () => {
    // Use the new product wizard instead of the old product edit page
    navigate(`/admin/catalogs/${catalogId}/products/wizard`);
  };

  // Create draft from existing product and redirect to wizard
  const handleEditProduct = async (product: Product) => {
    // Create a fixed toast ID to reference for updates
    const toastId = "create-draft-toast";
    
    try {
      // Show loading toast with the fixed ID
      toast({
        id: toastId,
        title: "Creating product draft",
        description: "Please wait while we prepare the product for editing...",
      });
      
      // Call API to reuse existing draft (same as published products edit)
      const response = await apiRequest(
        "POST", 
        `/api/product-drafts/create-from-published/${product.id}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to create product draft");
      }
      
      // Get the draft data
      const result = await response.json();
      
      if (result.success && result.data) {
        // Success toast - replaces the loading toast by using same ID
        toast({
          id: toastId,
          title: "Draft created",
          description: "You can now edit the product in the wizard.",
        });
        
        // Navigate to product wizard with the draft ID
        navigate(`/admin/products/wizard/${result.data.draftId}`);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error creating product draft:", error);
      
      // Error toast - replaces the loading toast
      toast({
        id: toastId,
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create product draft",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedProduct) {
      deleteProduct(selectedProduct.id);
    }
  };

  const toggleSelectProduct = (productId: number) => {
    setSelectedProducts(prevSelected => {
      if (prevSelected.includes(productId)) {
        return prevSelected.filter(id => id !== productId);
      } else {
        return [...prevSelected, productId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (products) {
      if (selectedProducts.length === products.length) {
        setSelectedProducts([]);
      } else {
        setSelectedProducts(products.map(product => product.id));
      }
    }
  };

  const handleBulkActivate = (activate: boolean) => {
    bulkActivateProducts({
      productIds: selectedProducts,
      active: activate
    });
  };

  // For drag-and-drop reordering
  const [orderedProducts, setOrderedProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (products && products.length > 0) {
      // Sort products by displayOrder if available, otherwise maintain the API order
      const sorted = [...products].sort((a, b) => {
        if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
          return a.displayOrder - b.displayOrder;
        }
        return 0;
      });
      setOrderedProducts(sorted);
    } else {
      setOrderedProducts([]);
    }
  }, [products]);

  const handleDragEnd = (result: any) => {
    // Dropped outside the list
    if (!result.destination) {
      return;
    }

    // No actual change in position
    if (result.destination.index === result.source.index) {
      return;
    }

    // Reorder the array
    const reordered = Array.from(orderedProducts);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    
    // Update state with new order
    setOrderedProducts(reordered);
    
    // Save the new order to the server
    const productIds = reordered.map(product => product.id);
    updateProductOrder({
      productIds,
      catalogId
    });
  };

  const DraggableTableRow = ({ product, index }: { product: Product, index: number }) => (
    <Draggable draggableId={product.id.toString()} index={index} key={product.id}>
      {(provided, snapshot) => (
        <TableRow
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`${!product.isActive ? "opacity-60" : ""} ${
            snapshot.isDragging ? "bg-muted shadow-md" : ""
          }`}
        >
          <TableCell className="w-[60px]">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={selectedProducts.includes(product.id)}
                onCheckedChange={() => toggleSelectProduct(product.id)}
              />
              <div 
                {...provided.dragHandleProps}
                className="cursor-move"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </TableCell>
          <TableCell className="font-medium">
            <div className="flex items-center gap-3">
              {product.thumbnailUrl ? (
                <div className="h-10 w-10 rounded bg-muted overflow-hidden">
                  <img src={product.thumbnailUrl} alt={product.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <div>{product.name}</div>
                {product.hasAttributes && (
                  <div className="text-xs text-muted-foreground flex items-center">
                    <Tag className="h-3 w-3 mr-1" /> Has Attributes
                  </div>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell>{product.sku}</TableCell>
          <TableCell>{product.categoryName}</TableCell>
          <TableCell>
            <div className="flex flex-col">
              <span>R{product.price.toFixed(2)}</span>
              {product.listPrice && product.listPrice > product.price && (
                <span className="text-xs line-through text-muted-foreground">
                  R{product.listPrice.toFixed(2)}
                </span>
              )}
            </div>
          </TableCell>
          <TableCell>
            <Badge
              className={`${
                product.isActive
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-100"
              }`}
            >
              {product.isActive ? "Active" : "Inactive"}
            </Badge>
          </TableCell>
          <TableCell>
            <Button 
              size="sm" 
              variant="outline"
              className="flex items-center"
              onClick={() => navigate(`/admin/products/${product.id}/images`)}
            >
              <PlusSquare className="h-4 w-4 mr-1" />
              Upload Images
            </Button>
          </TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate(`/product/${product.slug}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setSelectedProduct(product);
                  setShowQuickEditDialog(true);
                }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Quick Edit
                </DropdownMenuItem>
                {product.hasAttributes && (
                  <>
                    <DropdownMenuItem onClick={() => navigate(`/admin/products/${product.id}/attributes`)}>
                      <Tag className="mr-2 h-4 w-4" />
                      Manage Attributes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setSelectedProduct(product);
                      setShowAttributesDialog(true);
                    }}>
                      <Tag className="mr-2 h-4 w-4" />
                      Edit Attributes
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkActivate(true)}>
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkActivate(false)}>
                  <Scissors className="mr-2 h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => handleDeleteClick(product)}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      )}
    </Draggable>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Catalog Products</h1>
            {catalogLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Badge
                className={`${
                  catalog?.isActive
                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                }`}
              >
                {catalog?.isActive ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
          {catalog && (
            <p className="text-muted-foreground">
              Managing products for <span className="font-medium">{catalog.name}</span> catalog
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/admin/catalogs`)}>
            <Undo2 className="mr-2 h-4 w-4" />
            Back to Catalogs
          </Button>
          <Button onClick={handleAddProduct}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Products in this Catalog</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchProducts()} 
                title="Refresh products list"
                className="h-8 px-2"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-inactive"
                  checked={showInactiveProducts}
                  onCheckedChange={setShowInactiveProducts}
                />
                <Label htmlFor="show-inactive">Show Inactive</Label>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          <CardDescription>
            Manage products within the {catalog?.name} catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedProducts.length > 0 && (
            <div className="bg-muted p-2 mb-4 rounded-md flex items-center justify-between">
              <div>
                <span className="font-medium">{selectedProducts.length}</span> products selected
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleBulkActivate(true)}
                  disabled={isBulkActivating}
                >
                  {isBulkActivating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Activate All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleBulkActivate(false)}
                  disabled={isBulkActivating}
                >
                  {isBulkActivating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Deactivate All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedProducts([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">
                  <Checkbox 
                    checked={products && products.length > 0 && selectedProducts.length === products.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Images</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="catalog-products">
                {(provided) => (
                  <TableBody
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {productsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10">
                          <div className="flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : orderedProducts && orderedProducts.length > 0 ? (
                      orderedProducts.map((product, index) => (
                        <DraggableTableRow 
                          key={product.id} 
                          product={product} 
                          index={index} 
                        />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <ShoppingBag className="h-10 w-10 text-gray-400" />
                            <div className="text-lg font-medium">No products found</div>
                            <div className="text-sm text-muted-foreground">
                              {searchQuery 
                                ? "Try a different search term" 
                                : "Add a new product to this catalog to get started"}
                            </div>
                            <Button
                              className="mt-2"
                              variant="outline"
                              onClick={handleAddProduct}
                            >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Add Product
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {provided.placeholder}
                  </TableBody>
                )}
              </Droppable>
            </DragDropContext>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedProduct && (
              <p className="font-medium">
                Deleting: {selectedProduct.name}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Edit Dialog */}
      <Dialog open={showQuickEditDialog} onOpenChange={setShowQuickEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Quick Edit Product</DialogTitle>
            <DialogDescription>
              Make quick changes to the basic product information.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <QuickEditProductForm 
              product={selectedProduct}
              onCancel={() => setShowQuickEditDialog(false)}
              onSaved={() => {
                setShowQuickEditDialog(false);
                setSelectedProduct(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Product Attributes Dialog */}
      <ProductAttributesDialog
        product={selectedProduct}
        isOpen={showAttributesDialog}
        onClose={() => {
          setShowAttributesDialog(false);
          setSelectedProduct(null);
          // Refresh the products list to update the hasAttributes flag if needed
          refetchProducts();
        }}
      />
    </AdminLayout>
  );
}