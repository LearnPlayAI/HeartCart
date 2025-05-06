import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl,
  FormDescription 
} from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { ProductImage } from "@shared/schema";
import { Loader2, BookOpen, Tag, Wand2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useProductAnalysis } from "@/hooks/use-ai";

interface AiAnalysisStepProps {
  form: UseFormReturn<any>;
  productId: number;
}

export function AiAnalysisStep({ form, productId }: AiAnalysisStepProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const { control, setValue, getValues } = form;
  
  // Fetch existing product images
  const {
    data: productImages,
    isLoading: imagesLoading,
  } = useQuery<ProductImage[]>({
    queryKey: [`/api/products/${productId}/images`],
    enabled: !!productId && productId > 0,
  });

  const hasImages = productImages && productImages.length > 0;
  const mainImage = productImages?.find(img => img.isMain);
  
  // If no image is selected, use the main image
  if (!selectedImageUrl && mainImage) {
    setSelectedImageUrl(mainImage.url);
  }

  // Setup AI product analysis hook
  const { 
    generateTags, 
    analyzeProduct, 
    isProcessing: isAiProcessing 
  } = useProductAnalysis({
    onSuccess: (data) => {
      // This will be handled by the specific AI function callbacks
    }
  });

  // Handle generating tags with AI
  const handleGenerateTags = async () => {
    if (!selectedImageUrl) return;
    
    const currentName = getValues("name") || "";
    const currentDescription = getValues("description") || "";
    
    try {
      const suggestedTags = await generateTags({
        imageUrl: selectedImageUrl,
        productName: currentName,
        productDescription: currentDescription
      });
      
      if (suggestedTags && suggestedTags.length > 0) {
        setValue("tags", suggestedTags);
      }
    } catch (error) {
      console.error("Error generating tags:", error);
    }
  };

  // Handle analyzing product with AI
  const handleAnalyzeProduct = async () => {
    if (!selectedImageUrl) return;
    
    try {
      const analysis = await analyzeProduct({
        imageUrl: selectedImageUrl
      });
      
      if (analysis) {
        if (analysis.suggestedName && !getValues("name")) {
          setValue("name", analysis.suggestedName);
        }
        
        if (analysis.suggestedDescription && !getValues("description")) {
          setValue("description", analysis.suggestedDescription);
        }
        
        if (analysis.suggestedPrice && !getValues("price")) {
          setValue("price", analysis.suggestedPrice);
        }
        
        if (analysis.suggestedBrand && !getValues("brand")) {
          setValue("brand", analysis.suggestedBrand);
        }
      }
    } catch (error) {
      console.error("Error analyzing product:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">AI-Powered Analysis</h3>
        <p className="text-sm text-muted-foreground">
          Let AI analyze your product images to suggest details and tags.
        </p>
      </div>

      {!productId || productId <= 0 || !hasImages ? (
        <Alert>
          <AlertTitle>Upload images first</AlertTitle>
          <AlertDescription>
            You need to save basic information and upload product images before using AI analysis.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <FormLabel>Select an image to analyze</FormLabel>
            {imagesLoading ? (
              <div className="flex justify-center p-4 border rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {productImages?.map((image) => (
                  <div 
                    key={image.id}
                    className={`cursor-pointer border rounded-md overflow-hidden ${
                      selectedImageUrl === image.url ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedImageUrl(image.url)}
                  >
                    <div className="aspect-square">
                      <img 
                        src={image.url} 
                        alt="Product"
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                disabled={!selectedImageUrl || isAiProcessing}
                onClick={handleGenerateTags}
              >
                {isAiProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Tag className="h-4 w-4" />
                )}
                Generate Tags
              </Button>
              <Button
                type="button"
                className="flex-1 gap-2"
                disabled={!selectedImageUrl || isAiProcessing}
                onClick={handleAnalyzeProduct}
              >
                {isAiProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Analyze Product
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <FormLabel>AI Results</FormLabel>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Product Details</CardTitle>
                <CardDescription>
                  Review and apply AI suggestions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Product name" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ''} 
                          placeholder="Product description"
                          className="min-h-[100px]" 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <div className="border rounded-md p-3 flex flex-wrap gap-2">
                          {field.value && field.value.length > 0 ? (
                            field.value.map((tag: string, index: number) => (
                              <Badge key={index} variant="secondary">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <div className="text-muted-foreground text-sm w-full text-center py-2">
                              No tags generated yet
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Use the "Generate Tags" button to get AI suggested tags
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}