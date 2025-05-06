import { UseFormReturn } from 'react-hook-form';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Category } from '@shared/schema';

interface ReviewStepProps {
  form: UseFormReturn<any>;
  uploadedImages: any[];
  categories: Category[];
}

export function ReviewStep({ form, uploadedImages, categories }: ReviewStepProps) {
  const formValues = form.getValues();
  
  // Find category name from ID
  const categoryName = categories.find(c => c.id === formValues.categoryId)?.name || 'Unknown';
  
  const formatDate = (date: Date | null) => {
    if (!date) return 'Not set';
    return new Intl.DateTimeFormat('en-ZA', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(date));
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="bg-pink-50 dark:bg-pink-900/10 p-4 rounded-lg border border-pink-100 dark:border-pink-900/30 mb-6">
        <h3 className="text-lg font-medium text-pink-800 dark:text-pink-300 mb-2">Review Your Product</h3>
        <p className="text-sm text-pink-700 dark:text-pink-400">
          Please review all the product information before submitting. You can go back to previous steps to make changes if needed.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column - Basic details */}
        <div className="space-y-6">
          <div className="border rounded-md overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-medium">
              Basic Information
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Product Name</h4>
                <p className="mt-1">{formValues.name}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">URL Slug</h4>
                <p className="mt-1">{formValues.slug}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Category</h4>
                <p className="mt-1">{categoryName}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Price</h4>
                  <p className="mt-1">{formatCurrency(formValues.price)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Stock</h4>
                  <p className="mt-1">{formValues.stock} units</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border rounded-md overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-medium">
              Description & Details
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Description</h4>
                <p className="mt-1 text-sm whitespace-pre-wrap">{formValues.description || 'No description provided'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Brand</h4>
                <p className="mt-1">{formValues.brand || 'Not specified'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Tags</h4>
                <div className="mt-1 flex flex-wrap gap-1">
                  {formValues.tags && formValues.tags.length > 0 ? (
                    formValues.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">No tags</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column - Pricing and flags */}
        <div className="space-y-6">
          <div className="border rounded-md overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-medium">
              Pricing & Discounts
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Regular Price</h4>
                  <p className="mt-1">{formatCurrency(formValues.price)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Sale Price</h4>
                  <p className="mt-1">
                    {formValues.salePrice ? formatCurrency(formValues.salePrice) : 'Not set'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Discount</h4>
                  <p className="mt-1">{formValues.discount}%</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Free Shipping</h4>
                  <p className="mt-1 flex items-center">
                    {formValues.freeShipping ? (
                      <>
                        <Check className="h-4 w-4 text-green-500 mr-1" />
                        <span>Yes</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-500 mr-1" />
                        <span>No</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Flash Deal</h4>
                {formValues.isFlashDeal ? (
                  <div className="mt-1">
                    <p className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-1" />
                      <span>Yes, ends at:</span>
                    </p>
                    <p className="text-sm text-pink-600 font-medium mt-1">
                      {formatDate(formValues.flashDealEnd)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 flex items-center">
                    <X className="h-4 w-4 text-red-500 mr-1" />
                    <span>No</span>
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="border rounded-md overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-medium">
              Product Status
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Active</h4>
                  <p className="mt-1 flex items-center">
                    {formValues.isActive ? (
                      <>
                        <Check className="h-4 w-4 text-green-500 mr-1" />
                        <span>Visible to customers</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-500 mr-1" />
                        <span>Hidden</span>
                      </>
                    )}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Featured</h4>
                  <p className="mt-1 flex items-center">
                    {formValues.isFeatured ? (
                      <>
                        <Check className="h-4 w-4 text-green-500 mr-1" />
                        <span>Shows on homepage</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-500 mr-1" />
                        <span>Not featured</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border rounded-md overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-medium">
              Images
            </div>
            <div className="p-4">
              {uploadedImages && uploadedImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative border rounded-md overflow-hidden aspect-square">
                      <img 
                        src={image.bgRemovedUrl || image.url} 
                        alt={`Product image ${index + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {image.isMain && (
                        <div className="absolute top-1 left-1 bg-pink-600 text-white text-xs px-1.5 py-0.5 rounded">
                          Main
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No images uploaded yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}