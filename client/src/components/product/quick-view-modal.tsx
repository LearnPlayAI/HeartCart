import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useCart } from '@/hooks/use-cart';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StarIcon, ShoppingCart, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { StandardApiResponse } from '@/types/api';
import { Product } from '@shared/schema';
import { ensureValidImageUrl } from '@/utils/file-manager';
import { calculateProductPricing } from '@/utils/pricing';
import DisclaimersModal from './disclaimers-modal';
import { 
  Attribute, 
  AttributeOption, 
  ProductAttribute
} from '@/types/attribute-types';

interface ProductAttributeCombination {
  id: number;
  productId: number;
  attributes: Record<string, string>;
  priceAdjustment: number;
  sku: string | null;
}

interface QuickViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productSlug?: string;
  productId?: number;
}

export default function QuickViewModal({ open, onOpenChange, productSlug, productId }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<number, string>>({});
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [disclaimersModalOpen, setDisclaimersModalOpen] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<{
    productId: number;
    quantity: number;
    itemPrice: number;
    attributeSelections: Record<string, string>;
  } | null>(null);
  const { addItem } = useCart();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch product details
  const { 
    data: productFromSlugResponse, 
    isLoading: isLoadingProductFromSlug,
    error: productSlugError
  } = useQuery<StandardApiResponse<Product>>({
    queryKey: ['/api/products/slug', productSlug],
    enabled: !!productSlug && open,
  });
  
  // Fetch product details by ID
  const { 
    data: productFromIdResponse, 
    isLoading: isLoadingProductFromId,
    error: productIdError
  } = useQuery<StandardApiResponse<Product>>({
    queryKey: [`/api/products/${productId}`],
    enabled: !!productId && open,
  });
  
  // Use whichever product data is available
  const productFromId = productFromIdResponse?.success ? productFromIdResponse.data : null;
  const productFromSlug = productFromSlugResponse?.success ? productFromSlugResponse.data : null;
  const product = productFromId || productFromSlug;
  const isLoadingProduct = isLoadingProductFromId || isLoadingProductFromSlug;
  const productError = productIdError || productSlugError;

  // Fetch active promotions for this product - no cache for real-time pricing
  const { data: promotionsResponse } = useQuery<StandardApiResponse<any[]>>({
    queryKey: ['/api/promotions/active-with-products', product?.id],
    enabled: !!product?.id && open,
    staleTime: 0, // No cache - always fetch fresh promotional data
    gcTime: 0, // Don't keep in cache when component unmounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });

  // Find if this product is in any active promotion
  const activePromotions = promotionsResponse?.success ? promotionsResponse.data : [];
  const productPromotion = activePromotions
    .flatMap(promo => promo.products?.map((pp: any) => ({ ...pp, promotion: promo })) || [])
    .find((pp: any) => pp.productId === product?.id);

  const promotionInfo = productPromotion ? {
    promotionName: productPromotion.promotion.promotionName,
    promotionDiscount: productPromotion.discountOverride || productPromotion.promotion.discountValue,
    promotionDiscountType: productPromotion.promotion.discountType,
    promotionEndDate: productPromotion.promotion.endDate,
    promotionalPrice: productPromotion.promotionalPrice ? Number(productPromotion.promotionalPrice) : null
  } : null;

  // Calculate unified pricing using centralized logic
  const pricing = product ? calculateProductPricing(
    Number(product.price) || 0,
    product.salePrice ? Number(product.salePrice) : null,
    promotionInfo
  ) : null;
  
  // Log error to console for debugging
  useEffect(() => {
    if (productError) {
      console.error('Error fetching product details:', productError);
      toast({
        title: "Error loading product",
        description: "There was a problem loading the product details. Please try again.",
        variant: "destructive",
      });
    }
  }, [productError, toast]);

  // Get product attributes (same as working product detail page)
  const { 
    data: productAttributesResponse,
    isLoading: isLoadingProductAttributes,
    error: productAttributesError
  } = useQuery<StandardApiResponse<Attribute[]>>({
    queryKey: [`/api/product-attributes/product/${product?.id}/attributes`],
    enabled: !!product?.id && open,
  });
  const productAttributes = productAttributesResponse?.success ? productAttributesResponse.data : [];

  // Get product attribute values for combinations (same as working product detail page)
  const { 
    data: attributeValuesResponse,
    error: attributeValuesError
  } = useQuery<StandardApiResponse<ProductAttribute[]>>({
    queryKey: [`/api/product-attributes/product/${product?.id}/attribute-values`],
    enabled: !!product?.id && open,
  });
  const attributeValues = attributeValuesResponse?.success ? attributeValuesResponse.data : [];

  // Note: We no longer use combinations since product prices don't change based on attributes
  
  // Reset current image when modal opens/closes or product changes
  useEffect(() => {
    if (open && product) {
      // Reset to first image when modal opens
      setCurrentImage(product.imageUrl ? ensureValidImageUrl(product.imageUrl) : null);
      
      // Preload all product images for faster navigation
      const preloadImages = () => {
        const allImages = [];
        if (product.imageUrl) {
          allImages.push(product.imageUrl);
        }
        if (product.additionalImages && product.additionalImages.length > 0) {
          allImages.push(...product.additionalImages);
        }
        
        // Preload each image for instant navigation
        allImages.forEach(imageUrl => {
          const img = new Image();
          img.src = ensureValidImageUrl(imageUrl);
        });
      };
      
      // Start preloading after a small delay to not block the modal opening
      setTimeout(preloadImages, 100);
    } else if (!open) {
      // Clear image when modal closes
      setCurrentImage(null);
    }
  }, [open, product]);

  // Log any attribute-related errors (but don't show toast - attributes are optional)
  useEffect(() => {
    if (productAttributesError) {
      console.error('Error loading product attributes:', productAttributesError);
    }
    
    if (attributeValuesError) {
      console.error('Error loading attribute values:', attributeValuesError);
    }
    
    // Don't show error toasts for attribute errors as they're optional features
    // The quick view should work fine without attributes
  }, [productAttributesError, attributeValuesError]);

  // Handle attribute change (simplified like product detail page)
  const handleAttributeChange = (attributeId: number, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeId]: value
    }));
  };

  // Navigate between images in quick view
  const navigateQuickViewImage = (direction: 'prev' | 'next') => {
    if (!product) return;
    
    // Create array of all available images
    const allImages = [];
    if (product.imageUrl) {
      allImages.push(product.imageUrl);
    }
    if (product.additionalImages && product.additionalImages.length > 0) {
      allImages.push(...product.additionalImages);
    }
    
    console.log('Navigation:', {
      direction,
      allImages,
      currentImage,
      productImageUrl: product.imageUrl
    });
    
    if (allImages.length <= 1) {
      console.log('Only one image available, no navigation needed');
      return; // No navigation needed for single image
    }
    
    // Find current image index
    const currentImageUrl = currentImage || product.imageUrl;
    let currentIndex = -1;
    
    // Try to find exact match first
    currentIndex = allImages.findIndex(img => img === currentImageUrl);
    
    // If not found, try with ensureValidImageUrl
    if (currentIndex === -1) {
      currentIndex = allImages.findIndex(img => ensureValidImageUrl(img) === currentImageUrl);
    }
    
    // If still not found, try comparing with ensureValidImageUrl on current
    if (currentIndex === -1) {
      const normalizedCurrent = ensureValidImageUrl(currentImageUrl || '');
      currentIndex = allImages.findIndex(img => ensureValidImageUrl(img) === normalizedCurrent);
    }
    
    // Default to 0 if still not found
    if (currentIndex === -1) {
      currentIndex = 0;
    }
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex <= 0 ? allImages.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex >= allImages.length - 1 ? 0 : currentIndex + 1;
    }
    
    console.log('Index calculation:', {
      currentIndex,
      newIndex,
      newImage: allImages[newIndex]
    });
    
    setCurrentImage(ensureValidImageUrl(allImages[newIndex]));
  };

  // Show skeletons while loading
  if (isLoadingProduct) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="w-full h-[300px] rounded-md" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!product) return null;

  const handleAddToCart = () => {
    if (productAttributes && productAttributes.length > 0) {
      // Check if all required attributes are selected
      const missingRequiredAttributes = productAttributes
        .filter((attr: Attribute) => attr.isRequired)
        .filter((attr: Attribute) => !selectedAttributes[attr.id]);
      
      if (missingRequiredAttributes.length > 0) {
        toast({
          title: "Please select options",
          description: `Please select ${missingRequiredAttributes.map((a: Attribute) => a.displayName || a.name).join(', ')}`,
          variant: "destructive",
        });
        return;
      }
    }
    
    // Use promotional price if available, otherwise fallback to sale price or regular price
    const cartPrice = pricing ? pricing.displayPrice : (product.salePrice || product.price);
    
    // Format attribute selections for the cart
    const attributeSelections: Record<string, string> = {};
    if (productAttributes && productAttributes.length > 0) {
      productAttributes.forEach(attr => {
        const selectedValue = selectedAttributes[attr.id];
        if (selectedValue) {
          const attributeName = attr.displayName || attr.name;
          attributeSelections[attributeName] = selectedValue;
        }
      });
    }
    
    // Prepare cart item and show disclaimers modal
    setPendingCartItem({
      productId: product.id,
      quantity: quantity,
      itemPrice: cartPrice,
      attributeSelections
    });
    setDisclaimersModalOpen(true);
  };

  const handleAcceptDisclaimers = () => {
    if (pendingCartItem) {
      addItem(pendingCartItem);
      
      
      // Reset state and close modals
      setPendingCartItem(null);
      setDisclaimersModalOpen(false);
      onOpenChange(false);
    }
  };
  
  // Calculate promotional price if available
  const calculatePromotionalPrice = (basePrice: number, promotion: any) => {
    if (!promotion) return basePrice;
    
    if (promotion.promotionDiscountType === 'percentage') {
      return basePrice * (1 - promotion.promotionDiscount / 100);
    } else {
      return Math.max(0, basePrice - promotion.promotionDiscount);
    }
  };

  // Use promotional pricing if available, otherwise use sale price or regular price
  const basePrice = product.salePrice || product.price;
  const adjustedPrice = promotionInfo ? calculatePromotionalPrice(basePrice, promotionInfo) : basePrice;
  
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto" aria-describedby="quick-view-description">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{product.name}</DialogTitle>
          <DialogDescription id="quick-view-description" className="sr-only">
            Quick view of {product.name} with pricing and options
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Product Image */}
          <div className="relative group">
            <img 
              src={currentImage || (product.imageUrl ? ensureValidImageUrl(product.imageUrl) : 
                  (product.originalImageObjectKey ? ensureValidImageUrl(product.originalImageObjectKey) : ''))} 
              alt={product.name} 
              className="w-full h-auto object-cover rounded-md"
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
                        navigateQuickViewImage('prev');
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
                        navigateQuickViewImage('next');
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
          
          {/* Product Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{product.name}</h2>
            
            {/* Price and ratings */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-[#FF69B4]">
                    {pricing ? formatCurrency(pricing.displayPrice) : formatCurrency(product.price)}
                  </span>
                  {pricing?.hasDiscount && (
                    <span className="ml-2 text-sm line-through text-gray-500">
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
              </div>
              
              {/* Star rating */}
              <div className="flex items-center">
                {Array(5).fill(0).map((_, i) => (
                  <StarIcon 
                    key={i} 
                    className={`h-4 w-4 ${
                      i < (product.rating || 0) 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-1 text-sm text-gray-600">
                  ({product.reviewCount || 0})
                </span>
              </div>
            </div>
            
            <DialogDescription className="line-clamp-3">
              {product.description || 'No description available'}
            </DialogDescription>
            
            <Separator className="my-2" />
            
            {/* Product attributes with proper dropdown handling */}
            {productAttributes && productAttributes.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Product Options</h4>
                
                {productAttributes.map(attribute => {
                  // Use attribute.options directly (same as working product detail page)
                  const availableOptions = attribute.options || [];
                  
                  // Debug logging
                  console.log(`Rendering attribute [${attribute.id}]: `, {
                    name: attribute.name,
                    displayName: attribute.displayName,
                    options: attribute.options,
                    optionCount: attribute.options?.length,
                    availableOptions: availableOptions,
                    value: selectedAttributes[attribute.id]
                  });
                  
                  console.log(`Available options for select [${attribute.id}]:`, availableOptions);
                  
                  return (
                    <div key={attribute.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <label className="font-medium text-sm">{attribute.displayName || attribute.name}</label>
                          {attribute.isRequired && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </div>
                      </div>
                      
                      {availableOptions && availableOptions.length > 0 ? (
                        // Render dropdown for attributes with predefined options
                        <Select 
                          value={selectedAttributes[attribute.id] || ''} 
                          onValueChange={(value) => handleAttributeChange(attribute.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={`Select ${attribute.displayName || attribute.name}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOptions.map(option => (
                              <SelectItem key={option.id} value={option.value}>
                                {option.displayValue || option.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        // Render text input for attributes without predefined options
                        <input
                          type="text"
                          className="w-full p-2 border rounded-md"
                          placeholder={`Enter ${attribute.displayName || attribute.name}`}
                          value={selectedAttributes[attribute.id] || ''}
                          onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Quantity and Add to Cart */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex border rounded-md">
                <button
                  type="button"
                  className="px-3 py-1 border-r"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <span className="px-4 py-1 min-w-[40px] text-center">{quantity}</span>
                <button
                  type="button"
                  className="px-3 py-1 border-l"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
              
              <Button 
                className="flex-1" 
                onClick={handleAddToCart}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
            </div>
            
            {/* View details button */}
            <Button
              variant="outline" 
              className="w-full mt-2"
              onClick={() => {
                navigate(`/product/id/${product.id}`);
                onOpenChange(false);
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Full Details
            </Button>
            
            {/* Additional info */}
            {product.sku && (
              <div className="text-xs text-gray-500 mt-2">
                SKU: {product.sku}
              </div>
            )}
            
            {product.supplier && (
              <div className="text-xs text-gray-500">
                Brand: {product.supplier}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Disclaimers Modal */}
    <DisclaimersModal
      open={disclaimersModalOpen}
      onOpenChange={setDisclaimersModalOpen}
      onAccept={handleAcceptDisclaimers}
      productName={product.name}
    />
    </>
  );
}