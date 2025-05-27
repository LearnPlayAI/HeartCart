import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useCart } from '@/hooks/use-cart';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StarIcon, ShoppingCart, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { StandardApiResponse } from '@/types/api';
import { Product } from '@shared/schema';
import { ensureValidImageUrl } from '@/utils/file-manager';

interface ProductAttribute {
  id: number;
  productId: number;
  categoryAttributeId: number;
  attributeOptions: {
    id: number;
    value: string;
  }[];
}

interface CategoryAttribute {
  id: number;
  name: string;
  required: boolean;
  displayOrder: number;
}

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
  const [currentCombination, setCurrentCombination] = useState<ProductAttributeCombination | null>(null);
  const [productAttributes, setProductAttributes] = useState<Record<number, Array<{id: number, value: string}>> | null>(null);
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

  // Fetch category attributes
  const { 
    data: categoryAttributesResponse, 
    isLoading: isLoadingAttributes,
    error: categoryAttributesError 
  } = useQuery<StandardApiResponse<CategoryAttribute[]>>({
    queryKey: [`/api/categories/${product?.categoryId}/attributes`],
    enabled: !!product?.categoryId && open,
  });
  const categoryAttributes = categoryAttributesResponse?.success ? categoryAttributesResponse.data : [];

  // Fetch product attribute values
  const { 
    data: productAttributesDataResponse, 
    isLoading: isLoadingProductAttributes,
    error: productAttributesError
  } = useQuery<StandardApiResponse<ProductAttribute[]>>({
    queryKey: [`/api/products/${product?.id}/attributes`],
    enabled: !!product?.id && open,
  });
  const productAttributesData = productAttributesDataResponse?.success ? productAttributesDataResponse.data : [];

  // Fetch product combinations
  const { 
    data: combinationsResponse, 
    isLoading: isLoadingCombinations,
    error: combinationsError
  } = useQuery<StandardApiResponse<ProductAttributeCombination[]>>({
    queryKey: [`/api/products/${product?.id}/combinations`],
    enabled: !!product?.id && open,
  });
  const combinations = combinationsResponse?.success ? combinationsResponse.data : [];
  
  // Log any attribute-related errors (but don't show toast - attributes are optional)
  useEffect(() => {
    if (categoryAttributesError) {
      console.error('Error loading category attributes:', categoryAttributesError);
    }
    
    if (productAttributesError) {
      console.error('Error loading product attributes:', productAttributesError);
    }
    
    if (combinationsError) {
      console.error('Error loading product combinations:', combinationsError);
    }
    
    // Don't show error toasts for attribute errors as they're optional features
    // The quick view should work fine without attributes
  }, [categoryAttributesError, productAttributesError, combinationsError]);

  // Process product attributes
  useEffect(() => {
    if (productAttributesData && categoryAttributes && productAttributesData.length > 0) {
      const attributesMap: Record<number, Array<{id: number, value: string}>> = {};
      
      // Handle case where categoryAttributes might be an object instead of array
      const categoryAttributesArray = Array.isArray(categoryAttributes) 
        ? categoryAttributes 
        : Object.values(categoryAttributes);
      
      categoryAttributesArray.forEach((catAttr: CategoryAttribute) => {
        // Find product attribute for this category attribute
        const productAttr = productAttributesData.find(
          (pa: ProductAttribute) => pa.categoryAttributeId === catAttr.id
        );
        
        if (productAttr && productAttr.attributeOptions) {
          attributesMap[catAttr.id] = productAttr.attributeOptions;
        }
      });
      
      // Only update if the map is different from current state
      if (JSON.stringify(attributesMap) !== JSON.stringify(productAttributes)) {
        setProductAttributes(attributesMap);
      }
    }
  }, [productAttributesData, categoryAttributes, productAttributes]);

  // Handle attribute change
  const handleAttributeChange = (attributeId: number, value: string) => {
    const newSelectedAttributes = {
      ...selectedAttributes,
      [attributeId]: value,
    };
    
    setSelectedAttributes(newSelectedAttributes);
    
    // Check if there's a matching combination
    if (combinations && combinations.length > 0) {
      // Look for a matching combination
      const matchingCombination = combinations.find((combo: ProductAttributeCombination) => {
        const comboAttrs = combo.attributes;
        
        // Check if all selected attributes match this combination
        let isMatch = true;
        for (const [attrId, attrValue] of Object.entries(newSelectedAttributes)) {
          if (comboAttrs[attrId] !== attrValue) {
            isMatch = false;
            break;
          }
        }
        
        return isMatch;
      });
      
      setCurrentCombination(matchingCombination || null);
    }
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
    if (categoryAttributes && categoryAttributes.length > 0) {
      // Check if all required attributes are selected
      const missingRequiredAttributes = categoryAttributes
        .filter((attr: CategoryAttribute) => attr.required)
        .filter((attr: CategoryAttribute) => !selectedAttributes[attr.id]);
      
      if (missingRequiredAttributes.length > 0) {
        toast({
          title: "Please select options",
          description: `Please select ${missingRequiredAttributes.map((a: CategoryAttribute) => a.name).join(', ')}`,
          variant: "destructive",
        });
        return;
      }
    }
    
    addItem({
      productId: product.id,
      product: product,
      quantity: quantity,
      combinationId: currentCombination?.id || null,
      selectedAttributes: selectedAttributes,
      // No price adjustment based on attributes as per requirements
    });
    
    toast({
      title: "Added to cart",
      description: `${product.name} added to your cart`,
    });
    
    // Close the modal after adding to cart
    onOpenChange(false);
  };
  
  // No price adjustment based on attributes as per requirements
  const adjustedPrice = (product.salePrice || product.price);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogTitle className="text-xl font-bold">{product.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Quick view of {product.name} with pricing and options
        </DialogDescription>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Image */}
          <div>
            <img 
              src={product.imageUrl ? ensureValidImageUrl(product.imageUrl) : 
                  (product.originalImageObjectKey ? ensureValidImageUrl(product.originalImageObjectKey) : '')} 
              alt={product.name} 
              className="w-full h-auto object-cover rounded-md"
            />
          </div>
          
          {/* Product Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{product.name}</h2>
            
            {/* Price and ratings */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xl font-bold text-[#FF69B4]">
                  {formatCurrency(adjustedPrice)}
                </span>
                {product.salePrice && product.price > product.salePrice && (
                  <span className="ml-2 text-sm line-through text-gray-500">
                    {formatCurrency(product.price)}
                  </span>
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
            
            {/* Attribute Selection */}
            {isLoadingAttributes || isLoadingProductAttributes ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                {categoryAttributes && categoryAttributes.length > 0 && productAttributes && (
                  <div className="space-y-3">
                    {categoryAttributes.map((attribute: CategoryAttribute) => (
                      <div key={attribute.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">{attribute.name}</label>
                          {attribute.required && (
                            <Badge variant="outline" className="text-[#FF69B4] text-xs">Required</Badge>
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
                                {option.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </>
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
                SKU: {product.sku} {currentCombination?.sku && `(${currentCombination.sku})`}
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
  );
}