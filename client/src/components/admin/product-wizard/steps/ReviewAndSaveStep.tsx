/**
 * Review and Save Step Component
 * 
 * Displays a summary of all product information for final review
 * before saving, allowing the user to verify their inputs.
 */

import React, { useEffect } from 'react';
import { useProductWizardContext } from '../context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  EditIcon, 
  StarIcon, 
  TagIcon,
  PackageIcon,
  DollarSignIcon,
  InfoIcon,
  ImageIcon,
  CornerDownRightIcon,
  ShoppingCartIcon,
  TruckIcon,
  CalendarIcon,
  ClockIcon,
  Loader2
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatPrice } from '@/utils/string-utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { WIZARD_STEPS } from '../context';
import { ensureValidImageUrl } from '@/utils/file-manager';

const ReviewAndSaveStep: React.FC = () => {
  const { 
    state, 
    goToStep, 
    validateStep, 
    markStepComplete, 
    createProduct, 
    updateProduct,
    isSubmitting 
  } = useProductWizardContext();
  
  // Auto-validate on mount to check for errors and mark completed steps
  useEffect(() => {
    const isValid = validateStep('review');
    
    if (isValid) {
      markStepComplete('review');
    }
  }, [validateStep, markStepComplete]);
  
  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return format(new Date(dateString), 'PP');
  };
  
  // Handle save/update
  const handleSave = async () => {
    if (state.productId) {
      await updateProduct();
    } else {
      await createProduct();
    }
  };

  return (
    <div className="product-wizard-review space-y-6">
      <h2 className="text-2xl font-bold">Review & Save</h2>
      <p className="text-muted-foreground">
        Review your product information before saving. Make any necessary changes by going back to the previous steps.
      </p>
      
      {/* Basic Information */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <InfoIcon className="h-5 w-5 mr-2" />
              Basic Information
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => goToStep('basic-info')}
            >
              <EditIcon className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Product Name</div>
            <div className="font-medium">{state.name || 'Not set'}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground">SKU</div>
            <div className="font-medium">{state.sku || 'Not set'}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground">URL Slug</div>
            <div className="font-medium text-primary-foreground/80">
              {state.slug || 'Not set'}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground">Brand</div>
            <div className="font-medium">{state.brand || 'Not set'}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground">Category</div>
            <div className="font-medium">{state.categoryName || 'Not set'}</div>
          </div>
          
          <div className="space-y-1 md:col-span-2">
            <div className="text-muted-foreground">Description</div>
            <div className="font-medium">
              {state.description || 'No description provided'}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Pricing & Inventory */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <DollarSignIcon className="h-5 w-5 mr-2" />
              Pricing & Inventory
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => goToStep('basic-info')}
            >
              <EditIcon className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-6">
            <div className="space-y-1">
              <div className="text-muted-foreground">Cost Price</div>
              <div className="font-medium">
                {state.costPrice ? `$${state.costPrice.toFixed(2)}` : 'Not set'}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-muted-foreground">Markup</div>
              <div className="font-medium">
                {state.markupPercentage}%
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-muted-foreground">Regular Price</div>
              <div className="font-medium">
                {state.regularPrice ? `$${state.regularPrice.toFixed(2)}` : 'Not set'}
              </div>
            </div>
            
            {state.salePrice && (
              <>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Sale Price</div>
                  <div className="font-medium text-red-500">
                    ${state.salePrice.toFixed(2)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-muted-foreground">Sale Start</div>
                  <div className="font-medium">
                    {formatDate(state.saleStartDate)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-muted-foreground">Sale End</div>
                  <div className="font-medium">
                    {formatDate(state.saleEndDate)}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-6">
            <div className="space-y-1">
              <div className="text-muted-foreground">Stock Level</div>
              <div className="font-medium">{state.stockLevel}</div>
            </div>
            
            <div className="space-y-1">
              <div className="text-muted-foreground">Low Stock Threshold</div>
              <div className="font-medium">{state.lowStockThreshold}</div>
            </div>
            
            <div className="space-y-1">
              <div className="text-muted-foreground">Backorders</div>
              <div className="font-medium">
                {state.backorderEnabled ? 'Allowed' : 'Not allowed'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Images */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <ImageIcon className="h-5 w-5 mr-2" />
              Images
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => goToStep('images')}
            >
              <EditIcon className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {state.imageUrls.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {state.imageUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <div 
                    className={cn(
                      "border rounded-md overflow-hidden aspect-square",
                      index === state.mainImageIndex ? "border-primary" : "border-border"
                    )}
                  >
                    <img 
                      src={ensureValidImageUrl(url)}
                      alt={`Product image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {index === state.mainImageIndex && (
                    <Badge className="absolute top-2 left-2 bg-primary">
                      <StarIcon className="h-3 w-3 mr-1" /> Main
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No images have been added to this product.
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Additional Information */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <PackageIcon className="h-5 w-5 mr-2" />
              Additional Information
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => goToStep('additional-info')}
            >
              <EditIcon className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Physical Properties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Product Type</div>
                <div className="font-medium">
                  {state.isPhysical ? 'Physical Product' : 'Digital Product'}
                </div>
              </div>
              
              {state.isPhysical && (
                <>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Free Shipping</div>
                    <div className="font-medium">
                      {state.freeShipping ? 'Yes' : 'No'}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Weight</div>
                    <div className="font-medium">
                      {state.weight ? `${state.weight} ${state.weightUnit}` : 'Not set'}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Dimensions</div>
                    <div className="font-medium">
                      {state.length && state.width && state.height ? 
                        `${state.length} × ${state.width} × ${state.height} ${state.dimensionUnit}` : 
                        'Not set'
                      }
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <Separator />
            
            {/* Tags & Dates */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-muted-foreground">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {state.tags.length > 0 ? (
                    state.tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No tags added</span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground">Publish Date</div>
                  <div className="font-medium">
                    {formatDate(state.publishDate)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-muted-foreground">Expiry Date</div>
                  <div className="font-medium">
                    {formatDate(state.expiryDate)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Status & Visibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <ShoppingCartIcon className="h-5 w-5 mr-2" />
            Status & Visibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant={state.isActive && !state.isDraft ? "default" : "outline"}>
              {state.isActive && !state.isDraft ? 'Active' : 'Inactive'}
            </Badge>
            
            {state.isDraft && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                Draft
              </Badge>
            )}
            
            {state.isFeatured && (
              <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                <StarIcon className="h-3 w-3 mr-1" /> Featured
              </Badge>
            )}
            
            {state.isNew && (
              <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                New
              </Badge>
            )}
            
            {state.freeShipping && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                <TruckIcon className="h-3 w-3 mr-1" /> Free Shipping
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Save Button */}
      <div className="flex justify-center mt-8">
        <Button
          size="lg"
          className="min-w-[200px]"
          onClick={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {state.productId ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              {state.productId ? 'Update Product' : 'Create Product'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ReviewAndSaveStep;