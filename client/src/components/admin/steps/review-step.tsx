import { UseFormReturn } from "react-hook-form";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Category } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, AlertCircle, Tag } from "lucide-react";

interface ReviewStepProps {
  form: UseFormReturn<any>;
  uploadedImages?: any[];
  categories?: Category[];
}

export function ReviewStep({ form, uploadedImages = [], categories: propCategories }: ReviewStepProps) {
  const formValues = form.getValues();
  
  // Fetch category info if not provided as prop
  const { data: fetchedCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: !propCategories || propCategories.length === 0
  });
  
  const categories = propCategories || fetchedCategories;
  
  const categoryName = categories?.find(c => c.id === formValues.categoryId)?.name || "Unknown";
  
  // Format fields for display
  const costPrice = typeof formValues.costPrice === 'number'
    ? `R${formValues.costPrice.toFixed(2)}`
    : 'Not set';
    
  const price = typeof formValues.price === 'number' 
    ? `R${formValues.price.toFixed(2)}` 
    : 'Not set';
  
  const salePrice = typeof formValues.salePrice === 'number' && formValues.salePrice > 0
    ? `R${formValues.salePrice.toFixed(2)}`
    : 'None';
  
  const discount = formValues.discount && formValues.discount > 0
    ? `${formValues.discount}%`
    : 'None';
  
  const flashDealEnd = formValues.flashDealEnd && formValues.isFlashDeal
    ? format(new Date(formValues.flashDealEnd), 'PPP')
    : 'N/A';
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Review Your Product</h3>
        <p className="text-sm text-muted-foreground">
          Verify all the details before publishing your product.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Name</p>
              <p className="text-sm">{formValues.name || "Not set"}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Category</p>
              <p className="text-sm">{categoryName}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">URL Slug</p>
              <p className="text-sm font-mono">{formValues.slug || "Not set"}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Brand</p>
              <p className="text-sm">{formValues.brand || "Not set"}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Description</p>
              <p className="text-sm line-clamp-3">{formValues.description || "Not set"}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Status</p>
              {formValues.isActive ? (
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm">Active</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-amber-500 mr-1" />
                  <span className="text-sm">Draft</span>
                </div>
              )}
            </div>

            {/* SKU field removed as it's not in our schema */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Cost Price (Wholesale)</p>
              <p className="text-sm">{costPrice}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Regular Price (Retail)</p>
              <p className="text-sm font-medium">{price}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Sale Price</p>
              <p className="text-sm">{salePrice}</p>
            </div>
            
            {/* Profit calculation */}
            {typeof formValues.price === 'number' && typeof formValues.costPrice === 'number' && (
              <div className="space-y-1 mt-2 pt-2 border-t">
                <p className="text-sm font-medium">Profit Calculation</p>
                <div className="bg-pink-50 dark:bg-pink-900/10 p-2 rounded-md">
                  <p className="text-xs">
                    <span className="font-medium">Profit:</span> {
                      `R${(formValues.price - formValues.costPrice).toFixed(2)}`
                    }
                  </p>
                  <p className="text-xs">
                    <span className="font-medium">Margin:</span> {
                      `${((formValues.price - formValues.costPrice) / formValues.price * 100).toFixed(1)}%`
                    }
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Discount</p>
              <p className="text-sm">{discount}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Flash Deal</p>
              {formValues.isFlashDeal ? (
                <div>
                  <Badge variant="outline" className="bg-amber-100">Active</Badge>
                  <p className="text-xs mt-1">Ends on: {flashDealEnd}</p>
                </div>
              ) : (
                <p className="text-sm">Not active</p>
              )}
            </div>
            
            {/* Stock quantity removed as business doesn't keep inventory */}

            <div className="space-y-1">
              <p className="text-sm font-medium">Shipping</p>
              <div className="flex flex-col gap-1">
                <div className="flex items-center">
                  <span className="text-sm">{formValues.freeShipping ? "Free shipping" : "Standard shipping rates"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <CardDescription>Keywords for searchability</CardDescription>
        </CardHeader>
        <CardContent>
          {formValues.tags && formValues.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {formValues.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tags added</p>
          )}
        </CardContent>
      </Card>
      
      {/* Product Images */}
      <Card>
        <CardHeader>
          <CardTitle>Product Images</CardTitle>
          <CardDescription>Images that will be displayed on the product page</CardDescription>
        </CardHeader>
        <CardContent>
          {uploadedImages && uploadedImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {uploadedImages.map((image: any, index: number) => (
                <div key={index} className="relative group aspect-square rounded-md overflow-hidden border">
                  <img 
                    src={image.url} 
                    alt={`Product image ${index + 1}`}
                    className="h-full w-full object-cover transition-all"
                  />
                  {image.isMain && (
                    <div className="absolute top-1.5 left-1.5">
                      <Badge variant="default" className="bg-pink-500">Main</Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No images uploaded</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}