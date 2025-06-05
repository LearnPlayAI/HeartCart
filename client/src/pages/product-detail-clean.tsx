import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation, Link } from 'wouter';
import { Helmet } from 'react-helmet';
import { calculateProductPricing } from '@/utils/pricing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Heart, ShoppingCart, Star, Minus, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ProductCard from '@/components/product/product-card';
import type { Product } from '@shared/schema';

// Define clean interfaces
interface PromotionInfo {
  promotionName: string;
  promotionDiscount: number;
  promotionEndDate: string;
  promotionalPrice: number | null;
}

const ProductDetail = () => {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!id || isNaN(Number(id))) {
    setLocation('/');
    return null;
  }

  return <ProductDetailById productId={Number(id)} />;
};

const ProductDetailById = ({ productId }: { productId: number }) => {
  // Fetch product data
  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ['/api/products', productId],
  });

  // Fetch promotions data
  const { data: promotionsResponse } = useQuery<any>({
    queryKey: ['/api/promotions/active-with-products'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-4">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/">Go back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ProductDetailContent product={product} promotionsResponse={promotionsResponse} />;
};

const ProductDetailContent = ({ 
  product, 
  promotionsResponse 
}: { 
  product: Product; 
  promotionsResponse?: any;
}) => {
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract promotional info for this specific product
  const effectivePromotionInfo: PromotionInfo | null = React.useMemo(() => {
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
  const pricing = calculateProductPricing(
    Number(product.price) || 0,
    product.salePrice ? Number(product.salePrice) : null,
    effectivePromotionInfo || undefined
  );

  // Debug logging
  React.useEffect(() => {
    console.log('Product detail for product', product?.id + ':', {
      effectivePromotionInfo,
      pricing
    });
  }, [product?.id, effectivePromotionInfo, pricing]);

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          itemPrice: pricing.displayPrice
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add item to cart');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Get related products
  const { data: relatedProducts } = useQuery<Product[]>({
    queryKey: ['/api/products/category', product?.categoryId, { limit: 5 }],
    enabled: !!product?.categoryId,
  });

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > 0 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    addToCartMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{product.name ? `${product.name} - TeeMeYou` : 'Product - TeeMeYou'}</title>
        <meta name="description" content={product.description || (product.name ? `${product.name} - Available at TeeMeYou` : 'Product available at TeeMeYou')} />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg shadow-sm border overflow-hidden">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-gray-400 text-lg">No Image</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              {product.brand && (
                <p className="text-lg text-gray-600 mb-4">by {product.brand}</p>
              )}
              
              {/* Promotional badges */}
              {effectivePromotionInfo && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="destructive" className="text-white font-semibold">
                    {effectivePromotionInfo.promotionName}
                  </Badge>
                  {effectivePromotionInfo.promotionDiscount > 0 && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      EXTRA {effectivePromotionInfo.promotionDiscount}% OFF!
                    </Badge>
                  )}
                </div>
              )}

              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-green-600">
                    R{pricing.displayPrice.toFixed(2)}
                  </span>
                  {pricing.hasDiscount && (
                    <>
                      <span className="text-xl text-gray-500 line-through">
                        R{pricing.originalPrice.toFixed(2)}
                      </span>
                      <Badge variant="destructive">
                        {pricing.discountPercentage}% OFF
                      </Badge>
                    </>
                  )}
                </div>
                {pricing.extraPromotionalDiscount > 0 && (
                  <p className="text-sm text-orange-600 font-medium">
                    Extra promotional discount: {pricing.extraPromotionalDiscount}%
                  </p>
                )}
              </div>
            </div>

            {product.description && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            <Separator />

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-medium">Quantity:</span>
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={handleAddToCart}
                  disabled={addToCartMutation.isPending}
                  className="flex-1"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
                </Button>
                <Button variant="outline" size="icon">
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Product Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {product.sku && (
                <div>
                  <span className="font-medium">SKU:</span>
                  <span className="ml-2 text-gray-600">{product.sku}</span>
                </div>
              )}
              <div>
                <span className="font-medium">Availability:</span>
                <span className={`ml-2 ${product.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {product.isActive ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.slice(0, 4).map((relatedProduct) => (
                <ProductCard 
                  key={relatedProduct.id} 
                  product={relatedProduct}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;