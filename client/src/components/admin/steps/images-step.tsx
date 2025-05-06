import { UseFormReturn } from "react-hook-form";
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage, 
  FormDescription 
} from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { ProductImage } from "@shared/schema";
import { Loader2, ImagePlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ProductImageUploader from "@/components/admin/product-image-uploader";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ImagesStepProps {
  form: UseFormReturn<any>;
  productId: number;
}

export function ImagesStep({ form, productId }: ImagesStepProps) {
  // Fetch existing product images
  const {
    data: productImages,
    isLoading: imagesLoading,
    refetch: refetchImages
  } = useQuery<ProductImage[]>({
    queryKey: [`/api/products/${productId}/images`],
    // Don't fetch if this is a new product (no ID yet)
    enabled: !!productId && productId > 0,
  });

  const hasImages = productImages && productImages.length > 0;
  const mainImage = productImages?.find(img => img.isMain);

  // Update the form with the main image URL
  if (mainImage && !form.getValues("imageUrl")) {
    form.setValue("imageUrl", mainImage.url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Product Images</h3>
        <p className="text-sm text-muted-foreground">
          Upload high-quality images of your product. The first image will be used as the main display image.
        </p>
      </div>

      {!productId || productId <= 0 ? (
        <Alert>
          <AlertTitle>Save product first</AlertTitle>
          <AlertDescription>
            You need to save the basic product information before adding images.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="space-y-4">
            <FormLabel>Current Images</FormLabel>
            {imagesLoading ? (
              <div className="flex justify-center p-4 border rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !hasImages ? (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md text-muted-foreground">
                <ImagePlus size={48} className="mb-2" />
                <p>No images uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {productImages.map((image) => (
                  <Card 
                    key={image.id} 
                    className={cn(
                      "overflow-hidden",
                      image.isMain && "ring-2 ring-primary"
                    )}
                  >
                    <CardContent className="p-0">
                      <div className="relative aspect-square">
                        <img 
                          src={image.url} 
                          alt="Product" 
                          className="w-full h-full object-cover"
                        />
                        {image.isMain && (
                          <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                            Main
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <ProductImageUploader
            productId={productId}
            onUploadComplete={() => refetchImages()}
          />

          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem className="hidden">
                <FormControl>
                  <input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  );
}