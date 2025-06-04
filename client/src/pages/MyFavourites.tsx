import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Eye, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { FavouriteHeart } from "@/components/FavouriteHeart";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

  const { data: favouritesData, isLoading, error } = useQuery({
    queryKey: ['/api/favourites'],
    queryFn: () => apiRequest('/api/favourites?withProducts=true'),
  });

  const favourites = favouritesData?.data?.favourites || [];

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
            {favourites.length} {favourites.length === 1 ? 'item' : 'items'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favourites.map((favourite: FavouriteWithProduct) => {
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
      </div>
    </div>
  );
}