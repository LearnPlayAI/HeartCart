import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search as SearchIcon, Filter } from 'lucide-react';
import ProductCard from '@/components/product/product-card';
import ProductSearch from '@/components/ui/product-search';
import type { Product } from '@shared/schema';
import type { StandardApiResponse } from '@/types/api';

const SearchResults = () => {
  const [location] = useLocation();
  
  // Get query from URL using both location and window.location
  const urlSearchParams = new URLSearchParams(window.location.search);
  const query = urlSearchParams.get('q') || '';
  
  console.log('Search page - location:', location);
  console.log('Search page - window.location.search:', window.location.search);
  console.log('Search page - query:', query);
  const [sortBy, setSortBy] = useState('default');
  const [page, setPage] = useState(1);
  const limit = 20;
  
  const { 
    data: response,
    isLoading, 
    isFetching,
    error
  } = useQuery<StandardApiResponse<Product[]>>({
    queryKey: ['/api/search', query, page, limit],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      const searchParams = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      const response = await fetch(`/api/search?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to search products');
      }
      return response.json();
    },
    enabled: query.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
  
  // Extract products from standardized API response
  const products = response?.success ? response.data : [];
  
  // Fetch active promotions to check if search results include promotional products
  const { data: promotionsResponse } = useQuery<StandardApiResponse<any[]>>({
    queryKey: ['/api/promotions/active-with-products'],
  });
  
  // Create a map of product promotions for quick lookup
  const activePromotions = promotionsResponse?.success ? promotionsResponse.data : [];
  const productPromotions = new Map();
  
  activePromotions?.forEach(promo => {
    promo.products?.forEach((pp: any) => {
      productPromotions.set(pp.productId, {
        promotionName: promo.promotionName,
        promotionDiscount: pp.discountOverride || promo.discountValue,
        promotionDiscountType: promo.discountType,
        promotionEndDate: promo.endDate,
        promotionalPrice: pp.promotionalPrice ? Number(pp.promotionalPrice) : null
      });
    });
  });
  
  // Reset page when query changes
  useEffect(() => {
    setPage(1);
  }, [query]);
  
  const handleSortChange = (value: string) => {
    setSortBy(value);
  };
  
  const loadMore = () => {
    setPage(prev => prev + 1);
  };
  
  // Apply sorting to products
  const sortedProducts = products ? [...products].sort((a, b) => {
    const priceA = a.salePrice || a.price;
    const priceB = b.salePrice || b.price;
    
    switch (sortBy) {
      case 'price-asc':
        return priceA - priceB;
      case 'price-desc':
        return priceB - priceA;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'rating-desc':
        return (b.rating || 0) - (a.rating || 0);
      default:
        return 0;
    }
  }) : [];
  
  return (
    <>
      <Helmet>
        <title>Search Results for "{query}" - TEE ME YOU</title>
        <meta name="description" content={`Search results for "${query}". Find South African products at unbeatable prices.`} />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        {/* Search Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Search Results for "{query}"
          </h1>
          <p className="text-gray-600">
            {isLoading ? 'Searching...' : `Found ${products?.length || 0} results`}
          </p>
        </div>
        
        {/* Show error if there is one */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {response?.error?.message || 'An error occurred while searching for products. Please try again.'}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Refined search bar */}
        <div className="mb-6">
          <ProductSearch 
            size="md"
            variant="outlined"
            initialQuery={query}
            placeholder="Refine your search..."
            className="mb-3"
          />
        </div>
        
        {/* Sort Options */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <SearchIcon className="h-5 w-5 text-gray-500 mr-2" />
            <span className="text-gray-500">Results for <span className="font-medium">"{query}"</span></span>
          </div>
          
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="name-asc">Name: A to Z</SelectItem>
              <SelectItem value="name-desc">Name: Z to A</SelectItem>
              <SelectItem value="rating-desc">Highest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Search Results */}
        {isLoading ? (
          <div className="space-y-6">
            {/* Prominent Loading Indicator */}
            <div className="flex items-center justify-center py-12 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border-2 border-dashed border-pink-200">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-200"></div>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent absolute top-0 left-0"></div>
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-gray-800">Searching for "{query}"</p>
                  <p className="text-gray-600 mt-1">Finding the best products for you...</p>
                </div>
              </div>
            </div>
            
            {/* Loading Skeleton Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-3">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-full mt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-medium mb-2">Error performing search</h2>
              <p className="text-gray-600 mb-6 text-center">
                We encountered an error while searching for products.<br />
                Please try again or browse our categories.
              </p>
              <Button asChild>
                <Link href="/">
                  Continue Shopping
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : sortedProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {sortedProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showAddToCart={true}
                  promotionInfo={productPromotions.get(product.id)}
                />
              ))}
            </div>
            
            {products && products.length >= limit && (
              <div className="flex justify-center mt-8">
                <Button 
                  variant="outline"
                  className="border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white"
                  onClick={loadMore}
                  disabled={isFetching}
                >
                  {isFetching ? 'Loading...' : 'Load More Results'}
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <SearchIcon className="h-12 w-12 text-gray-300 mb-4" />
              <h2 className="text-xl font-medium mb-2">No results found</h2>
              <p className="text-gray-600 mb-6 text-center">
                We couldn't find any products matching "{query}".<br />
                Try using different keywords or browse our categories.
              </p>
              <Button asChild>
                <Link href="/">
                  Continue Shopping
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default SearchResults;
