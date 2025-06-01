import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MoreHorizontal, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Product } from "@shared/schema";

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Fetch categories for filtering
  const { data: categoriesResponse, isLoading: loadingCategories } = useQuery<{ success: boolean, data: { id: number; name: string }[] }>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return await response.json();
    },
  });
  const categories = categoriesResponse?.data;

  // Fetch products with filtering
  const { data: productsResponse, isLoading: loadingProducts } = useQuery<{ success: boolean, data: Product[] }>({
    queryKey: ["/api/products", searchTerm, categoryFilter],
    queryFn: async () => {
      let url = "/api/products";
      const params = new URLSearchParams();
      
      if (searchTerm) params.append("search", searchTerm);
      if (categoryFilter && categoryFilter !== "all") params.append("category", categoryFilter);
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch products");
      return await response.json();
    },
  });
  const products = productsResponse?.data;

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = products ? products.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = products ? Math.ceil(products.length / itemsPerPage) : 0;

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Handle edit product - EXACT same function as pricing page
  const handleEditProduct = async (productId: number) => {
    try {
      // Set flag to indicate we came from pricing page
      sessionStorage.setItem('cameFromPricing', 'true');
      
      // Call API to create or reuse existing draft
      const response = await fetch(`/api/product-drafts/create-from-published/${productId}`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error("Failed to create product draft");
        return;
      }
      
      // Get the draft data
      const result = await response.json();
      
      if (result.success && result.data) {
        // Navigate to product wizard with the draft ID
        navigate(`/admin/product-wizard/${result.data.draftId}`);
      } else {
        console.error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error creating product draft:", error);
    }
  };
  
  // Delete product
  const handleDeleteProduct = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const response = await fetch(`/api/products/${id}`, {
          method: "DELETE",
        });
        
        if (!response.ok) {
          throw new Error("Failed to delete product");
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error?.message || "Failed to delete product");
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col space-y-6">
        {/* Header with title and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Products</h2>
            <p className="text-muted-foreground">
              Manage your product catalog and listings
            </p>
          </div>
          <Button 
            className="space-x-2" 
            onClick={() => navigate('/admin/products/wizard')}
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((category: { id: number; name: string }) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {loadingProducts ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No products found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or add a new product</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentItems.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="relative h-48 bg-muted">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No image
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 hover:bg-white">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditProduct(product.id)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600" 
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-1">
                    <h3 className="font-medium leading-none line-clamp-1">{product.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {product.slug}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div>
                      <div className="font-bold">{formatCurrency(product.price)}</div>
                      {product.salePrice && (
                        <div className="text-xs">
                          <span className="text-muted-foreground line-through mr-1">
                            {formatCurrency(product.price)}
                          </span>
                          <span className="text-green-600 font-medium">
                            {Math.round(((product.price - product.salePrice) / product.price) * 100)}% off
                          </span>
                        </div>
                      )}
                    </div>

                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {product.isFeatured && (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                        Featured
                      </span>
                    )}
                    {product.isFlashDeal && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        Flash Deal
                      </span>
                    )}
                    {product.freeShipping && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Free Shipping
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => currentPage > 1 && paginate(currentPage - 1)}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    onClick={() => paginate(i + 1)}
                    isActive={currentPage === i + 1}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && paginate(currentPage + 1)}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </AdminLayout>
  );
}