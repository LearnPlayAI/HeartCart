/**
 * Review And Save Step Component for Product Wizard
 * 
 * This component handles the final step of the product creation process,
 * showing a summary of all information and allowing the user to save the product.
 */

import { useState } from 'react';
import { useProductWizardContext } from '../context';
import { 
  ArrowLeftCircle, 
  Save,
  Edit,
  CheckCircle, 
  AlertTriangle,
  Loader2,
  XCircle,
  Calendar,
  Package,
  Tag,
  ShoppingCart,
  Truck,
  ImageIcon,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export const ReviewAndSaveStep = () => {
  const { 
    state, 
    goToPreviousStep,
    goToStep,
    createProduct,
    updateProduct,
    validateStep,
    isSubmitting,
    isValid
  } = useProductWizardContext();
  
  const [confirmDraft, setConfirmDraft] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Format price in ZAR currency
  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return '-';
    return new Intl.NumberFormat('en-ZA', { 
      style: 'currency', 
      currency: 'ZAR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(price);
  };

  // Format date in a readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'PP');
  };

  // Check if there are issues with the product that would prevent saving
  const hasValidationErrors = !isValid();
  
  // Check if there are warnings (conditions that allow saving but aren't ideal)
  const hasWarnings = () => {
    const warnings = [];
    
    if (!state.description || state.description.length < 20) {
      warnings.push('Product has a very short or missing description');
    }
    
    if (state.imageUrls.length === 0) {
      warnings.push('Product has no images');
    } else if (state.imageUrls.length < 3) {
      warnings.push('Product has fewer than 3 images');
    }
    
    if (!state.categoryId) {
      warnings.push('Product has no category');
    }
    
    if (state.tags.length === 0) {
      warnings.push('Product has no tags, which may affect search visibility');
    }
    
    return warnings;
  };
  
  const warnings = hasWarnings();
  
  // Handle saving the product
  const handleSaveProduct = async (asDraft: boolean = false) => {
    try {
      setErrorMessage(null);
      
      // Validate if not saving as draft
      if (!asDraft && !validateStep()) {
        return;
      }
      
      // Update draft status
      if (state.isDraft !== asDraft) {
        await updateProduct();
      }
      
      // Create or update the product
      if (state.productId) {
        const success = await updateProduct();
        if (success) {
          setSaveStatus('success');
        } else {
          setSaveStatus('error');
          setErrorMessage('Failed to update the product. Please try again.');
        }
      } else {
        const productId = await createProduct();
        if (productId) {
          setSaveStatus('success');
        } else {
          setSaveStatus('error');
          setErrorMessage('Failed to create the product. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error saving product:', error);
      setSaveStatus('error');
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred. Please try again.'
      );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Review and Save Product</h2>
        <p className="text-muted-foreground">
          Review all the information for your product before saving it to your catalog.
        </p>
      </div>

      {/* Save status messages */}
      {saveStatus === 'success' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Product Saved Successfully</AlertTitle>
          <AlertDescription className="text-green-700">
            Your product has been {state.productId ? 'updated' : 'created'} and 
            {state.isDraft ? ' saved as a draft.' : ' is now live in your catalog.'}
          </AlertDescription>
        </Alert>
      )}
      
      {saveStatus === 'error' && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Save Failed</AlertTitle>
          <AlertDescription className="text-red-700">
            {errorMessage || 'There was an error saving the product. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Validation warnings */}
      {warnings.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Product Warnings</AlertTitle>
          <AlertDescription className="text-amber-700">
            <ul className="list-disc list-inside mt-2 space-y-1">
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main review sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>Core product details</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-1"
              onClick={() => goToStep('basic-info')}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="font-medium flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Product Name
              </div>
              <div className="text-sm mt-1">{state.name || <span className="text-muted-foreground italic">Not set</span>}</div>
            </div>
            
            <div>
              <div className="font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                SKU & Inventory
              </div>
              <div className="flex items-center gap-4 mt-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">SKU:</span> {state.sku || 'Not set'}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Stock:</span> {state.stockLevel}
                </div>
              </div>
            </div>
            
            <div>
              <div className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Pricing
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">Cost:</span> {formatPrice(state.costPrice)}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Markup:</span> {state.markupPercentage}%
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Regular:</span> {formatPrice(state.regularPrice)}
                </div>
                {state.salePrice && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Sale:</span> {formatPrice(state.salePrice)}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <div className="font-medium">Description</div>
              <div className="text-sm mt-1 line-clamp-3 text-muted-foreground">
                {state.description || 'No description provided'}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Images */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Product Images</CardTitle>
              <CardDescription>{state.imageUrls.length} image(s) uploaded</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-1"
              onClick={() => goToStep('images')}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            {state.imageUrls.length === 0 ? (
              <div className="bg-muted rounded-md p-8 flex flex-col items-center justify-center text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No images uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {state.imageUrls.slice(0, 6).map((url, i) => (
                  <div
                    key={url}
                    className={cn(
                      "aspect-square rounded-md overflow-hidden border",
                      i === state.mainImageIndex && "ring-2 ring-primary"
                    )}
                  >
                    <img
                      src={url}
                      alt={`Product image ${i + 1}`}
                      className="object-cover w-full h-full"
                    />
                    {i === state.mainImageIndex && (
                      <div className="absolute top-1 left-1 bg-primary text-white text-[10px] px-1 py-0.5 rounded">
                        Main
                      </div>
                    )}
                  </div>
                ))}
                {state.imageUrls.length > 6 && (
                  <div className="aspect-square flex items-center justify-center bg-muted rounded-md">
                    <span className="text-muted-foreground text-sm">+{state.imageUrls.length - 6} more</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Additional Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Specifications</CardTitle>
              <CardDescription>Product details & measurements</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-1"
              onClick={() => goToStep('additional-info')}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="font-medium flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                Product Type
              </div>
              <div className="text-sm mt-1">
                {state.isPhysical ? 'Physical product' : 'Digital or service product'}
              </div>
            </div>
            
            {state.isPhysical && (
              <div>
                <div className="font-medium">Dimensions & Weight</div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {state.weight && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Weight:</span> {state.weight} {state.weightUnit}
                    </div>
                  )}
                  {(state.length || state.width || state.height) && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Dimensions:</span> {state.length || '-'} × {state.width || '-'} × {state.height || '-'} {state.dimensionUnit}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div>
              <div className="font-medium">Tags</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {state.tags.length > 0 ? state.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                )) : (
                  <span className="text-sm text-muted-foreground">No tags added</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Promotions & Visibility */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Promotions & Visibility</CardTitle>
              <CardDescription>How your product appears</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-1"
              onClick={() => goToStep('additional-info')}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-y-3">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    state.isActive ? "bg-green-500" : "bg-red-500"
                  )} />
                  Status
                </div>
                <div className="text-sm mt-0.5">
                  {state.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              
              <div>
                <div className="font-medium flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    state.isFeatured ? "bg-amber-500" : "bg-gray-300"
                  )} />
                  Featured
                </div>
                <div className="text-sm mt-0.5">
                  {state.isFeatured ? 'Featured product' : 'Not featured'}
                </div>
              </div>
              
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  Shipping
                </div>
                <div className="text-sm mt-0.5">
                  {state.freeShipping ? 'Free shipping' : 'Standard shipping rates'}
                </div>
              </div>
              
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Flash Deal
                </div>
                <div className="text-sm mt-0.5">
                  {state.hasFlashDeal ? (
                    <span>
                      {formatPrice(state.flashDealPrice)} from {formatDate(state.flashDealStartDate)} to {formatDate(state.flashDealEndDate)}
                    </span>
                  ) : (
                    <span>No flash deal</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Separator />
      
      {/* Save options */}
      <div className="space-y-4">
        <div className="flex items-start space-x-2">
          <Checkbox 
            id="confirm-draft" 
            checked={confirmDraft}
            onCheckedChange={(checked) => setConfirmDraft(!!checked)}
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="confirm-draft"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Save as Draft
            </label>
            <p className="text-sm text-muted-foreground">
              Save this product as a draft that won't be visible to customers until published.
            </p>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={goToPreviousStep}
            className="flex items-center gap-2"
            disabled={isSubmitting || saveStatus === 'success'}
          >
            <ArrowLeftCircle className="h-4 w-4" />
            <span>Back to Details</span>
          </Button>
          
          <Button
            type="button"
            onClick={() => handleSaveProduct(confirmDraft)}
            className="flex items-center gap-2"
            disabled={isSubmitting || (!confirmDraft && hasValidationErrors) || saveStatus === 'success'}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>
              {state.productId
                ? (confirmDraft ? 'Update as Draft' : 'Update Product')
                : (confirmDraft ? 'Save as Draft' : 'Create Product')}
            </span>
          </Button>
          
          {hasValidationErrors && !confirmDraft && (
            <p className="text-sm text-red-500">
              Please fix the errors in previous steps before saving this product.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewAndSaveStep;