import React, { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, StarHalf, Truck, Package, ShieldCheck, Heart, Share2, Minus, Plus } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, calculateDiscount } from '@/lib/utils';
import type { Product } from '@shared/schema';

const ProductDetail = () => {
  const [match, params] = useRoute('/product/:slug');
  const slug = params?.slug;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  
  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: [`/api/products/slug/${slug}`],
    enabled: !!slug,
  });
  
  // Get related products based on the same category
  const { data: relatedProducts } = useQuery<Product[]>({
    queryKey: ['/api/products/category', product?.categoryId, { limit: 5 }],
    enabled: !!product?.categoryId,
  });
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-200 animate-pulse h-80 rounded-lg"></div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 animate-pulse rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 animate-pulse rounded w-1/2"></div>
            <div className="h-6 bg-gray-200 animate-pulse rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
          </div>
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
  
  const discount = product.salePrice
    ? calculateDiscount(product.price, product.salePrice)
    : 0;
  
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > 0 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };
  
  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      product,
      quantity,
    });
    
    toast({
      title: "Added to cart",
      description: `${quantity} x ${product.name} has been added to your cart.`,
      duration: 2000,
    });
  };
  
  const renderStars = (rating: number | null = 0) => {
    const stars = [];
    const actualRating = rating || 0;
    const fullStars = Math.floor(actualRating);
    const hasHalfStar = actualRating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`star-${i}`} className="fill-yellow-400 text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(<StarHalf key="half-star" className="fill-yellow-400 text-yellow-400" />);
    }
    
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-star-${i}`} className="text-gray-300" />);
    }
    
    return stars;
  };
  
  return (
    <>
      <Helmet>
        <title>{product.name} - TEE ME YOU</title>
        <meta name="description" content={product.description || `Buy ${product.name} from local South African suppliers at TEE ME YOU.`} />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            <div className="mb-4 bg-white rounded-lg overflow-hidden border border-gray-200">
              <img 
                src={product.imageUrl || ''} 
                alt={product.name || 'Product image'} 
                className="w-full h-auto object-contain aspect-square"
              />
            </div>
            
            {product.additionalImages && product.additionalImages.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {product.additionalImages.map((image, index) => (
                  <div key={index} className="border border-gray-200 rounded-md overflow-hidden">
                    <img 
                      src={image} 
                      alt={`${product.name} - image ${index + 2}`} 
                      className="w-full h-auto object-cover aspect-square"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Product Information */}
          <div className="space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{product.name}</h1>
            
            {/* Ratings */}
            <div className="flex items-center">
              <div className="flex mr-2">
                {renderStars(product.rating)}
              </div>
              <span className="text-sm text-gray-500">
                {product.rating?.toFixed(1)} ({product.reviewCount} reviews)
              </span>
            </div>
            
            {/* Price */}
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-[#FF69B4]">
                {formatCurrency(product.salePrice || product.price)}
              </span>
              {product.salePrice && (
                <>
                  <span className="text-gray-500 text-lg ml-2 line-through">
                    {formatCurrency(product.price)}
                  </span>
                  <span className="ml-2 px-2 py-1 bg-[#FF69B4]/10 text-[#FF69B4] rounded-full text-sm">
                    {discount}% OFF
                  </span>
                </>
              )}
            </div>
            
            {/* Supplier */}
            {product.supplier && (
              <div className="text-sm text-gray-500">
                Supplier: <span className="font-medium">{product.supplier}</span>
              </div>
            )}
            
            <Separator className="my-4" />
            
            {/* Quantity Selector */}
            <div className="flex items-center">
              <span className="mr-4">Quantity:</span>
              <div className="flex items-center border border-gray-300 rounded">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="h-10 w-10"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="px-4">{quantity}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= 10}
                  className="h-10 w-10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="ml-4 text-sm text-gray-500">
                Available upon order
              </span>
            </div>
            
            {/* Add to Cart Button */}
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleAddToCart}
                className="flex-1 bg-[#FF69B4] hover:bg-[#FF1493] text-white"
                size="lg"
              >
                Add to Cart
              </Button>
              <Button variant="outline" size="icon" className="text-gray-500">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" className="text-gray-500">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Shipping Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center">
                <Truck className="text-[#FF69B4] mr-2 h-5 w-5" />
                <span className="text-sm">Fast Shipping</span>
              </div>
              <div className="flex items-center">
                <Package className="text-[#FF69B4] mr-2 h-5 w-5" />
                <span className="text-sm">Secure Packaging</span>
              </div>
              <div className="flex items-center">
                <ShieldCheck className="text-[#FF69B4] mr-2 h-5 w-5" />
                <span className="text-sm">Quality Guarantee</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Product Details Tabs */}
        <div className="mt-10">
          <Tabs defaultValue="description">
            <TabsList className="w-full justify-start border-b">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="specifications">Specifications</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="p-4">
              <div className="prose max-w-none">
                <p>{product.description || 'No description available for this product.'}</p>
              </div>
            </TabsContent>
            <TabsContent value="specifications" className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Brand</span>
                    <span>{product.supplier || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Category</span>
                    <span>Category Name</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Availability</span>
                    <span>Made to order</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="reviews" className="p-4">
              <div className="flex items-center mb-6">
                <div className="flex items-center mr-4">
                  <div className="text-4xl font-bold mr-2">{product.rating?.toFixed(1) || '0'}</div>
                  <div className="flex flex-col">
                    <div className="flex">
                      {renderStars(product.rating)}
                    </div>
                    <span className="text-sm text-gray-500">{product.reviewCount || 0} reviews</span>
                  </div>
                </div>
              </div>
              
              {/* Sample review - in a real app, you'd fetch reviews from API */}
              <div className="border-t border-gray-200 py-4">
                <div className="flex items-center mb-2">
                  <div className="flex mr-2">
                    {renderStars(5)}
                  </div>
                  <span className="font-medium">John D.</span>
                  <span className="text-sm text-gray-500 ml-2">2 weeks ago</span>
                </div>
                <p className="text-gray-700">
                  Great product! Exactly as described and arrived quickly. Would buy again.
                </p>
              </div>
              
              <div className="border-t border-gray-200 py-4">
                <div className="flex items-center mb-2">
                  <div className="flex mr-2">
                    {renderStars(4)}
                  </div>
                  <span className="font-medium">Mary S.</span>
                  <span className="text-sm text-gray-500 ml-2">1 month ago</span>
                </div>
                <p className="text-gray-700">
                  Good quality and value for money. Shipping was a bit slow but otherwise happy with my purchase.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-4">You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {relatedProducts
                .filter(p => p.id !== product.id)
                .slice(0, 5)
                .map(relatedProduct => (
                  <Link 
                    key={relatedProduct.id} 
                    href={`/product/${relatedProduct.slug}`}
                    className="product-card bg-white rounded-lg shadow-md overflow-hidden"
                  >
                    <img 
                      src={relatedProduct.imageUrl || ''} 
                      alt={relatedProduct.name || 'Product image'} 
                      className="w-full h-40 object-cover"
                    />
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-gray-800 mb-1 line-clamp-2">
                        {relatedProduct.name}
                      </h3>
                      <div className="flex items-baseline">
                        <span className="text-[#FF69B4] font-bold">
                          {formatCurrency(relatedProduct.salePrice || relatedProduct.price)}
                        </span>
                        {relatedProduct.salePrice && (
                          <span className="text-gray-500 text-xs ml-1 line-through">
                            {formatCurrency(relatedProduct.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductDetail;
