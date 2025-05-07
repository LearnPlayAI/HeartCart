import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminLayout } from "@/components/admin/layout";
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
  GripVertical
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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

export default function CatalogProducts() {
  const { id } = useParams<{ id: string }>();
  const catalogId = parseInt(id);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactiveProducts, setShowInactiveProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  // Query for the catalog details
  const { data: catalog, isLoading: catalogLoading } = useQuery<Catalog>({
    queryKey: [`/api/catalogs/${catalogId}`],
    queryFn: async () => {
      const response = await fetch(`/api/catalogs/${catalogId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch catalog details");
      }
      return response.json();
    }
  });

  // Query for products belonging to this catalog
  const { 
    data: products, 
    isLoading: productsLoading,
    refetch: refetchProducts
  } = useQuery<Product[]>({
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

  // Delete product mutation
  const { mutate: deleteProduct, isPending: isDeleting } = useMutation({
    mutationFn: async (productId: number) => {
      const response = await apiRequest("DELETE", `/api/products/${productId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete product");
      }
      return await response.json();
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
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  // Bulk activate products mutation
  const { mutate: bulkActivateProducts, isPending: isBulkActivating } = useMutation({
    mutationFn: async (data: { productIds: number[], active: boolean }) => {
      const response = await apiRequest("PATCH", `/api/products/bulk-update-status`, data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update products");
      }
      return await response.json();
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
      const response = await apiRequest("PATCH", `/api/catalogs/${catalogId}/products/reorder`, data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to reorder products");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Products reordered",
        description: "Product display order has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/catalogs/${catalogId}/products`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reorder products",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleAddProduct = () => {
    navigate(`/admin/products/new?catalogId=${catalogId}`);
  };

  const handleEditProduct = (product: Product) => {
    navigate(`/admin/products/${product.id}/edit`);
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
                {product.hasAttributes && (
                  <DropdownMenuItem onClick={() => navigate(`/admin/products/${product.id}/attributes`)}>
                    <Tag className="mr-2 h-4 w-4" />
                    Manage Attributes
                  </DropdownMenuItem>
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
                        <TableCell colSpan={7} className="text-center py-10">
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
                        <TableCell colSpan={7} className="text-center py-10">
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
    </AdminLayout>
  );
}