/**
 * Review & Save Step Component
 * 
 * This component implements Step 4 of the product wizard,
 * showing a comprehensive summary and preview of the product
 * before final submission.
 */

import React from 'react';
import { useProductWizard } from '../context';
import { WizardStep, WizardActionType } from '../types';
import { 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  ShoppingBag,
  Tag,
  Truck,
  Clock,
  Star,
  ImageIcon,
  Edit,
  AlertTriangle,
  Save
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ReviewSaveStepProps {
  className?: string;
}

const ReviewSaveStep: React.FC<ReviewSaveStepProps> = ({ className }) => {
  const { state, dispatch } = useProductWizard();
  const { productData } = state;
  
  // Helper function to navigate to a specific step for editing
  const navigateToStep = (step: WizardStep) => {
    dispatch({
      type: WizardActionType.SET_STEP,
      payload: step
    });
  };
  
  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return `R${amount.toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Not set';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Check if product has sale price
  const hasDiscount = productData.salePrice && productData.salePrice < productData.price;
  
  // Calculate discount percentage
  const calculateDiscountPercentage = () => {
    if (!productData.price || !productData.salePrice || productData.salePrice >= productData.price) {
      return 0;
    }
    
    return Math.round(((productData.price - productData.salePrice) / productData.price) * 100);
  };
  
  // Validation checks for various sections
  const validations = {
    basicInfo: {
      name: !!productData.name,
      price: productData.price > 0,
      description: !!productData.description,
      category: !!productData.categoryId,
      slug: !!productData.slug
    },
    images: {
      hasMainImage: productData.uploadedImages?.some(img => img.isMain) || !!productData.imageUrl,
      validImages: (productData.uploadedImages?.length || 0) > 0
    },
    additionalInfo: {
      sku: !!productData.sku,
      validDates: !productData.isFlashDeal || (!!productData.flashDealStart && !!productData.flashDealEnd),
      specialSaleDates: !productData.specialSaleText || (!!productData.specialSaleStart && !!productData.specialSaleEnd),
      status: !!productData.status
    }
  };
  
  // Get validation status for sections
  const sectionStatus = {
    basicInfo: Object.values(validations.basicInfo).every(Boolean),
    images: Object.values(validations.images).every(Boolean),
    additionalInfo: Object.values(validations.additionalInfo).every(Boolean)
  };
  
  // Get overall validation status
  const isValid = Object.values(sectionStatus).every(Boolean);
  
  return (
    <div className={className}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Review & Save Product</h2>
        <p className="text-muted-foreground">
          Review all information before saving your product.
        </p>
      </div>
      
      {!isValid && (
        <Card className="mb-6 border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-medium">Missing Information</h3>
            </div>
            <p className="mt-2 text-sm">
              Some required information is missing or incomplete. Please review the sections below.
            </p>
            <div className="mt-3 space-y-2">
              {!sectionStatus.basicInfo && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Basic Info needs completion</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-auto"
                    onClick={() => navigateToStep(WizardStep.BASIC_INFO)}
                  >
                    Fix Issues
                  </Button>
                </div>
              )}
              
              {!sectionStatus.images && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Product Images section incomplete</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-auto"
                    onClick={() => navigateToStep(WizardStep.PRODUCT_IMAGES)}
                  >
                    Fix Issues
                  </Button>
                </div>
              )}
              
              {!sectionStatus.additionalInfo && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Additional Info section needs attention</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-auto"
                    onClick={() => navigateToStep(WizardStep.ADDITIONAL_INFO)}
                  >
                    Fix Issues
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Product Info Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="sales">Sales Info</TabsTrigger>
            </TabsList>
            
            <TabsContent value="images" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Product Images</CardTitle>
                </CardHeader>
                <CardContent>
                  {productData.uploadedImages && productData.uploadedImages.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {productData.uploadedImages.map((image, index) => (
                        <div 
                          key={index} 
                          className={`relative border rounded-md overflow-hidden aspect-[4/3] ${image.isMain ? 'ring-2 ring-primary' : ''}`}
                        >
                          <img 
                            src={image.url} 
                            alt={`Product image ${index + 1}`} 
                            className="object-cover w-full h-full"
                            onError={(e) => {
                              console.error('Image failed to load', e);
                              e.currentTarget.src = ''; // Clear src on error
                              e.currentTarget.classList.add('hidden');
                              e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center hidden fallback-icon">
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                          </div>
                          {image.isMain && (
                            <Badge className="absolute top-2 left-2 bg-primary">Main</Badge>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white px-2 py-1 text-xs truncate">
                            {image.file?.relativePath || 'Uploaded image'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4">
                      <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No images uploaded yet</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateToStep(WizardStep.PRODUCT_IMAGES)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Images
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Product Name</h4>
                      <p className="text-base">{productData.name || 'Not set'}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">SKU</h4>
                      <p className="text-base">{productData.sku || 'Not set'}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Brand</h4>
                      <p className="text-base">{productData.brand || 'Not set'}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                      <p className="text-base capitalize">{productData.status || 'Draft'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Short Description</h4>
                    <p className="text-base">{productData.shortDescription || 'Not set'}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(productData.tags || []).length > 0 ? (
                        (productData.tags || []).map((tag, i) => (
                          <Badge key={i} variant="secondary">{tag}</Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No tags added</p>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateToStep(WizardStep.BASIC_INFO)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Basic Info
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Cost Price</h4>
                      <p className="text-base">{formatCurrency(productData.costPrice)}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Regular Price</h4>
                      <p className="text-base">{formatCurrency(productData.price)}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Sale Price</h4>
                      <p className="text-base">{productData.salePrice ? formatCurrency(productData.salePrice) : 'Not on sale'}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Minimum Price</h4>
                      <p className="text-base">{formatCurrency(productData.minimumPrice)}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateToStep(WizardStep.BASIC_INFO)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Pricing
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Product Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none">
                    {productData.description ? (
                      <div dangerouslySetInnerHTML={{ __html: productData.description }} />
                    ) : (
                      <p className="text-muted-foreground">No description provided</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateToStep(WizardStep.BASIC_INFO)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Description
                  </Button>
                </CardFooter>
              </Card>
              

            </TabsContent>
            
            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">Flash Deal</h4>
                        {productData.isFlashDeal ? (
                          <Badge variant="success" className="ml-auto bg-green-500">Enabled</Badge>
                        ) : (
                          <Badge variant="outline" className="ml-auto">Disabled</Badge>
                        )}
                      </div>
                      
                      {productData.isFlashDeal && (
                        <div className="grid grid-cols-2 gap-2 pl-2 border-l-2 border-primary/20 ml-2">
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground">Start Date</h5>
                            <p className="text-sm">{formatDate(productData.flashDealStart)}</p>
                          </div>
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground">End Date</h5>
                            <p className="text-sm">{formatDate(productData.flashDealEnd)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">Special Sale</h4>
                        {productData.specialSaleText ? (
                          <Badge variant="success" className="ml-auto bg-green-500">Enabled</Badge>
                        ) : (
                          <Badge variant="outline" className="ml-auto">Disabled</Badge>
                        )}
                      </div>
                      
                      {productData.specialSaleText && (
                        <div className="space-y-2 pl-2 border-l-2 border-primary/20 ml-2">
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground">Sale Text</h5>
                            <p className="text-sm">{productData.specialSaleText}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground">Start Date</h5>
                              <p className="text-sm">{formatDate(productData.specialSaleStart)}</p>
                            </div>
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground">End Date</h5>
                              <p className="text-sm">{formatDate(productData.specialSaleEnd)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="text-sm font-medium">Free Shipping</h4>
                        <p className="text-xs text-muted-foreground">
                          {productData.freeShipping ? 'Enabled' : 'Not enabled'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="text-sm font-medium">Featured Product</h4>
                        <p className="text-xs text-muted-foreground">
                          {productData.isFeatured ? 'Shown in featured section' : 'Not featured'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="text-sm font-medium">Minimum Order</h4>
                        <p className="text-xs text-muted-foreground">
                          {productData.minimumOrder || 1} units
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateToStep(WizardStep.ADDITIONAL_INFO)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Sales Configuration
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="space-y-6">
          {/* Product Card Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Product Card Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden shadow-sm">
                <div className="aspect-[4/3] relative bg-gray-100 dark:bg-gray-800">
                  {productData.uploadedImages && productData.uploadedImages.length > 0 ? (
                    // Use URL.createObjectURL for blob URLs or direct URL for server images
                    <img 
                      src={productData.uploadedImages.find(img => img.isMain)?.url || productData.uploadedImages[0]?.url || productData.imageUrl || ''} 
                      alt={productData.name || 'Product image'} 
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        console.error('Image failed to load:', e);
                        // Hide the failed image
                        e.currentTarget.classList.add('hidden');
                        // Show the fallback icon
                        e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Hidden fallback icon that shows if image fails to load */}
                  <div className="flex items-center justify-center h-full fallback-icon hidden">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                  
                  {/* Discount badge */}
                  {hasDiscount && (
                    <Badge className="absolute top-2 left-2 bg-red-500">
                      {calculateDiscountPercentage()}% OFF
                    </Badge>
                  )}
                  
                  {/* Flash deal badge */}
                  {productData.isFlashDeal && (
                    <Badge className="absolute top-2 right-2 bg-orange-500">
                      Flash Deal
                    </Badge>
                  )}
                </div>
                
                <div className="p-3 space-y-2">
                  <h3 className="font-medium line-clamp-2">{productData.name || 'Product Name'}</h3>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold">
                      {formatCurrency(productData.salePrice || productData.price)}
                    </span>
                    
                    {hasDiscount && (
                      <span className="text-sm line-through text-muted-foreground">
                        {formatCurrency(productData.price)}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {productData.shortDescription || productData.description?.substr(0, 100) || 'No description available'}
                  </p>
                  
                  <div className="flex items-center justify-between pt-2">
                    {productData.freeShipping && (
                      <Badge variant="outline" className="text-xs">Free Shipping</Badge>
                    )}
                    
                    {productData.specialSaleText && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {productData.specialSaleText}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Validation Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Validation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {sectionStatus.basicInfo ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <h4 className="font-medium">Basic Information</h4>
                </div>
                
                {!sectionStatus.basicInfo && (
                  <div className="ml-7 text-sm text-muted-foreground space-y-1">
                    {!validations.basicInfo.name && <p className="text-red-500">• Product name required</p>}
                    {!validations.basicInfo.price && <p className="text-red-500">• Valid price required</p>}
                    {!validations.basicInfo.description && <p className="text-red-500">• Description required</p>}
                    {!validations.basicInfo.category && <p className="text-red-500">• Category selection required</p>}
                    {!validations.basicInfo.slug && <p className="text-red-500">• Product slug required</p>}
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {sectionStatus.images ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <h4 className="font-medium">Product Images</h4>
                </div>
                
                {!sectionStatus.images && (
                  <div className="ml-7 text-sm text-muted-foreground space-y-1">
                    {!validations.images.hasMainImage && <p className="text-red-500">• Main image required</p>}
                    {!validations.images.validImages && <p className="text-red-500">• At least one image required</p>}
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {sectionStatus.additionalInfo ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <h4 className="font-medium">Additional Information</h4>
                </div>
                
                {!sectionStatus.additionalInfo && (
                  <div className="ml-7 text-sm text-muted-foreground space-y-1">
                    {!validations.additionalInfo.sku && <p className="text-red-500">• SKU required</p>}
                    {!validations.additionalInfo.validDates && <p className="text-red-500">• Flash deal dates required</p>}
                    {!validations.additionalInfo.specialSaleDates && <p className="text-red-500">• Special sale dates required</p>}
                    {!validations.additionalInfo.status && <p className="text-red-500">• Product status required</p>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Final Actions */}
          <Card className={`${isValid ? 'border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-800' : ''}`}>
            <CardContent className="p-4">
              {isValid ? (
                <div className="text-center space-y-2">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                  <h3 className="font-medium text-lg">Ready to Save</h3>
                  <p className="text-sm text-muted-foreground">
                    All required information has been provided. You can now save your product.
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto" />
                  <h3 className="font-medium text-lg">Review Needed</h3>
                  <p className="text-sm text-muted-foreground">
                    Please fix the highlighted issues before saving.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReviewSaveStep;