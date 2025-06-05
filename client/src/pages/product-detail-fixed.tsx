import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { Star, ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/use-cart';
import { formatCurrency } from '@/lib/utils';
import { calculateProductPricing } from '@/utils/pricing';
import { ensureValidImageUrl } from '@/utils/image-utils';
import ProductCard from '@/components/product/product-card';
import type { Product } from '@shared/schema';

// Component for product detail by ID
const ProductDetailById = () => {
  const [, params] = useRoute('/product/id/:id');
  const id = params?.id ? parseInt(params.id, 10) : undefined;
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  // Fetch product by ID
  const { 
    data: product, 
    isLoading: productLoading, 
    error: productError 
  } = useQuery<Product>({
    queryKey: [`/api/products/${id}`],
    enabled: !!id,
  });

  // Fetch active promotions
  const { data: promotionsResponse } = useQuery<any>({
    queryKey: ['/api/promotions/active-with-products'],
  });

  // Get promotional info for this specific product
  const effectivePromotionInfo = React.useMemo(() => {
    if (!promotionsResponse?.success || !product?.id) return null;
    
    for (const promo of promotionsResponse.data) {
      const productPromotion = promo.products?.find((pp: any) => pp.productId === product.id);
      if (productPromotion) {
        return {
          promotionName: promo.promotionName,
          promotionDiscount: productPromotion.additionalDiscountPercentage || promo.discountValue,
          promotionEndDate: promo.endDate,
          promotionalPrice: productPromotion.promotionalPrice ? Number(productPromotion.promotionalPrice) : null
        };
      }
    }
    return null;
  }, [promotionsResponse, product?.id]);

  // Calculate unified pricing using centralized logic
  const pricing = product ? calculateProductPricing(
    Number(product.price) || 0,
    product.salePrice ? Number(product.salePrice) : null,
    effectivePromotionInfo
  ) : null;

  // Debug promotional pricing
  console.log(`Product detail for product ${product?.id}:`, {
    productName: product?.name,
    basePrice: product?.price,
    salePrice: product?.salePrice,
    effectivePromotionInfo,
    pricing
  });

  // Get related products based on the same category
  const { data: relatedProducts } = useQuery<Product[]>({
    queryKey: ['/api/products/category', product?.categoryId, { limit: 5 }],
    enabled: !!product?.categoryId,
  });

  if (productLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (productError || !product) {
    return <div className="flex justify-center items-center min-h-screen">Product not found</div>;
  }

  const handleAddToCart = () => {
    // Use promotional price if available, otherwise fallback to sale price or regular price
    const cartPrice = pricing ? pricing.displayPrice : (product.salePrice || product.price);
    
    addItem({
      productId: product.id,
      quantity: quantity,
      itemPrice: cartPrice,
      attributeSelections: {}
    });
    
    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Product Image */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <img 
              src={ensureValidImageUrl(product.imageUrl)} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            
            {/* Star rating */}
            <div className="flex items-center mb-4">
              {Array(5).fill(0).map((_, i) => (
                <Star 
                  key={i} 
                  className={`h-5 w-5 ${
                    i < (product.rating || 0) 
                      ? 'text-yellow-400 fill-yellow-400' 
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-2 text-gray-600">
                ({product.reviewCount || 0} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline mb-6">
              <span className="text-3xl font-bold text-[#FF69B4]">
                {pricing ? formatCurrency(pricing.displayPrice) : formatCurrency(product.salePrice || product.price)}
              </span>
              {pricing?.hasDiscount && (
                <span className="text-gray-500 text-lg ml-2 line-through">
                  {formatCurrency(pricing.originalPrice)}
                </span>
              )}
              {effectivePromotionInfo && (
                <span className="ml-2 px-2 py-1 bg-red-500 text-white rounded-full text-sm font-bold">
                  EXTRA {pricing?.extraPromotionalDiscount || Math.round(parseFloat(effectivePromotionInfo.promotionDiscount))}% OFF!
                </span>
              )}
              {pricing?.hasDiscount && !effectivePromotionInfo && (
                <span className="ml-2 px-2 py-1 bg-[#FF69B4]/10 text-[#FF69B4] rounded-full text-sm">
                  {Math.round(pricing.discountPercentage)}% OFF
                </span>
              )}
            </div>

            {/* Promotional Badge */}
            {effectivePromotionInfo && (
              <div className="mb-4">
                <Badge variant="destructive" className="bg-red-500 text-white">
                  {effectivePromotionInfo.promotionName} - Limited Time!
                </Badge>
              </div>
            )}
          </div>

          {/* Quantity and Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <span className="font-medium">Quantity:</span>
              <div className="flex border rounded-md">
                <button
                  type="button"
                  className="px-3 py-1 border-r hover:bg-gray-50"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <span className="px-4 py-1 min-w-[60px] text-center">{quantity}</span>
                <button
                  type="button"
                  className="px-3 py-1 border-l hover:bg-gray-50"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>
            
            <Button 
              className="w-full bg-[#FF69B4] hover:bg-[#FF69B4]/90" 
              size="lg"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Cart
            </Button>
          </div>

          {/* Product Features */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-[#FF69B4]" />
              <span className="text-sm">Free Shipping</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-[#FF69B4]" />
              <span className="text-sm">Secure Payment</span>
            </div>
            <div className="flex items-center space-x-2">
              <RotateCcw className="h-5 w-5 text-[#FF69B4]" />
              <span className="text-sm">Easy Returns</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-[#FF69B4]" />
              <span className="text-sm">Fast Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Description */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Description</h2>
        <div className="prose max-w-none">
          <p className="text-gray-700 leading-relaxed">
            {product.description || 'No description available'}
          </p>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Related Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {relatedProducts.slice(0, 4).map((relatedProduct) => (
              <ProductCard 
                key={relatedProduct.id} 
                product={relatedProduct}
                promotions={promotionsResponse?.success ? promotionsResponse.data : []}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailById;