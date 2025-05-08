import React from 'react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/product/product-card';
import type { Product } from '@shared/schema';
import { StandardApiResponse } from '@/types/api';

interface ProductGridProps {
  /**
   * Products data response object with success flag and data array
   */
  productsResponse: StandardApiResponse<Product[], { total?: number, totalPages?: number }> | undefined;
  
  /**
   * Current selected page
   */
  currentPage: number;
  
  /**
   * Function to handle page change
   */
  onPageChange: (page: number) => void;
  
  /**
   * Whether products are still loading
   */
  isLoading?: boolean;
  
  /**
   * Whether to show "Add to Cart" button
   */
  showAddToCart?: boolean;
  
  /**
   * Whether to display products in a grid or list view
   */
  viewMode?: 'grid' | 'list';
  
  /**
   * Error handling callback
   */
  onError?: (error: Error) => void;
}

/**
 * A standardized product grid component that handles both grid and list views
 * along with consistent pagination controls using the StandardApiResponse format
 */
const ProductGrid: React.FC<ProductGridProps> = ({
  productsResponse,
  currentPage,
  onPageChange,
  isLoading = false,
  showAddToCart = true,
  viewMode = 'grid',
  onError
}) => {
  // Extract products and pagination data from standardized response
  const products = productsResponse?.success ? productsResponse.data : [];
  const totalPages = productsResponse?.meta?.totalPages || 1;
  
  // Handle loading state with skeleton UI
  if (isLoading) {
    return (
      <div className={
        viewMode === 'grid' 
          ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          : "space-y-4"
      }>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200"></div>
            <div className="p-3">
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // Handle empty state
  if (!products || products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h3 className="text-lg font-medium mb-2">No products found</h3>
        <p className="text-gray-600 mb-4">
          Try adjusting your search or filter criteria
        </p>
        <Button 
          variant="outline"
          className="border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white"
          onClick={() => onPageChange(1)}
        >
          Clear Filters
        </Button>
      </div>
    );
  }
  
  return (
    <>
      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              showAddToCart={showAddToCart}
            />
          ))}
        </div>
      ) : (
        // List View
        <div className="space-y-4">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-1/4">
                  <a href={`/product/${product.slug}`} className="block">
                    <img 
                      src={product.imageUrl || ''} 
                      alt={product.name} 
                      className="w-full h-56 sm:h-full object-cover"
                    />
                  </a>
                </div>
                <div className="p-4 flex-1">
                  <h3 className="text-lg font-medium">
                    <a href={`/product/${product.slug}`} className="hover:text-[#FF69B4]">
                      {product.name}
                    </a>
                  </h3>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="mb-4">
                    {product.salePrice ? (
                      <div className="flex items-center">
                        <span className="text-lg font-bold text-[#FF69B4]">
                          R{product.salePrice}
                        </span>
                        <span className="ml-2 text-gray-500 line-through text-sm">
                          R{product.price}
                        </span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold">
                        R{product.price}
                      </span>
                    )}
                  </div>
                  {showAddToCart && (
                    <Button 
                      size="sm" 
                      className="bg-[#FF69B4] hover:bg-[#FF1493]"
                    >
                      Add to Cart
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Standardized Pagination Controls */}
      <div className="flex justify-center mt-8">
        <Button 
          variant="outline"
          className="border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white mr-2"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        >
          Previous
        </Button>
        <span className="flex items-center mx-4 text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <Button 
          variant="outline"
          className="border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        >
          Next
        </Button>
      </div>
    </>
  );
};

export default ProductGrid;