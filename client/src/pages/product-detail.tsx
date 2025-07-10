import React, { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, StarHalf, Truck, Package, ShieldCheck, Heart, Share2, Minus, Plus, ChevronDown, ChevronRight, Clock, Shield, Palette } from 'lucide-react';
import ProductCard from '@/components/product/product-card';
import ShareProductDialog from '@/components/ShareProductDialog';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, calculateDiscount } from '@/lib/utils';
import { calculateProductPricing, getCartPrice } from '@/utils/pricing';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { 
  Product
} from '@shared/schema';


// This is a wrapper component that determines which path is matched and renders
// the actual ProductDetail component with the right identifier
const ProductDetail = () => {
  // Check which route matches
  const [matchSlug] = useRoute('/product/:slug');
  const [matchId] = useRoute('/product/id/:id');
  
  // If ID route matches, use ProductDetailById
  if (matchId) {
    return <ProductDetailById />;
  }
  
  // Otherwise use ProductDetailBySlug
  return <ProductDetailBySlug />;
};

// Component for product detail by slug
const ProductDetailBySlug = () => {
  const [, params] = useRoute('/product/:slug');
  const slug = params?.slug;
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState<{[key: number]: string}>({});
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [selectedCombination, setSelectedCombination] = useState<ProductAttributeCombination | null>(null);
  
  // Fetch product by slug
  const { 
    data: product, 
    isLoading, 
    error 
  } = useQuery<Product>({
    queryKey: [`/api/products/slug/${slug}`],
    enabled: !!slug,
  });
  
  return (
    <ProductDetailContent 
      product={product}
      isLoading={isLoading}
      error={error}
      quantity={quantity}
      setQuantity={setQuantity}
      selectedAttributes={selectedAttributes}
      setSelectedAttributes={setSelectedAttributes}
      currentPrice={currentPrice}
      setCurrentPrice={setCurrentPrice}
      selectedCombination={selectedCombination}
      setSelectedCombination={setSelectedCombination}
      addToCart={addItem}
      toast={toast}
      queryClient={queryClient}
    />
  );
};

// Component for product detail by ID
const ProductDetailById = () => {
  const [, params] = useRoute('/product/id/:id');
  const id = params?.id ? parseInt(params.id, 10) : undefined;
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState<{[key: number]: string}>({});
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [selectedCombination, setSelectedCombination] = useState<ProductAttributeCombination | null>(null);
  
  // Fetch product by ID
  const { 
    data: product, 
    isLoading, 
    error 
  } = useQuery<Product>({
    queryKey: [`/api/products/${id}`],
    enabled: !!id,
  });

  // Fetch active promotions
  const { data: promotionsData } = useQuery({
    queryKey: ['/api/promotions/active-with-products'],
  });
  
  return (
    <ProductDetailContent 
      product={product}
      isLoading={isLoading}
      error={error}
      quantity={quantity}
      setQuantity={setQuantity}
      selectedAttributes={selectedAttributes}
      setSelectedAttributes={setSelectedAttributes}
      currentPrice={currentPrice}
      setCurrentPrice={setCurrentPrice}
      selectedCombination={selectedCombination}
      setSelectedCombination={setSelectedCombination}
      addToCart={addItem}
      toast={toast}
      queryClient={queryClient}
    />
  );
};

// Common component that renders the actual product detail content
const ProductDetailContent = ({ 
  product,
  isLoading,
  error,
  quantity,
  setQuantity,
  selectedAttributes,
  setSelectedAttributes,
  currentPrice,
  setCurrentPrice,
  selectedCombination,
  setSelectedCombination,
  addToCart,
  toast,
  queryClient
}: {
  product: Product | undefined;
  isLoading: boolean;
  error: Error | null;
  quantity: number;
  setQuantity: (quantity: number) => void;
  selectedAttributes: {[key: number]: string};
  setSelectedAttributes: React.Dispatch<React.SetStateAction<{[key: number]: string}>>;
  currentPrice: number | null;
  setCurrentPrice: React.Dispatch<React.SetStateAction<number | null>>;
  selectedCombination: ProductAttributeCombination | null;
  setSelectedCombination: React.Dispatch<React.SetStateAction<ProductAttributeCombination | null>>;
  addToCart: (item: any) => void;
  toast: any;
  queryClient: any;
}) => {
  
  // Use server-calculated pricing directly (no client-side promotional data fetching needed)
  const promotionInfo = product?.promotionInfo || null;
  const serverPricing = product?.serverPricing || null;

  // Calculate unified pricing using server data or fallback to client calculation
  const pricing = serverPricing ? {
    displayPrice: serverPricing.displayPrice,
    originalPrice: serverPricing.originalPrice,
    salePrice: serverPricing.salePrice,
    hasDiscount: serverPricing.hasPromotion || (serverPricing.salePrice && serverPricing.salePrice < serverPricing.originalPrice),
    discountPercentage: serverPricing.hasPromotion ? 
      Math.round(((serverPricing.originalPrice - serverPricing.displayPrice) / serverPricing.originalPrice) * 100) :
      (serverPricing.salePrice ? Math.round(((serverPricing.originalPrice - serverPricing.salePrice) / serverPricing.originalPrice) * 100) : 0),
    promotionPrice: serverPricing.hasPromotion ? serverPricing.displayPrice : null,
    extraPromotionalDiscount: serverPricing.promotionDiscount || 0
  } : (product ? calculateProductPricing(
    Number(product.price) || 0,
    product.salePrice ? Number(product.salePrice) : null,
    promotionInfo
  ) : null);

  // Debug: Log the server pricing for the specific product
  if (product?.id === 642) {
    console.log('🔍 Product 642 Debug - Server Pricing:', serverPricing);
    console.log('🔍 Product 642 Debug - Promotion Info:', promotionInfo);
    console.log('🔍 Product 642 Debug - Final Pricing:', pricing);
  }



  // Get related products based on the same category
  const { data: relatedProducts } = useQuery<Product[]>({
    queryKey: ['/api/products/category', product?.categoryId, { limit: 5 }],
    enabled: !!product?.categoryId,
  });
  
  // Get category attributes
  const { data: categoryAttributes } = useQuery<CategoryAttribute[]>({
    queryKey: ['/api/category-attributes', product?.categoryId],
    enabled: !!product?.categoryId,
  });
  
  // Get attribute options for each attribute
  const { data: productAttributes } = useQuery<{[key: number]: CategoryAttributeOption[]}>({
    queryKey: ['/api/products', product?.id, 'attributes'],
    enabled: !!product?.id,
  });
  
  // Get product attribute combinations
  const { data: combinations } = useQuery<ProductAttributeCombination[]>({
    queryKey: ['/api/products', product?.id, 'combinations'],
    enabled: !!product?.id,
  });
  
  // Get product global attributes with proper error and debug handling
  const { 
    data: globalAttributes = [],
    error: globalAttributesError,
    isLoading: globalAttributesLoading
  } = useQuery<ProductGlobalAttributeResponse[]>({
    // Use the same query key structure as other queries
    queryKey: ['/api/products', product?.id, 'global-attributes'],
    enabled: !!product?.id,
    // Use a custom query function to debug the response
    queryFn: async () => {
      console.log('DEBUG: Fetching global attributes for product id:', product?.id);
      
      // Make a direct fetch request to the correct endpoint
      try {
        const res = await fetch(`/api/products/${product?.id}/global-attributes`);
        const resText = await res.text();
        
        if (!res.ok) {
          console.error('Error fetching global attributes:', res.status, res.statusText);
          console.error('Error response:', resText);
          return [];
        }
        
        // Try to parse as JSON
        try {
          const data = JSON.parse(resText);
          console.log('DEBUG: Global attributes response:', data);
          return data;
        } catch (parseError) {
          console.error('Failed to parse global attributes response:', parseError);
          console.error('Raw response:', resText);
          return [];
        }
      } catch (fetchError) {
        console.error('Fetch error for global attributes:', fetchError);
        return [];
      }
    }
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
  

  
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > 0 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };
  
  // Effect to update price when a valid attribute combination is selected
  useEffect(() => {
    if (!product) return;
    
    // Check if all attributes have been selected
    const allSelected = categoryAttributes?.every(attr => selectedAttributes[attr.id]) || false;
    
    if (allSelected && categoryAttributes && categoryAttributes.length > 0) {
      // Create a combination hash from selected attributes
      const combinationParts = Object.entries(selectedAttributes)
        .map(([attrId, value]) => `${attrId}:${value}`)
        .sort()
        .join('|');
      
      // Find matching combination
      const matchingCombination = combinations?.find(c => c.combinationHash === combinationParts);
      
      if (matchingCombination) {
        // Calculate adjusted price
        const basePrice = product.salePrice || product.price;
        const priceAdjustment = matchingCombination.priceAdjustment ? Number(matchingCombination.priceAdjustment) : 0;
        const adjustedPrice = Number(basePrice) + priceAdjustment;
        
        setCurrentPrice(adjustedPrice);
        setSelectedCombination(matchingCombination);
      } else {
        setCurrentPrice(null);
        setSelectedCombination(null);
      }
    } else {
      setCurrentPrice(null);
      setSelectedCombination(null);
    }
  }, [selectedAttributes, combinations, product?.id, categoryAttributes?.length]);
  
  const handleAttributeChange = (attributeId: number, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeId]: value
    }));
  };
  
  const handleAddToCart = () => {
    // Check if we have global attributes that need to be selected
    const hasRequiredGlobalAttributes = globalAttributes && globalAttributes.length > 0;
    
    // Verify all global attributes are selected
    const allGlobalAttributesSelected = 
      !hasRequiredGlobalAttributes || 
      globalAttributes.every(attr => selectedAttributes[attr.attribute.id]);
    
    if (hasRequiredGlobalAttributes && !allGlobalAttributesSelected) {
      // Show toast message about required global attributes
      toast({
        title: "Selection required",
        description: "Please select all product options before adding to cart.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Build cart attributes in cart-friendly format
    const cartGlobalAttributes: CartGlobalAttribute[] = hasRequiredGlobalAttributes 
      ? globalAttributes.map(attrItem => {
          const { attribute, options } = attrItem;
          const selectedValue = selectedAttributes[attribute.id];
          const selectedOption = options.find((opt: GlobalAttributeOption) => opt.value === selectedValue);
          
          return {
            id: attribute.id,
            name: attribute.name,
            displayName: attribute.displayName || attribute.name,
            value: selectedValue,
            displayValue: selectedOption?.displayValue || selectedValue
          };
        }) 
      : [];
    
    // Format attribute selections for the cart (convert from ID-based to name-based)
    const attributeSelections: Record<string, string> = {};
    if (hasRequiredGlobalAttributes) {
      globalAttributes.forEach(attrItem => {
        const { attribute } = attrItem;
        const selectedValue = selectedAttributes[attribute.id];
        if (selectedValue) {
          const attributeName = attribute.displayName || attribute.name;
          attributeSelections[attributeName] = selectedValue;
        }
      });
    }
    
    // Use server-calculated pricing for correct promotional prices
    const itemPrice = pricing ? pricing.displayPrice : (currentPrice || product.salePrice || product.price);
    
    // Add item to cart with correct field names matching cart hook expectations
    addToCart({
      productId: product.id,
      quantity,
      itemPrice: itemPrice,
      attributeSelections
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-[#FF69B4]">
                  {pricing ? formatCurrency(pricing.displayPrice) : formatCurrency(currentPrice || product.salePrice || product.price)}
                </span>
                {pricing?.hasDiscount && (
                  <span className="text-gray-500 text-lg ml-2 line-through">
                    {formatCurrency(pricing.originalPrice)}
                  </span>
                )}
              </div>
              {promotionInfo && (
                <div className="flex items-center gap-2">
                  <div className="bg-red-500 text-white px-2 py-1 text-xs font-bold rounded-full shadow-lg">
                    EXTRA {pricing?.extraPromotionalDiscount || Math.round(parseFloat(promotionInfo.promotionDiscount))}% OFF!
                  </div>
                  <span className="text-xs text-gray-600">{promotionInfo.promotionName}</span>
                </div>
              )}
              {pricing?.hasDiscount && !promotionInfo && (
                <span className="ml-2 px-2 py-1 bg-[#FF69B4]/10 text-[#FF69B4] rounded-full text-sm">
                  {Math.round(pricing.discountPercentage)}% OFF
                </span>
              )}
            </div>
            
            {/* Separator between price and product options */}
            <Separator className="my-4" />
            
            {/* Global Attribute Selection */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold">Product Options</h3>
              
              {globalAttributesLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-1/3 mb-2"></div>
                  <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
                </div>
              ) : globalAttributesError ? (
                <div className="text-sm text-red-500">
                  Error loading product options. Please try refreshing the page.
                </div>
              ) : globalAttributes && globalAttributes.length > 0 ? (
                globalAttributes.map((productAttr: ProductGlobalAttributeResponse) => {
                  console.log('Rendering attribute:', productAttr);
                  
                  // These are properly typed now
                  const { attribute, options } = productAttr;
                  
                  return (
                    <div key={productAttr.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-medium text-sm">{attribute.displayName || attribute.name}</label>
                        
                        {selectedAttributes[attribute.id] && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="ml-2">
                                  {selectedAttributes[attribute.id]}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Selected value</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      
                      <Select 
                        value={selectedAttributes[attribute.id] || ''}
                        onValueChange={(value: string) => handleAttributeChange(attribute.id, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={`Select ${attribute.displayName || attribute.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((option: GlobalAttributeOption) => (
                            <SelectItem key={option.id} value={option.value}>
                              {option.displayValue || option.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500">
                  No product options available for this item.
                </div>
              )}
            </div>
            
            {/* Category Attribute Selection */}
            {categoryAttributes && categoryAttributes.length > 0 && productAttributes && (
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold">Options</h3>
                
                {categoryAttributes.map(attribute => (
                  <div key={attribute.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-sm">{attribute.name}</label>
                      
                      {selectedAttributes[attribute.id] && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="ml-2">
                                {selectedAttributes[attribute.id]}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Selected value</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    
                    <Select 
                      value={selectedAttributes[attribute.id] || ''}
                      onValueChange={value => handleAttributeChange(attribute.id, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={`Select ${attribute.name}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {productAttributes[attribute.id]?.map(option => (
                          <SelectItem key={option.id} value={option.value}>
                            {option.displayValue || option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                
                {currentPrice !== null && currentPrice !== (product.salePrice || product.price) && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">Price with selected options:</span>
                      <span className="font-bold text-green-700">{formatCurrency(currentPrice)}</span>
                    </div>
                    
                    {selectedCombination && typeof selectedCombination.priceAdjustment === 'number' && selectedCombination.priceAdjustment > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        Includes {formatCurrency(Number(selectedCombination.priceAdjustment))} for selected options
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            
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
              <ShareProductDialog
                productId={product.id}
                productTitle={product.name}
                productPrice={product.price}
                salePrice={product.salePrice || undefined}
                productImage={product.imageUrl || undefined}
                trigger={
                  <Button variant="outline" size="icon" className="text-pink-600 border-pink-200 hover:bg-pink-50">
                    <Share2 className="h-5 w-5" />
                  </Button>
                }
              />
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
            
            {/* Disclaimers Section */}
            <div className="mt-6 space-y-2">
              {/* Order Timeline Disclaimer */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-[#FF69B4]" />
                    Order timeline
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3 text-sm text-gray-600">
                  <div className="pt-2 border-t border-gray-100">
                    Although we keep stock of certain items, we promote a huge range of products. For that reason, we need to pre-order stock as needed from our supplier. In order to do this as efficiently as possible, we consolidate weekly orders by a Monday, 20:00.
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Product Warranty Disclaimer */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-[#FF69B4]" />
                    Product warranty
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3 text-sm text-gray-600">
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <p>• Products with a purchase price less than R500, has a 7 day warranty</p>
                    <p>• Products with a purchase price of R500 or more, has a 30 day warranty</p>
                    <p>• In cases where products need to be returned, follow the steps detailed under Damages and Returns in the general Terms & Conditions.</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Colour and Size Disclaimer */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <Palette className="h-4 w-4 mr-2 text-[#FF69B4]" />
                    Colour and size disclaimer
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3 text-sm text-gray-600">
                  <div className="pt-2 border-t border-gray-100 space-y-3">
                    <p>The details of the products, descriptions or specifications (for example weight, colour, size, etc.) are only approximate values. There may be slight variations in the product design and pattern as compared to the images shown on our website.</p>
                    
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Colour Disclaimer:</p>
                      <p>Due to variations in monitor settings and display output of digital photography, we assume no responsibility and makes no guarantees regarding colour matches of products. We cannot guarantee that the colours displayed on our website will exactly match the colour of the product.</p>
                    </div>
                    
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Size Disclaimer:</p>
                      <p>We make every effort in providing as accurate information as possible in regard to the product sizing and dimensions. However, due to the nature of the manufacturing process, from time to time product sizing may vary slightly. Please always allow for 3-5 cm difference.</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
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
                    <span>{product.brand || 'Unknown'}</span>
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
                  <ProductCard
                    key={relatedProduct.id}
                    product={relatedProduct}
                    showAddToCart={false}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductDetail;
