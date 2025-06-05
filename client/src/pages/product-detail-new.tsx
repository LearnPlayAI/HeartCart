import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { calculateProductPricing, type PromotionInfo } from '@/utils/pricing';
import { Heart, Star, Plus, Minus, ShoppingCart, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription?: string;
  price: number;
  salePrice?: number;
  imageUrl: string;
  categoryId: number;
  stockQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  weight?: number;
  dimensions?: string;
  tags?: string;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
  images?: string[];
}

interface ProductAttribute {
  id: number;
  name: string;
  displayName: string;
  attributeType: string;
  isRequired: boolean;
  options: { id: number; value: string; displayValue: string; }[];
}

export default function ProductDetailNew() {
  const { slug } = useParams<{ slug: string }>();
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, any>>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { addItem } = useCart();
  const { toast } = useToast();

  // Fetch product by slug
  const { 
    data: product, 
    isLoading, 
    error 
  } = useQuery<Product>({
    queryKey: [`/api/products/slug/${slug}`],
    enabled: !!slug,
  });

  // Fetch active promotions
  const { data: promotionsResponse } = useQuery<any>({
    queryKey: ['/api/promotions/active-with-products'],
    enabled: !!product?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch product attributes
  const { data: attributesResponse } = useQuery<any>({
    queryKey: [`/api/product-attributes/product/${product?.id}/attributes`],
    enabled: !!product?.id,
  });

  // Find if this product is in any active promotion
  const activePromotions = promotionsResponse?.success ? promotionsResponse.data : [];
  const productPromotion = activePromotions
    ?.find((promo: any) => 
      promo.products?.some((p: any) => p.productId === product?.id)
    );

  // Calculate promotion info
  const promotionInfo: PromotionInfo | undefined = productPromotion ? {
    promotionName: productPromotion.name,
    promotionDiscount: productPromotion.discountPercentage,
    promotionDiscountType: productPromotion.discountType,
    promotionEndDate: productPromotion.endDate,
    promotionalPrice: product ? Math.round(product.price * (1 - productPromotion.discountPercentage / 100)) : null,
  } : undefined;

  // Calculate pricing
  const pricing = product ? calculateProductPricing(
    product.price,
    product.salePrice,
    promotionInfo
  ) : null;

  const attributes = attributesResponse?.success ? attributesResponse.data : [];

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= (product?.stockQuantity || 0)) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (!product || !pricing) return;

    addItem({
      userId: 1, // This will be populated by the server based on session
      productId: product.id,
      quantity,
      attributeSelections: selectedAttributes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleAttributeChange = (attributeName: string, value: any) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600">The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const productImages = product.images && product.images.length > 0 ? product.images : [product.imageUrl];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Product Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative cursor-pointer group">
                      <img
                        src={productImages[selectedImageIndex]}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                        <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <img
                      src={productImages[selectedImageIndex]}
                      alt={product.name}
                      className="w-full h-auto max-h-[80vh] object-contain"
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {/* Thumbnail Images */}
              {productImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {productImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImageIndex === index
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              {/* Title and Price */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                <p className="text-sm text-gray-500 mb-4">SKU: {product.sku}</p>
                
                {/* Pricing with Promotional Badges */}
                <div className="space-y-2">
                  {pricing && (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-gray-900">
                          R{pricing.displayPrice.toFixed(2)}
                        </span>
                        {pricing.hasDiscount && (
                          <span className="text-xl text-gray-500 line-through">
                            R{pricing.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      
                      {/* Promotional Badges */}
                      {(pricing.extraPromotionalDiscount || 0) > 0 && promotionInfo && (
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1">
                            EXTRA {pricing.extraPromotionalDiscount}% OFF!
                          </Badge>
                          <Badge variant="outline" className="border-red-500 text-red-600">
                            {promotionInfo.promotionName}
                          </Badge>
                        </div>
                      )}
                      
                      {pricing.hasDiscount && pricing.extraPromotionalDiscount === 0 && (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white">
                          {pricing.discountPercentage}% OFF
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Stock Status */}
              <div>
                {product.stockQuantity > 0 ? (
                  <Badge className="bg-green-100 text-green-800">
                    {product.stockQuantity} in stock
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">Out of stock</Badge>
                )}
              </div>

              {/* Short Description */}
              {product.shortDescription && (
                <div>
                  <p className="text-gray-600 leading-relaxed">{product.shortDescription}</p>
                </div>
              )}

              {/* Product Attributes */}
              {attributes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Options</h3>
                  {attributes.map((attr: ProductAttribute) => (
                    <div key={attr.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {attr.displayName}
                        {attr.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {attr.options?.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleAttributeChange(attr.name, option.value)}
                            className={`px-3 py-2 border rounded-md text-sm transition-colors ${
                              selectedAttributes[attr.name] === option.value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {option.displayValue}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity and Add to Cart */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                    >
                      <Minus size={16} />
                    </Button>
                    <span className="px-4 py-2 border border-gray-300 rounded-md text-center min-w-[80px]">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= (product.stockQuantity || 0)}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={handleAddToCart}
                    disabled={product.stockQuantity === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <ShoppingCart size={20} className="mr-2" />
                    Add to Cart
                  </Button>
                  <Button variant="outline" size="icon">
                    <Heart size={20} />
                  </Button>
                </div>
              </div>

              {/* Product Rating */}
              <div className="flex items-center space-x-2">
                <div className="flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={16} fill="currentColor" />
                  ))}
                </div>
                <span className="text-sm text-gray-600">(4.8 out of 5)</span>
              </div>
            </div>
          </div>

          {/* Product Description */}
          <Separator />
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
            <div className="prose max-w-none text-gray-600 leading-relaxed">
              {product.description ? product.description.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 last:mb-0">
                  {paragraph}
                </p>
              )) : (
                <p>No description available.</p>
              )}
            </div>
          </div>

          {/* Additional Product Info */}
          <Separator />
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {product.weight && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Weight</h3>
                  <p className="text-gray-600">{product.weight}g</p>
                </div>
              )}
              {product.dimensions && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Dimensions</h3>
                  <p className="text-gray-600">{product.dimensions}</p>
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Category</h3>
                <p className="text-gray-600">Category ID: {product.categoryId}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}