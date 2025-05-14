import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Save, 
  Check, 
  X, 
  AlertTriangle,
  Info,
  Tag,
  ShoppingCart,
  Box,
  ImageIcon,
  CalendarClock
} from 'lucide-react';
import { StepComponentProps } from '../types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const StepReview: React.FC<StepComponentProps> = ({ 
  draft, 
  onSave, 
  onNext, 
  isLoading 
}) => {
  // Fetch additional data needed for review
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      return response.json();
    },
  });
  
  const { data: catalogsData } = useQuery({
    queryKey: ['/api/catalogs'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/catalogs');
      return response.json();
    },
  });
  
  const { data: suppliersData } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/suppliers');
      return response.json();
    },
  });
  
  // Find related objects
  const category = categoriesData?.data?.find((c: any) => c.id === draft.categoryId);
  const catalog = catalogsData?.data?.find((c: any) => c.id === draft.catalogId);
  const supplier = suppliersData?.data?.find((s: any) => s.id === draft.supplierId);
  
  // Determine which data is missing
  const missingData = [];
  if (!draft.name) missingData.push('Product Name');
  if (!draft.description) missingData.push('Description');
  if (!draft.categoryId) missingData.push('Category');
  if (!draft.regularPrice) missingData.push('Regular Price');
  if (!draft.costPrice) missingData.push('Cost Price');
  if (!draft.imageUrls || draft.imageUrls.length === 0) missingData.push('Product Images');
  
  // Format dates for display
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Not set';
    try {
      return format(new Date(dateStr), 'PPP');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Check if product is ready to publish
  const isReadyToPublish = missingData.length === 0;
  
  // Handle publish action
  const handlePublish = () => {
    // Just mark the step as completed
    onSave({
      completedSteps: [...(draft.completedSteps || []), 'review']
    }, false);
  };
  
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold mb-4">Review Product Details</h3>
        
        {!isReadyToPublish && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Missing Information</AlertTitle>
            <AlertDescription>
              The following information is required before publishing:
              <ul className="list-disc pl-5 mt-2">
                {missingData.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {draft.wizardProgress && Object.values(draft.wizardProgress).some(v => !v) && (
          <Alert className="mb-6 border-yellow-500 bg-yellow-50">
            <Info className="h-4 w-4 text-yellow-500" />
            <AlertTitle>Incomplete Steps</AlertTitle>
            <AlertDescription>
              Some steps haven't been completed yet. Make sure all information is entered correctly.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <Tag className="h-4 w-4 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <h4 className="text-sm font-medium">Product Name</h4>
                <p className="text-sm">{draft.name || 'Not set'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium">Slug</h4>
                <p className="text-sm font-mono text-muted-foreground">{draft.slug || 'Not set'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium">Category</h4>
                <p className="text-sm">{category?.name || 'Not set'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium">Catalog</h4>
                <p className="text-sm">{catalog?.name || 'Not set'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium">Supplier</h4>
                <p className="text-sm">{supplier?.name || 'Not set'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium">Description</h4>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {draft.description || 'No description provided'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Pricing & Inventory */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Pricing & Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <h4 className="text-sm font-medium">Regular Price</h4>
                  <p className="text-sm font-semibold">{draft.regularPrice ? formatCurrency(draft.regularPrice) : 'Not set'}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Cost Price</h4>
                  <p className="text-sm">{draft.costPrice ? formatCurrency(draft.costPrice) : 'Not set'}</p>
                </div>
                
                {draft.salePrice && (
                  <div>
                    <h4 className="text-sm font-medium">Sale Price</h4>
                    <p className="text-sm text-green-600 font-semibold">{formatCurrency(draft.salePrice)}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium">Stock Level</h4>
                  <p className="text-sm">{draft.stockLevel !== undefined ? draft.stockLevel : 'Not set'}</p>
                </div>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex flex-wrap gap-2">
                {draft.isActive && <Badge variant="outline" className="bg-green-50">Active</Badge>}
                {!draft.isActive && <Badge variant="outline" className="bg-gray-50">Inactive</Badge>}
                {draft.isFeatured && <Badge variant="outline" className="bg-blue-50">Featured</Badge>}
              </div>
            </CardContent>
          </Card>
          
          {/* Images */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <ImageIcon className="h-4 w-4 mr-2" />
                Product Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              {draft.imageUrls && draft.imageUrls.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {draft.imageUrls.map((url, index) => (
                    <div 
                      key={index} 
                      className={`relative rounded border overflow-hidden ${index === draft.mainImageIndex ? 'ring-2 ring-primary' : ''}`}
                    >
                      <img 
                        src={url} 
                        alt={`Product ${index + 1}`} 
                        className="w-full h-20 object-cover"
                      />
                      {index === draft.mainImageIndex && (
                        <Badge className="absolute top-1 right-1 text-[10px] py-0">Main</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 bg-gray-50 border rounded">
                  <p className="text-sm text-muted-foreground">No images added</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Physical & Promotions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <Box className="h-4 w-4 mr-2" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">Physical Details</h4>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Weight:</span> {draft.weight || 'Not set'}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Dimensions:</span> {draft.dimensions || 'Not set'}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium flex items-center">
                  <CalendarClock className="h-4 w-4 mr-1" />
                  Promotions
                </h4>
                <div className="space-y-2 mt-1">
                  {draft.isFlashDeal && (
                    <div className="bg-yellow-50 p-2 rounded">
                      <p className="text-sm font-medium">Flash Deal</p>
                      <p className="text-xs">Ends: {formatDate(draft.flashDealEnd)}</p>
                    </div>
                  )}
                  
                  {draft.specialSaleText && (
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-sm font-medium">{draft.specialSaleText}</p>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        <p className="text-xs">Start: {formatDate(draft.specialSaleStart)}</p>
                        <p className="text-xs">End: {formatDate(draft.specialSaleEnd)}</p>
                      </div>
                    </div>
                  )}
                  
                  {draft.discountLabel && (
                    <Badge variant="outline">{draft.discountLabel}</Badge>
                  )}
                  
                  {!draft.isFlashDeal && !draft.specialSaleText && !draft.discountLabel && (
                    <p className="text-sm text-muted-foreground">No promotions set</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-between pt-6 mt-4 border-t">
          <div className="flex items-center">
            {isReadyToPublish ? (
              <div className="flex items-center text-green-600">
                <Check className="h-5 w-5 mr-2" />
                <span>Ready to publish</span>
              </div>
            ) : (
              <div className="flex items-center text-red-500">
                <X className="h-5 w-5 mr-2" />
                <span>Missing required information</span>
              </div>
            )}
          </div>
          
          <Button
            type="button"
            onClick={handlePublish}
            disabled={isLoading || !isReadyToPublish}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Confirm & Publish
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};