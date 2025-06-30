import React, { useState, useEffect, useCallback } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { StandardApiResponse } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Star, 
  StarHalf, 
  Minus, 
  Plus, 
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowLeft,
  ChevronDown,
  Clock,
  Shield,
  Palette,
  Share2
} from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useAttributeDiscounts } from '@/hooks/use-attribute-discounts';
import ShareProductDialog from '@/components/ShareProductDialog';
import { useNavigateBack } from '@/hooks/use-scroll-management';
import { formatCurrency, calculateDiscount } from '@/lib/utils';
import { ensureValidImageUrl } from '@/utils/file-manager';
import ProductCard from '@/components/product/product-card';
import { Product } from '@shared/schema';
import { 
  CategoryAttribute, 
  CategoryAttributeOption, 
  ProductAttributeValue,
  ProductAttributeOption
} from '@/types/attribute-types';

// This is a router component that decides which Product Detail implementation to use
const ProductDetail = () => {
  const [matchSlug] = useRoute('/product/:slug');
  const [matchId] = useRoute('/product/id/:id');
  
  // If ID route matches, use ID-based component
  if (matchId) {
    return <ProductDetailById />;
  }
  
  // Otherwise use slug-based component
  return <ProductDetailBySlug />;
};

// Component specifically for handling product detail by slug
const ProductDetailBySlug = () => {
  const [, params] = useRoute('/product/:slug');
  const slug = params?.slug;
  
  // Fetch product by slug
  const { 
    data: response, 
    isLoading, 
    error 
  } = useQuery<StandardApiResponse<Product>>({
    queryKey: [`/api/products/slug/${slug}`],
    enabled: !!slug,
  });
  
  // Extract the product from the standardized response
  const product = response?.success ? response.data : undefined;
  
  return (
    <ProductDetailView
      product={product}
      isLoading={isLoading}
      error={error}
    />
  );
};

// Component specifically for handling product detail by ID
const ProductDetailById = () => {
  const [, params] = useRoute('/product/id/:id');
  const id = params?.id ? parseInt(params.id, 10) : undefined;
  
  // Fetch product by ID
  const { 
    data: response, 
    isLoading, 
    error 
  } = useQuery<StandardApiResponse<Product>>({
    queryKey: [`/api/products/${id}`],
    enabled: !!id,
  });
  
  // Extract the product from the standardized response
  const product = response?.success ? response.data : undefined;
  
  return (
    <ProductDetailView
      product={product}
      isLoading={isLoading}
      error={error}
    />
  );
};

// The actual product detail view - shared between ID and slug routes
const ProductDetailView = ({
  product,
  isLoading,
  error
}: {
  product?: Product;
  isLoading: boolean;
  error: Error | null;
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addItem } = useCart();
  const { calculatePriceAdjustments: calculatePriceAdjustmentsOriginal } = useAttributeDiscounts();
  const { goBack } = useNavigateBack();
  
  // Memoize the price adjustment calculation to prevent re-renders
  const calculatePriceAdjustments = useCallback(
    async (productId: number, selectedAttrs: Record<string, any>, qty: number = 1) => {
      return await calculatePriceAdjustmentsOriginal(productId, selectedAttrs, qty);
    },
    [calculatePriceAdjustmentsOriginal]
  );
  
  // Error handling effect
  useEffect(() => {
    if (error) {
      console.error('Error fetching product details:', error);
      toast({
        title: "Failed to load product details",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  // Local state
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState<{[key: number]: string}>({});
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<ProductAttributeValue[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [priceAdjustments, setPriceAdjustments] = useState<{
    adjustments: Array<{
      ruleId: number,
      ruleName: string,
      discountType: string,
      discountValue: number,
      appliedValue: number
    }>,
    totalAdjustment: number
  } | null>(null);

  // Fetch active promotions for this product - no cache for real-time pricing
  const { data: promotionsResponse } = useQuery<any>({
    queryKey: ['/api/promotions/active-with-products', product?.id],
    enabled: !!product?.id,
    staleTime: 0, // No cache - always fetch fresh promotional data
    gcTime: 0, // Don't keep in cache when component unmounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });

  // Find if this product is in any active promotion
  const activePromotions = promotionsResponse?.data || promotionsResponse || [];
  const productPromotion = activePromotions
    .flatMap((promo: any) => promo.products?.map((pp: any) => ({ ...pp, promotion: promo })) || [])
    .find((pp: any) => pp.productId === product?.id);

  const promotionInfo = productPromotion ? {
    promotionName: productPromotion.promotion.promotionName,
    promotionDiscount: productPromotion.extraDiscountPercentage || productPromotion.discountOverride || productPromotion.promotion.discountValue,
    promotionDiscountType: productPromotion.promotion.promotionType,
    promotionEndDate: productPromotion.promotion.endDate,
    promotionalPrice: productPromotion.promotionalPrice ? Number(productPromotion.promotionalPrice) : null
  } : null;
  
  // Get related products based on category
  const { 
    data: relatedProductsResponse,
    error: relatedProductsError
  } = useQuery<StandardApiResponse<Product[]>>({
    queryKey: ['/api/products/category', product?.categoryId],
    enabled: !!product?.categoryId,
    queryFn: async ({ queryKey }) => {
      const categoryId = queryKey[1];
      const res = await fetch(`/api/products/category/${categoryId}?limit=5`);
      if (!res.ok) throw new Error(`Failed to fetch related products: ${res.status}`);
      return res.json();
    }
  });
  const relatedProducts = relatedProductsResponse?.success ? relatedProductsResponse.data : [];
  
  // Get product attributes (includes product-specific attributes as well as inherited ones)
  const { 
    data: productAttributesResponse,
    error: productAttributesError
  } = useQuery<StandardApiResponse<CategoryAttribute[]>>({
    queryKey: [`/api/product-attributes/product/${product?.id}/attributes`],
    enabled: !!product?.id,
  });
  const productAttributes = productAttributesResponse?.success ? productAttributesResponse.data : [];
  
  // We no longer use category-based attributes
  // Don't use /api/categories/${product?.categoryId}/attributes endpoint
  // Instead, just rely on the product-specific attributes from the product attributes endpoint
  // Define empty attributeOptions and attributeOptionsError to avoid reference errors
  const attributeOptions = {};
  const attributeOptionsError = null;
  
  // Get product attribute values for combinations
  const { 
    data: attributeValuesResponse,
    error: attributeValuesError
  } = useQuery<StandardApiResponse<ProductAttributeValue[]>>({
    queryKey: [`/api/product-attributes/product/${product?.id}/attribute-values`],
    enabled: !!product?.id,
  });
  const attributeValues = attributeValuesResponse?.success ? attributeValuesResponse.data : [];
  
  // Handle secondary query errors
  useEffect(() => {
    // Only report errors for relatedProducts - attribute errors can be ignored
    // since not all products will have attributes
    if (relatedProductsError) {
      console.error('Error fetching related products:', relatedProductsError);
      toast({
        title: "Failed to load related products",
        description: relatedProductsError instanceof Error 
          ? relatedProductsError.message 
          : "An unexpected error occurred",
        variant: "destructive",
      });
    }
    
    // Log attribute errors only for debugging, don't show toasts for these
    if (productAttributesError) {
      console.error('Error fetching product attributes:', productAttributesError);
    }
    // We no longer use attributeOptionsError since we removed that query
    if (attributeValuesError) {
      console.error('Error fetching attribute values:', attributeValuesError);
    }
  }, [relatedProductsError, productAttributesError, attributeValuesError, toast]);
  
  // Effect to set initial image on component mount or when product changes
  useEffect(() => {
    if (product) {
      // First check for imageUrl, then fall back to objectKey
      if (product.imageUrl) {
        setCurrentImage(ensureValidImageUrl(product.imageUrl));
      } else if (product.originalImageObjectKey) {
        // If we have an object key, use it
        setCurrentImage(ensureValidImageUrl(product.originalImageObjectKey));
      }
    }
  }, [product?.id]); // Only depend on product ID to avoid infinite loops

  // Effect to update price when attributes are selected or quantity changes
  useEffect(() => {
    if (!product || !attributeValues || !productAttributes) return;
    
    // Check if all required attributes have been selected
    const requiredAttributes = productAttributes.filter(attr => attr.isRequired);
    const allRequiredSelected = requiredAttributes.length === 0 || 
      requiredAttributes.every(attr => selectedAttributes[attr.id]);
    
    if (allRequiredSelected && Object.keys(selectedAttributes).length > 0) {
      // Find matching attribute values with price adjustments
      const selectedAttrValues = attributeValues.filter(value => {
        // Match attribute values that correspond to selected attributes
        const attrId = value.attributeId;
        const selectedOptionId = selectedAttributes[attrId];
        
        if (!selectedOptionId) return false;
        
        // Check if the selected option ID is in the comma-separated valueText
        if (value.valueText && value.valueText.includes(',')) {
          const availableOptions = value.valueText.split(',');
          return availableOptions.includes(selectedOptionId);
        }
        
        // Otherwise check for direct matches
        return value.attributeOptionId === parseInt(selectedOptionId) || 
               value.valueText === selectedOptionId;
      });
      
      // No price adjustments based on attributes as per requirements
      // Selected attributes are stored for display purposes only
      
      // Apply base product price without any attribute-based adjustments
      const basePrice = product.salePrice || product.price;
      const initialAdjustedPrice = Number(basePrice);
      
      // Store the selected attribute values for display/cart purposes
      setSelectedAttributeValues(selectedAttrValues);
      
      // No price adjustment based on attributes, as per requirement
      // Simply use the base price without attribute-based adjustments
      setCurrentPrice(initialAdjustedPrice);
      setPriceAdjustments(null);
    } else {
      setCurrentPrice(null);
      setSelectedAttributeValues([]);
      setPriceAdjustments(null);
    }
  }, [selectedAttributes, attributeValues, product?.id, productAttributes]);
  
  // Handle quantity change (memoized to prevent recreating on each render)
  const handleQuantityChange = useCallback((newQuantity: number) => {
    if (newQuantity > 0 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  }, []);
  
  // Handle attribute changes (memoized to prevent recreating on each render)
  const handleAttributeChange = useCallback((attributeId: number, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeId]: value
    }));
  }, []);
  
  // Handle thumbnail click to change main image (memoized to prevent re-renders)
  const handleThumbnailClick = useCallback((image: string) => {
    setCurrentImage(ensureValidImageUrl(image));
  }, []);

  // Navigate between images on main display
  const navigateMainImage = useCallback((direction: 'prev' | 'next') => {
    if (!product) return;
    
    // Create array of all available images
    const allImages = [];
    if (product.imageUrl) {
      allImages.push(product.imageUrl);
    }
    if (product.additionalImages) {
      allImages.push(...product.additionalImages);
    }
    
    if (allImages.length <= 1) return; // No navigation needed for single image
    
    // Find current image index
    const currentImageUrl = currentImage || product.imageUrl;
    const currentIndex = allImages.findIndex(img => ensureValidImageUrl(img) === currentImageUrl);
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex <= 0 ? allImages.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex >= allImages.length - 1 ? 0 : currentIndex + 1;
    }
    
    setCurrentImage(ensureValidImageUrl(allImages[newIndex]));
  }, [product, currentImage]);
  
  // Open image carousel modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  // Memoize modal handling functions
  const openImageModal = useCallback((index: number) => {
    setCarouselIndex(index);
    setIsModalOpen(true);
  }, []);
  
  const navigateCarousel = useCallback((direction: 'prev' | 'next') => {
    if (!product || !product.additionalImages) return;
    
    const totalImages = product.additionalImages.length;
    if (direction === 'next') {
      setCarouselIndex(prev => (prev + 1) % totalImages);
    } else {
      setCarouselIndex(prev => (prev - 1 + totalImages) % totalImages);
    }
  }, [product]);
  
  // Add to cart handler (memoized to prevent re-renders)
  const handleAddToCart = useCallback(() => {
    console.log('🔍 ADD TO CART CLICKED - Starting debug');
    console.log('🔍 Product:', product);
    console.log('🔍 Product Attributes:', productAttributes);
    console.log('🔍 Selected Attributes:', selectedAttributes);
    
    if (!product) return;
    
    // Check if product has required attributes that need to be selected
    const requiredAttributes = productAttributes?.filter(attr => attr.isRequired) || [];
    const hasRequiredAttributes = requiredAttributes.length > 0;
    
    if (hasRequiredAttributes) {
      // Check if all required attributes have been selected
      const allRequiredSelected = requiredAttributes.every(attr => selectedAttributes[attr.id]);
      
      if (!allRequiredSelected) {
        toast({
          title: "Please select all required options",
          description: "This product requires you to select options before adding to cart.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
    }
    
    // Format selectedAttributes for cart storage with user-friendly names
    const attributeSelections: Record<string, string> = {};
    
    if (productAttributes && Object.keys(selectedAttributes).length > 0) {
      productAttributes.forEach(attr => {
        const selectedValue = selectedAttributes[attr.id];
        
        if (selectedValue) {
          // Use the attribute display name as key and selected value as value
          const attributeName = attr.displayName || attr.name;
          attributeSelections[attributeName] = selectedValue;
        }
      });
    }
    
    // Use base price without adjustments per requirements
    const basePrice = product.salePrice || product.price;
    
    // Create the cart item with attribute selections  
    const cartItem = {
      productId: product.id,
      quantity,
      itemPrice: basePrice,
      attributeSelections,
      discountData: null,
      totalDiscount: 0,
      product // Include product reference for cart display
    };
    
    console.log('🔍 PRODUCT DETAIL DEBUG - Selected Attributes:', selectedAttributes);
    console.log('🔍 PRODUCT DETAIL DEBUG - Formatted Attribute Selections:', attributeSelections);
    console.log('🔍 PRODUCT DETAIL DEBUG - Cart Item:', cartItem);
    
    addItem(cartItem);
    
    
  }, [product, selectedAttributes, productAttributes, quantity, addItem, toast]);
  
  // Render star ratings (memoized to prevent re-renders)
  const renderStars = useCallback((rating: number | null = 0) => {
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
  }, []);
  
  // Loading state
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
  
  // Error state
  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {error ? "Error Loading Product" : "Product Not Found"}
            </h1>
            <p className="text-gray-600 mb-4">
              {error 
                ? "We encountered an error while trying to load this product. Please try again later."
                : "The product you're looking for doesn't exist or has been removed."
              }
            </p>
            {error && (
              <p className="text-sm text-red-500 mb-4">
                {error instanceof Error ? error.message : "An unexpected error occurred"}
              </p>
            )}
            <Button asChild>
              <Link href="/">Go back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Calculate discount percentage
  const discount = product.salePrice
    ? calculateDiscount(product.price, product.salePrice)
    : 0;
  
  // Log product data for debugging
  console.log('Product data:', product);
  
  // Main render
  return (
    <>
      <Helmet>
        <title>{product.name} - TEE ME YOU</title>
        <meta name="description" content={product.description || `Buy ${product.name} from local South African suppliers at TEE ME YOU.`} />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            <div 
              className="mb-4 bg-white rounded-lg overflow-hidden border border-gray-200 cursor-pointer relative group"
              onClick={() => openImageModal(product.additionalImages?.findIndex(img => img === currentImage) || 0)}
            >
              <img 
                src={currentImage || (product.imageUrl ? ensureValidImageUrl(product.imageUrl) : '')} 
                alt={product.name || 'Product image'} 
                className="w-full h-auto object-contain aspect-square max-h-[300px] sm:max-h-[400px] md:max-h-[500px] lg:max-h-[600px]"
              />
              
              {/* Navigation Arrows - only show if there are multiple images */}
              {(() => {
                const allImages = [];
                if (product.imageUrl) allImages.push(product.imageUrl);
                if (product.additionalImages) allImages.push(...product.additionalImages);
                
                if (allImages.length > 1) {
                  return (
                    <>
                      {/* Left Arrow */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#FF69B4] hover:bg-[#FF69B4]/90 shadow-md opacity-80 transition-opacity duration-200 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateMainImage('prev');
                        }}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      
                      {/* Right Arrow */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#FF69B4] hover:bg-[#FF69B4]/90 shadow-md opacity-80 transition-opacity duration-200 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateMainImage('next');
                        }}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </>
                  );
                }
                return null;
              })()}
              

            </div>
            
            {/* Thumbnail gallery showing both main image and additional images */}
            {(product.imageUrl || (product.additionalImages && product.additionalImages.length > 0)) && (
              <div className="grid grid-cols-5 gap-2">
                {/* Include main product image in the gallery */}
                {product.imageUrl && (
                  <div 
                    className={`border rounded-md overflow-hidden cursor-pointer transition-all ${
                      currentImage === ensureValidImageUrl(product.imageUrl) || 
                      (!currentImage && product.imageUrl) 
                        ? 'border-[#FF69B4] shadow-md scale-105' 
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                    onClick={() => handleThumbnailClick(product.imageUrl)}
                  >
                    <img 
                      src={ensureValidImageUrl(product.imageUrl)} 
                      alt={`${product.name} - main image`} 
                      className="w-full h-auto object-cover aspect-square"
                    />
                  </div>
                )}
                
                {/* Show additional images */}
                {product.additionalImages && product.additionalImages.map((image, index) => (
                  <div 
                    key={index} 
                    className={`border rounded-md overflow-hidden cursor-pointer transition-all ${
                      currentImage === image 
                        ? 'border-[#FF69B4] shadow-md scale-105' 
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                    onClick={() => handleThumbnailClick(image)}
                  >
                    <img 
                      src={ensureValidImageUrl(image)} 
                      alt={`${product.name} - image ${index + 1}`} 
                      className="w-full h-auto object-cover aspect-square"
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Image Carousel Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
                <DialogHeader className="sr-only">
                  <DialogTitle>Product Image Gallery</DialogTitle>
                  <DialogDescription>View product images in full size with navigation controls</DialogDescription>
                </DialogHeader>
                <div className="relative flex items-center justify-center h-[80vh]">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-2 top-2 text-white hover:bg-white/20 z-10"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  
                  {(product.imageUrl || (product.additionalImages && product.additionalImages.length > 0)) && (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* Create a combined array of images for the carousel */}
                      {(() => {
                        // Create an array with all images (main + additional)
                        const allImages = [];
                        if (product.imageUrl) {
                          allImages.push(product.imageUrl);
                        }
                        if (product.additionalImages) {
                          allImages.push(...product.additionalImages);
                        }
                        
                        // Use the current index to display the correct image
                        return (
                          <img 
                            src={ensureValidImageUrl(allImages[carouselIndex])} 
                            alt={`${product.name} - large view`} 
                            className="max-h-full max-w-full object-contain"
                          />
                        );
                      })()}
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                        onClick={() => navigateCarousel('prev')}
                      >
                        <ChevronLeft className="h-8 w-8" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                        onClick={() => navigateCarousel('next')}
                      >
                        <ChevronRight className="h-8 w-8" />
                      </Button>
                      
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                        {(() => {
                          // Create dots for all images (main + additional)
                          const dots = [];
                          let totalImages = 0;
                          
                          if (product.imageUrl) {
                            dots.push(
                              <div 
                                key="main"
                                className={`w-2 h-2 rounded-full ${
                                  0 === carouselIndex ? 'bg-white' : 'bg-white/40'
                                }`}
                                onClick={() => setCarouselIndex(0)}
                              />
                            );
                            totalImages++;
                          }
                          
                          if (product.additionalImages) {
                            product.additionalImages.forEach((_, idx) => {
                              dots.push(
                                <div 
                                  key={idx}
                                  className={`w-2 h-2 rounded-full ${
                                    (idx + totalImages) === carouselIndex ? 'bg-white' : 'bg-white/40'
                                  }`}
                                  onClick={() => setCarouselIndex(idx + totalImages)}
                                />
                              );
                            });
                          }
                          
                          return dots;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
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
                {product.rating !== null && product.rating !== undefined ? product.rating.toFixed(1) : '0.0'} ({product.reviewCount || 0} reviews)
              </span>
            </div>
            
            {/* Price */}
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-[#FF69B4]">
                {formatCurrency(promotionInfo?.promotionalPrice || product.salePrice || product.price)}
              </span>
              {(product.salePrice || promotionInfo) && (
                <>
                  <span className="text-gray-500 text-lg ml-2 line-through">
                    {formatCurrency(promotionInfo ? (product.salePrice || product.price) : product.price)}
                  </span>
                  <span className="ml-2 px-2 py-1 bg-[#FF69B4]/10 text-[#FF69B4] rounded-full text-sm">
                    {promotionInfo && promotionInfo.promotionalPrice ? 
                      Math.round(((product.price - promotionInfo.promotionalPrice) / product.price) * 100)
                      : discount}% OFF
                  </span>
                </>
              )}
            </div>
            
            {/* Promotional Info - positioned below price */}
            {promotionInfo && promotionInfo.promotionDiscount > 0 && (
              <div className="flex items-center gap-3 mt-2">
                <Badge 
                  className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-md shadow-sm"
                >
                  EXTRA {promotionInfo.promotionDiscount}% OFF!
                </Badge>
                <span className="text-sm font-medium text-gray-700">
                  {promotionInfo.promotionName}
                </span>
              </div>
            )}
            
            {/* Product code or SKU could go here instead */}
            
            <Separator className="my-4" />
            
            {/* Attribute Selection */}
            {productAttributes && productAttributes.length > 0 && attributeValues && (
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold">Product Options</h3>
                
                {productAttributes.map(attribute => {
                  // Get the attribute ID from the attribute object
                  const attributeId = attribute.id;
                  
                  // Find available options for this attribute from the attribute values
                  const attrValue = attributeValues.find(val => val.attributeId === attributeId);
                  let availableOptionValues: string[] = [];
                  
                  if (attrValue && attrValue.valueText) {
                    // Split the comma-separated values
                    availableOptionValues = attrValue.valueText.split(',');
                  }
                  
                  // We'll use the options directly from the productAttributes
                  const options = attribute.options || [];
                  
                  // Filter options based on available values if needed
                  const filteredOptions = availableOptionValues.length > 0 
                    ? options.filter(option => 
                        availableOptionValues.includes(option.value) || 
                        availableOptionValues.includes(option.id.toString()))
                    : options;
                  
                  // Skip if no options available
                  if (filteredOptions.length === 0 && attribute.type !== 'text') return null;
                  
                  return (
                    <div key={attributeId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <label className="font-medium text-sm">{attribute.displayName || attribute.name}</label>
                          {attribute.isRequired && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </div>
                        
                        {selectedAttributes[attributeId] && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="ml-2">
                                  {selectedAttributes[attributeId]}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Selected value</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      
                      {/* Display different input types based on attribute type */}
                      {attribute.type === 'select' && (
                        <Select 
                          value={selectedAttributes[attributeId] || ''}
                          onValueChange={value => handleAttributeChange(attributeId, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={`Select ${attribute.displayName || attribute.name}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredOptions.map(option => (
                              <SelectItem key={option.id} value={option.value}>
                                {option.displayValue || option.value}
                                {option.priceAdjustment && parseFloat(option.priceAdjustment) !== 0 && (
                                  <span className="ml-2 text-sm text-gray-500">
                                    ({parseFloat(option.priceAdjustment) > 0 ? '+' : ''}
                                    {formatCurrency(parseFloat(option.priceAdjustment))})
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {/* Add more attribute types here as needed */}
                    </div>
                  );
                })}
                
                {currentPrice !== null && currentPrice !== (product.salePrice || product.price) && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700 font-medium">
                        Selected configuration price:
                      </span>
                      <span className="text-green-800 font-bold">
                        {formatCurrency(currentPrice)}
                      </span>
                    </div>

                    {/* No price adjustments based on product attributes as per requirements */}
                  </div>
                )}
              </div>
            )}
            
            {/* Quantity Selector */}
            <div className="space-y-2">
              <label className="font-medium text-sm">Quantity</label>
              <div className="flex items-center">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="mx-4 min-w-8 text-center">{quantity}</span>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= 10}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              {/* Add to Cart Button */}
              <Button 
                onClick={handleAddToCart}
                className="w-full bg-[#FF69B4] hover:bg-[#FF69B4]/90"
              >
                <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
              </Button>
              
              {/* Share Button */}
              <ShareProductDialog
                productId={product.id}
                productTitle={product.name}
                productPrice={product.price}
                salePrice={product.salePrice || undefined}
                productImage={product.imageUrl || undefined}
                trigger={
                  <Button 
                    variant="outline" 
                    className="w-full border-pink-200 text-pink-600 hover:bg-pink-50"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Product
                  </Button>
                }
              />
            </div>
            
            {/* Product Description */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <div className="prose prose-sm max-w-none text-gray-700">
                {product.description ? (
                  <div dangerouslySetInnerHTML={{ __html: product.description }} />
                ) : (
                  <p>No description available.</p>
                )}
              </div>
            </div>

            {/* Disclaimers Section */}
            <div className="mt-8 space-y-2">
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
        
        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {relatedProducts
                .filter(relatedProduct => relatedProduct.id !== product.id)
                .slice(0, 5)
                .map(relatedProduct => (
                  <ProductCard 
                    key={relatedProduct.id} 
                    product={relatedProduct} 
                    hideQuickView
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