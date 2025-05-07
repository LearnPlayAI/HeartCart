import React, { useState } from 'react';
import { Link } from 'wouter';
import { Star, StarHalf, Eye, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { formatCurrency, calculateDiscount } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import QuickViewModal from './quick-view-modal';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@shared/schema';

type ProductCardProps = {
  product: Product;
  isFlashDeal?: boolean;
  soldPercentage?: number;
  showAddToCart?: boolean;
};

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFlashDeal = false,
  soldPercentage,
  showAddToCart = false,
}) => {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  
  const discount = product.salePrice
    ? calculateDiscount(product.price, product.salePrice)
    : 0;
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addItem({
      productId: product.id,
      product,
      quantity: 1
    });
    
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
      duration: 2000,
    });
  };
  
  const renderStars = (rating: number | null = 0) => {
    const stars = [];
    const actualRating = rating || 0;
    const fullStars = Math.floor(actualRating);
    const hasHalfStar = actualRating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`star-${i}`} className="fill-yellow-400 text-yellow-400 w-3 h-3" />);
    }
    
    if (hasHalfStar) {
      stars.push(<StarHalf key="half-star" className="fill-yellow-400 text-yellow-400 w-3 h-3" />);
    }
    
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-star-${i}`} className="text-yellow-400 w-3 h-3" />);
    }
    
    return stars;
  };
  
  if (isFlashDeal) {
    return (
      <div className="product-card bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Link href={`/product/${product.slug}`} className="block">
          <img 
            src={product.imageUrl || ''} 
            alt={product.name || 'Product image'} 
            className="w-full h-36 object-cover"
          />
          <div className="p-2">
            <div className="flex items-center mb-1">
              <span className="bg-[#FF69B4] text-white text-xs font-bold px-2 py-0.5 rounded">
                -{discount}%
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-800 line-clamp-2 h-10">
              {product.name}
            </h3>
            <div className="flex items-baseline mt-1">
              <span className="text-[#FF69B4] font-bold">
                {formatCurrency(product.salePrice || product.price)}
              </span>
              {product.salePrice && (
                <span className="text-gray-500 text-xs ml-1 line-through">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>
            {typeof soldPercentage === 'number' && (
              <>
                <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#FF69B4] h-full rounded-full pulse-animation"
                    style={{ width: `${soldPercentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {soldPercentage}% sold
                </div>
              </>
            )}
          </div>
        </Link>
        
        <div className="px-2 pb-2">
          <Button
            variant="outline"
            size="sm" 
            className="w-full rounded-full text-xs py-1"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuickViewOpen(true);
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            Quick View
          </Button>
        </div>
        
        {/* Quick View Modal */}
        <QuickViewModal
          open={quickViewOpen}
          onOpenChange={setQuickViewOpen}
          productSlug={product.slug || ''}
        />
      </div>
    );
  }
  
  return (
    <div className="product-card bg-white rounded-lg shadow-md overflow-hidden">
      <Link href={`/product/${product.slug}`} className="block">
        <img 
          src={product.imageUrl || ''} 
          alt={product.name || 'Product image'} 
          className="w-full h-48 object-cover"
        />
        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-800 mb-1 line-clamp-2 h-10">
            {product.name}
          </h3>
          <div className="flex items-center mb-1">
            <div className="flex text-yellow-400 text-xs mr-1">
              {renderStars(product.rating)}
            </div>
            <span className="text-xs text-gray-500">
              {product.rating?.toFixed(1)} ({product.reviewCount})
            </span>
          </div>
          <div className="flex items-baseline">
            <span className="text-[#FF69B4] font-bold">
              {formatCurrency(product.salePrice || product.price)}
            </span>
            {product.salePrice && (
              <>
                <span className="text-gray-500 text-xs ml-1 line-through">
                  {formatCurrency(product.price)}
                </span>
                <span className="ml-1 text-xs bg-[#FF69B4]/10 text-[#FF69B4] px-1 rounded">
                  -{discount}%
                </span>
              </>
            )}
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3 mt-2 flex gap-2">
        {showAddToCart && (
          <Button 
            className="flex-1 bg-[#FF69B4] hover:bg-[#FF1493] text-white py-1.5 rounded-full text-sm font-medium transition-colors duration-200"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Add to Cart
          </Button>
        )}
        
        <Button
          variant="outline"
          className="rounded-full flex-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setQuickViewOpen(true);
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          Quick View
        </Button>
      </div>
      
      {/* Quick View Modal */}
      <QuickViewModal
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        productSlug={product.slug || ''}
      />
    </div>
  );
};

export default ProductCard;
