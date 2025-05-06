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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Loader2, MoreHorizontal, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Product } from "@shared/schema";

export default function AdminProducts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch categories for filtering
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return await response.json();
    },
  });

  // Fetch products with filtering
  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = products ? products.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = products ? Math.ceil(products.length / itemsPerPage) : 0;

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <AdminLayout>
      <div className="flex flex-col space-y-6">
        {/* Header with title and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Products</h2>
            <p className="text-muted-foreground">
              Manage your product inventory and catalog
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Product</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new product.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Product form will be implemented in the next iteration.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Save Product</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product Grid */}
        {loadingProducts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentItems.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="aspect-[4/3] relative bg-muted">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground">
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
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-1">
                    <h3 className="font-medium leading-none">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {product.description?.substring(0, 60)}
                      {product.description && product.description.length > 60 ? "..." : ""}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <div className="font-semibold">
                      {formatCurrency(product.salePrice || product.price)}
                      {product.salePrice && (
                        <span className="text-sm line-through text-muted-foreground ml-1">
                          {formatCurrency(product.price)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Stock: {product.stock}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination className="mx-auto mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  onClick={() => currentPage > 1 && paginate(currentPage - 1)}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, index) => (
                <PaginationItem key={index + 1}>
                  <PaginationLink
                    isActive={currentPage === index + 1}
                    onClick={() => paginate(index + 1)}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  onClick={() => currentPage < totalPages && paginate(currentPage + 1)}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </AdminLayout>
  );
}