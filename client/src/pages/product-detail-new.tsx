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
  Star, 
  StarHalf, 
  Minus, 
  Plus, 
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useAttributeDiscounts } from '@/hooks/use-attribute-discounts';
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
    queryKey: ['/api/products', product?.id, 'attributes'],
    enabled: !!product?.id,
  });
  const productAttributes = productAttributesResponse?.success ? productAttributesResponse.data : [];
  
  // Get product attribute options
  const { 
    data: attributeOptionsResponse,
    error: attributeOptionsError
  } = useQuery<StandardApiResponse<{ [key: number]: ProductAttributeOption[] }>>({
    queryKey: ['/api/products', product?.id, 'attribute-options'],
    enabled: !!product?.id && !!productAttributes?.length,
  });
  const attributeOptions = attributeOptionsResponse?.success ? attributeOptionsResponse.data : {};
  
  // Get product attribute values for combinations
  const { 
    data: attributeValuesResponse,
    error: attributeValuesError
  } = useQuery<StandardApiResponse<ProductAttributeValue[]>>({
    queryKey: ['/api/products', product?.id, 'attribute-values'],
    enabled: !!product?.id,
  });
  const attributeValues = attributeValuesResponse?.success ? attributeValuesResponse.data : [];
  
  // Handle secondary query errors
  useEffect(() => {
    const errors = [
      { error: relatedProductsError, name: 'related products' },
      { error: productAttributesError, name: 'product attributes' },
      { error: attributeOptionsError, name: 'attribute options' },
      { error: attributeValuesError, name: 'attribute values' }
    ].filter(item => item.error);
    
    if (errors.length > 0) {
      errors.forEach(({ error, name }) => {
        console.error(`Error fetching ${name}:`, error);
        toast({
          title: `Failed to load ${name}`,
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
      });
    }
  }, [relatedProductsError, productAttributesError, attributeOptionsError, attributeValuesError, toast]);
  
  // Effect to set initial image on component mount or when product changes
  useEffect(() => {
    if (product) {
      // First check for imageUrl, then fall back to objectKey
      if (product.imageUrl && !currentImage) {
        setCurrentImage(ensureValidImageUrl(product.imageUrl));
      } else if (product.originalImageObjectKey && !currentImage) {
        // If we have an object key, use it
        setCurrentImage(ensureValidImageUrl(product.originalImageObjectKey));
      }
    }
  }, [product, currentImage]);

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
        
        return selectedOptionId && 
          (value.optionId === parseInt(selectedOptionId) || 
           value.textValue === selectedOptionId);
      });
      
      // Calculate total base price adjustment from all selected attribute values
      let totalPriceAdjustment = 0;
      
      selectedAttrValues.forEach(value => {
        if (value.priceAdjustment) {
          totalPriceAdjustment += parseFloat(value.priceAdjustment);
        }
      });
      
      // Apply base price adjustment 
      const basePrice = product.salePrice || product.price;
      const initialAdjustedPrice = Number(basePrice) + totalPriceAdjustment;
      
      // Store the selected attribute values for display/cart purposes
      setSelectedAttributeValues(selectedAttrValues);
      
      // Calculate dynamic discounts based on selected attributes and quantity
      if (product.id) {
        // Use async IIFE to call the calculatePriceAdjustments function
        (async () => {
          try {
            // Get discount adjustments from the API
            const adjustmentResult = await calculatePriceAdjustments(
              product.id,
              selectedAttributes,
              quantity
            );
            
            // Store the adjustments for display
            setPriceAdjustments(adjustmentResult);
            
            // Apply discounts to the adjusted price
            const finalPrice = initialAdjustedPrice - adjustmentResult.totalAdjustment;
            setCurrentPrice(finalPrice > 0 ? finalPrice : 0);
          } catch (error) {
            console.error('Failed to calculate attribute discounts:', error);
            // Fallback to the base price adjustment if discount calculation fails
            setCurrentPrice(initialAdjustedPrice);
            setPriceAdjustments(null);
          }
        })();
      } else {
        // If we don't have a product ID, just use the base price adjustment
        setCurrentPrice(initialAdjustedPrice);
        setPriceAdjustments(null);
      }
    } else {
      setCurrentPrice(null);
      setSelectedAttributeValues([]);
      setPriceAdjustments(null);
    }
  }, [selectedAttributes, attributeValues, product, productAttributes, quantity, calculatePriceAdjustments]);
  
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
    if (!product) return;
    
    // Create a combination hash from selected attributes (for cart item identification)
    const combinationHash = Object.entries(selectedAttributes)
      .map(([attrId, value]) => `${attrId}:${value}`)
      .sort()
      .join('|');
    
    // Format selectedAttributes for cart storage
    const formattedAttributes: Record<string, any> = {};
    
    if (productAttributes && Object.keys(selectedAttributes).length > 0) {
      productAttributes.forEach(attr => {
        const attrId = attr.id.toString();
        const selectedValue = selectedAttributes[attr.id];
        
        if (selectedValue) {
          // Find the option display value for select-type attributes
          const options = attributeOptions?.[attr.id] || [];
          const selectedOption = options.find(opt => opt.value === selectedValue);
          
          formattedAttributes[attrId] = {
            attributeId: attr.id,
            attributeName: attr.displayName,
            value: selectedValue,
            displayValue: selectedOption?.displayValue || selectedValue,
          };
        }
      });
    }
    
    // Apply price adjustments and discounts
    const basePrice = product.salePrice || product.price;
    const attributePriceAdjustment = currentPrice !== null ? currentPrice - basePrice : 0;
    
    // Create the cart item with discount information
    const cartItem = {
      productId: product.id,
      product,
      quantity,
      combinationHash: combinationHash || null,
      selectedAttributes: Object.keys(formattedAttributes).length > 0 ? formattedAttributes : null,
      priceAdjustment: attributePriceAdjustment,
      // Include discount information
      discounts: priceAdjustments ? {
        adjustments: priceAdjustments.adjustments,
        totalAdjustment: priceAdjustments.totalAdjustment
      } : null,
      // Store the final price for the item
      itemPrice: currentPrice !== null ? currentPrice : basePrice
    };
    
    addItem(cartItem);
    
    toast({
      title: "Added to cart",
      description: `${quantity} x ${product.name} has been added to your cart.`,
      duration: 2000,
    });
  }, [product, selectedAttributes, productAttributes, attributeOptions, currentPrice, quantity, priceAdjustments, addItem, toast]);
  
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            <div 
              className="mb-4 bg-white rounded-lg overflow-hidden border border-gray-200 cursor-pointer"
              onClick={() => openImageModal(product.additionalImages?.findIndex(img => img === currentImage) || 0)}
            >
              <img 
                src={currentImage || (product.imageUrl ? ensureValidImageUrl(product.imageUrl) : '')} 
                alt={product.name || 'Product image'} 
                className="w-full h-auto object-contain aspect-square"
              />
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
            
            {/* Attribute Selection */}
            {productAttributes && productAttributes.length > 0 && attributeOptions && (
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold">Product Options</h3>
                
                {productAttributes.map(attribute => {
                  // Get options for this attribute
                  const options = attributeOptions[attribute.id] || [];
                  
                  // Skip if no options available
                  if (options.length === 0 && attribute.type !== 'text') return null;
                  
                  return (
                    <div key={attribute.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <label className="font-medium text-sm">{attribute.name}</label>
                          {attribute.isRequired && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </div>
                        
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
                      
                      {/* Display different input types based on attribute type */}
                      {attribute.type === 'select' && (
                        <Select 
                          value={selectedAttributes[attribute.id] || ''}
                          onValueChange={value => handleAttributeChange(attribute.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={`Select ${attribute.name}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map(option => (
                              <SelectItem key={option.id} value={option.id.toString()}>
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

                    {/* Display attribute discount details if available */}
                    {priceAdjustments && priceAdjustments.adjustments.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-green-200">
                        <h4 className="text-xs font-semibold text-green-800 mb-1">Applied Discounts:</h4>
                        <ul className="space-y-1">
                          {priceAdjustments.adjustments.map((adjustment, idx) => (
                            <li key={idx} className="text-xs flex justify-between text-green-700">
                              <span>{adjustment.ruleName}</span>
                              <span className="font-medium">
                                {adjustment.discountType === 'percentage' 
                                  ? `${adjustment.discountValue}% off` 
                                  : `-${formatCurrency(adjustment.appliedValue)}`}
                              </span>
                            </li>
                          ))}
                          {priceAdjustments.totalAdjustment > 0 && (
                            <li className="text-xs font-semibold flex justify-between text-green-800 pt-1 border-t border-green-200 mt-1">
                              <span>Total Savings:</span>
                              <span>{formatCurrency(priceAdjustments.totalAdjustment)}</span>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
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
            
            {/* Add to Cart Button */}
            <Button 
              onClick={handleAddToCart}
              className="w-full mt-6 bg-[#FF69B4] hover:bg-[#FF69B4]/90"
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
            </Button>
            
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