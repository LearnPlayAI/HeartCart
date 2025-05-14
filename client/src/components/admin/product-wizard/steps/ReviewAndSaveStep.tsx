import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Check, X, AlertTriangle, Save } from 'lucide-react';
import { format } from 'date-fns';
import { ProductDraft } from '../ProductWizard';

interface ReviewAndSaveStepProps {
  draft: ProductDraft;
  onSave: (data: any) => void;
  isLoading: boolean;
}

export const ReviewAndSaveStep: React.FC<ReviewAndSaveStepProps> = ({ draft, onSave, isLoading }) => {
  const { toast } = useToast();
  
  // Get categories for displaying category name
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      return response.json();
    },
  });
  
  // Get attributes for displaying attribute names
  const { data: attributesData } = useQuery({
    queryKey: ['/api/product-attributes'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/product-attributes');
      return response.json();
    },
  });
  
  // Check if all required steps are completed
  const requiredSteps = ['basic-info', 'images'];
  const incompleteSteps = requiredSteps.filter(step => !draft.completedSteps?.includes(step));
  
  // Get category name
  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return 'None';
    const category = categoriesData?.data?.find((cat: any) => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  };
  
  // Get attribute name and value display
  const getAttributeDisplay = (attributeId: number, value: string | string[] | null) => {
    if (!attributesData?.data) return { name: 'Loading...', value: value?.toString() || 'None' };
    
    const attribute = attributesData.data.find((attr: any) => attr.id === attributeId);
    if (!attribute) return { name: 'Unknown', value: value?.toString() || 'None' };
    
    // Format the value based on attribute type
    let formattedValue: string;
    if (Array.isArray(value)) {
      formattedValue = value.join(', ');
    } else if (value === null) {
      formattedValue = 'None';
    } else {
      formattedValue = value;
    }
    
    return { name: attribute.displayName || attribute.name, value: formattedValue };
  };
  
  // Handle the final save action
  const handleSave = () => {
    // The save action is the same as for other steps, just pass an empty object
    // The actual publishing will be handled by the parent component
    onSave({});
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Validation summary */}
          {incompleteSteps.length > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-amber-800 font-medium">Please complete the following steps:</h3>
                  <ul className="mt-2 list-disc list-inside text-amber-700">
                    {incompleteSteps.map(step => (
                      <li key={step}>{
                        step === 'basic-info' ? 'Basic Information' : 
                        step === 'images' ? 'Product Images' : 
                        step === 'additional-info' ? 'Additional Information' : 
                        step
                      }</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-600 mr-3" />
                <p className="text-green-800 font-medium">All required steps are completed! Review the information below and submit.</p>
              </div>
            </div>
          )}
          
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Product Name</p>
                <p className="text-base">{draft.name || 'Not specified'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Slug</p>
                <p className="text-base">{draft.slug || 'Not specified'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Category</p>
                <p className="text-base">{getCategoryName(draft.categoryId)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Stock Level</p>
                <p className="text-base">{draft.stockLevel !== null ? draft.stockLevel : 'Not specified'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Regular Price</p>
                <p className="text-base">
                  {draft.regularPrice !== null ? `$${draft.regularPrice.toFixed(2)}` : 'Not specified'}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Sale Price</p>
                <p className="text-base">
                  {draft.salePrice !== null ? `$${draft.salePrice.toFixed(2)}` : 'Not applicable'}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge className={draft.isActive ? "bg-green-100 text-green-800" : ""}>
                  {draft.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Featured</p>
                <Badge className={draft.isFeatured ? "bg-green-100 text-green-800" : ""}>
                  {draft.isFeatured ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="text-base whitespace-pre-wrap">{draft.description || 'No description provided'}</p>
            </div>
          </div>
          
          <Separator />
          
          {/* Images */}
          <div>
            <h3 className="text-lg font-medium mb-4">Product Images</h3>
            {draft.imageUrls && draft.imageUrls.length > 0 ? (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {draft.imageUrls.map((url, index) => (
                    <div 
                      key={index} 
                      className={`relative border rounded-md overflow-hidden ${
                        index === draft.mainImageIndex ? 'border-primary ring-2 ring-primary' : 'border-gray-200'
                      }`}
                    >
                      <img 
                        src={url} 
                        alt={`Product image ${index + 1}`} 
                        className="w-full h-24 object-cover"
                      />
                      {index === draft.mainImageIndex && (
                        <div className="absolute top-2 left-2 bg-primary text-white px-2 py-0.5 rounded text-xs">
                          Main
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">Total images: {draft.imageUrls.length}</p>
              </div>
            ) : (
              <p className="text-yellow-600">No images have been added</p>
            )}
          </div>
          
          <Separator />
          
          {/* Additional Information */}
          <div>
            <h3 className="text-lg font-medium mb-4">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Dimensions</p>
                <p className="text-base">{draft.dimensions || 'Not specified'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Weight</p>
                <p className="text-base">{draft.weight || 'Not specified'}</p>
              </div>
              
              {draft.discountLabel && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Discount Label</p>
                  <p className="text-base">{draft.discountLabel}</p>
                </div>
              )}
              
              {draft.specialSaleText && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Special Sale</p>
                  <p className="text-base">{draft.specialSaleText}</p>
                </div>
              )}
              
              {draft.specialSaleStart && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Sale Start Date</p>
                  <p className="text-base">{format(new Date(draft.specialSaleStart), 'PPP')}</p>
                </div>
              )}
              
              {draft.specialSaleEnd && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Sale End Date</p>
                  <p className="text-base">{format(new Date(draft.specialSaleEnd), 'PPP')}</p>
                </div>
              )}
              
              {draft.isFlashDeal && (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Flash Deal</p>
                    <Badge className="bg-yellow-100 text-yellow-800">Yes</Badge>
                  </div>
                  
                  {draft.flashDealEnd && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Flash Deal End Date</p>
                      <p className="text-base">{format(new Date(draft.flashDealEnd), 'PPP')}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          <Separator />
          
          {/* Attributes */}
          {draft.attributes && draft.attributes.length > 0 && (
            <>
              <div>
                <h3 className="text-lg font-medium mb-4">Product Attributes</h3>
                <div className="space-y-3">
                  {draft.attributes.map((attr, index) => {
                    const { name, value } = getAttributeDisplay(attr.attributeId, attr.value);
                    return (
                      <div key={index} className="flex items-start py-2 border-b border-gray-100">
                        <div className="w-1/3 font-medium">{name}</div>
                        <div className="w-2/3">{value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Separator />
            </>
          )}
          
          {/* Summary & Save */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Ready to Publish?</h3>
            <p className="text-gray-600 mb-4">
              {draft.originalProductId 
                ? 'This will update the existing product with the information above.' 
                : 'This will create a new product with the information above.'}
            </p>
            
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isLoading || incompleteSteps.length > 0}
                size="lg"
              >
                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                <Save className="mr-2 h-5 w-5" />
                {draft.originalProductId ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewAndSaveStep;