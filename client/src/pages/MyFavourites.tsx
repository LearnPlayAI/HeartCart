import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Heart, ShoppingCart, Eye, Trash2, Search, Filter, SortAsc, SortDesc, Grid, List } from "lucide-react";
import { Link } from "wouter";
import { FavouriteHeart } from "@/components/FavouriteHeart";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState, useMemo } from "react";

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  imageUrl?: string;
  slug: string;
  brand?: string;
  isActive: boolean;
  categoryName?: string;
}

interface FavouriteWithProduct {
  id: number;
  userId: number;
  productId: number;
  createdAt: string;
  product: Product;
}

export default function MyFavourites() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  const { data: favouritesData, isLoading, error } = useQuery({
    queryKey: ['/api/favourites'],
    queryFn: () => apiRequest('/api/favourites?withProducts=true'),
  });

  const favourites = favouritesData?.data || [];

  // Filter and sort favourites
  const filteredAndSortedFavourites = useMemo(() => {
    let filtered = favourites.filter((fav: FavouriteWithProduct) => {
      const matchesSearch = fav.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (fav.product.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || fav.product.categoryName === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    // Sort favourites
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "name":
        filtered.sort((a, b) => a.product.name.localeCompare(b.product.name));
        break;
      case "price-low":
        filtered.sort((a, b) => parseFloat(a.product.price) - parseFloat(b.product.price));
        break;
      case "price-high":
        filtered.sort((a, b) => parseFloat(b.product.price) - parseFloat(a.product.price));
        break;
    }

    return filtered;
  }, [favourites, searchTerm, sortBy, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedFavourites.length / itemsPerPage);
  const paginatedFavourites = filteredAndSortedFavourites.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = favourites
      .map((fav: FavouriteWithProduct) => fav.product.categoryName)
      .filter((cat): cat is string => !!cat);
    return Array.from(new Set(cats));
  }, [favourites]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Heart className="h-8 w-8 text-pink-500" />
            My Favourites
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Card key={n} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Heart className="h-8 w-8 text-pink-500" />
            My Favourites
          </h1>
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-red-500 mb-4">
                <Trash2 className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Error Loading Favourites</h3>
              <p className="text-gray-600 mb-4">
                There was a problem loading your favourite products.
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (favourites.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Heart className="h-8 w-8 text-pink-500" />
            My Favourites
          </h1>
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-400 mb-4">
                <Heart className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Favourites Yet</h3>
              <p className="text-gray-600 mb-6">
                Start adding products to your favourites by clicking the heart icon on any product card.
              </p>
              <Link href="/products">
                <Button>
                  Browse Products
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Heart className="h-8 w-8 text-pink-500" />
            My Favourites
          </h1>
          <Badge variant="secondary" className="text-sm">
            {filteredAndSortedFavourites.length} of {favourites.length} {favourites.length === 1 ? 'item' : 'items'}
          </Badge>
        </div>

        {/* Enhanced Filters and Controls */}
        <div className="mb-6 space-y-4">
          {/* Search and View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search favourites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {sortBy.includes("price") ? <SortDesc className="h-4 w-4 text-gray-500" /> : <SortAsc className="h-4 w-4 text-gray-500" />}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results */}
        {filteredAndSortedFavourites.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-400 mb-4">
                <Heart className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No favourites found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || categoryFilter !== "all" 
                  ? "Try adjusting your search or filters"
                  : "Start adding products to your favourites to see them here"
                }
              </p>
              {(searchTerm || categoryFilter !== "all") && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className={`grid gap-6 ${
              viewMode === "grid" 
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                : "grid-cols-1"
            }`}>
              {paginatedFavourites.map((favourite: FavouriteWithProduct) => {
                const { product } = favourite;
                const imageUrl = product.imageUrl || '/api/placeholder/300/300';
                
                return (
              <Card key={favourite.id} className="group hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="relative mb-4">
                    <Link href={`/products/${product.slug}`}>
                      <div className="aspect-square relative overflow-hidden rounded-lg bg-gray-100">
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/api/placeholder/300/300';
                          }}
                        />
                        {!product.isActive && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <Badge variant="secondary">Unavailable</Badge>
                          </div>
                        )}
                      </div>
                    </Link>
                    
                    {/* Favourite Heart - positioned at top right */}
                    <div className="absolute top-2 right-2">
                      <FavouriteHeart
                        productId={product.id}
                        userId={1} // This should come from auth context
                        className="bg-white/80 backdrop-blur-sm"
                        size={18}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {product.brand && (
                      <Badge variant="outline" className="text-xs">
                        {product.brand}
                      </Badge>
                    )}
                    
                    <Link href={`/products/${product.slug}`}>
                      <h3 className="font-semibold text-sm line-clamp-2 hover:text-pink-600 transition-colors">
                        {product.name}
                      </h3>
                    </Link>

                    {product.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <span className="font-bold text-lg text-pink-600">
                        R{parseFloat(product.price).toFixed(2)}
                      </span>
                      
                      <div className="flex gap-2">
                        <Link href={`/products/${product.slug}`}>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        {product.isActive && (
                          <Button size="sm" className="h-8 w-8 p-0 bg-pink-600 hover:bg-pink-700">
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {product.categoryName && (
                      <div className="pt-1">
                        <Badge variant="secondary" className="text-xs">
                          {product.categoryName}
                        </Badge>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 pt-1">
                      Added {new Date(favourite.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}

            {/* Continue Shopping Section */}
            <div className="mt-12 text-center">
              <Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
                <CardContent className="py-8">
                  <h3 className="text-xl font-semibold mb-2">Keep Discovering</h3>
                  <p className="text-gray-600 mb-4">
                    Find more amazing products to add to your favourites.
                  </p>
                  <Link href="/products">
                    <Button className="bg-pink-600 hover:bg-pink-700">
                      Browse All Products
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}