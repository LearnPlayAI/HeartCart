import { useState } from "react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid2X2, ImagePlus, Info, Loader2, Search, Wand2 } from "lucide-react";
import { Category } from "@shared/schema";
import { UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ImagesBasicInfoStepProps {
  form: UseFormReturn<any>;
  categories: Category[];
  uploadedImages: any[];
  setUploadedImages: (images: any[]) => void;
  productId?: number;
  analyzeImagesWithAI: () => Promise<void>;
  aiAnalysisLoading: boolean;
  aiSuggestions: any | null;
  applyAISuggestion: (key: string, value: any) => void;
  suggestPriceWithAI: () => Promise<void>;
  suggestTagsWithAI: () => Promise<void>;
}

export default function ImagesBasicInfoStep({
  form,
  categories,
  uploadedImages,
  setUploadedImages,
  productId,
  analyzeImagesWithAI,
  aiAnalysisLoading,
  aiSuggestions,
  applyAISuggestion,
  suggestPriceWithAI,
  suggestTagsWithAI
}: ImagesBasicInfoStepProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    
    const formData = new FormData();
    
    if (productId) {
      formData.append('productId', productId.toString());
    }
    
    // Append each file to the form data
    console.log('Files to upload:', files);
    Array.from(files).forEach((file, index) => {
      console.log(`Appending file ${index}:`, file.name);
      formData.append('images', file);
    });
    
    // Log the FormData entries (for debugging)
    console.log('FormData entries:');
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }
    
    try {
      const endpoint = productId 
        ? `/api/products/${productId}/images` 
        : '/api/products/images/temp';
      
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error('Failed to upload images');
      }
      
      const data = await res.json();
      
      if (!productId && data.success && data.files && Array.isArray(data.files)) {
        // Handle temp file upload response for new product
        const tempImages = data.files.map(file => ({
          id: Date.now() + Math.floor(Math.random() * 1000), // Temporary ID until we create the product
          url: file.path,
          alt: '',
          isMain: false,
          isTemp: true,
          file: file
        }));
        setUploadedImages(prev => [...prev, ...tempImages]);
      } else if (Array.isArray(data)) {
        // Handle multiple images from existing product
        setUploadedImages(prev => [...prev, ...data]);
      } else if (data.id) {
        // Handle single image from existing product
        setUploadedImages(prev => [...prev, data]);
      } else {
        // Fallback for unexpected response
        console.error('Unexpected image upload response:', data);
        toast({
          title: "Upload Response Issue",
          description: "Received unexpected response format from server",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || 'Failed to upload images',
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Clear the file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const removeImage = async (imageId: number, index: number) => {
    if (imageId) {
      try {
        const res = await fetch(`/api/products/images/${imageId}`, {
          method: 'DELETE',
        });
        
        if (!res.ok) {
          throw new Error('Failed to delete image');
        }
        
        // Remove from state
        setUploadedImages(
          uploadedImages.filter((_, i) => i !== index)
        );
        
        toast({
          title: "Image Deleted",
          description: "The image has been removed successfully",
        });
      } catch (error: any) {
        toast({
          title: "Delete Failed",
          description: error.message || 'Failed to delete image',
          variant: "destructive",
        });
      }
    } else {
      // For temporary images without an ID
      setUploadedImages(
        uploadedImages.filter((_, i) => i !== index)
      );
    }
  };

  const setMainImage = async (imageId: number, index: number) => {
    if (!productId) {
      // For new products, just update the state
      const updatedImages = uploadedImages.map((img, i) => ({
        ...img,
        isMain: i === index
      }));
      setUploadedImages(updatedImages);
      return;
    }
    
    try {
      const res = await fetch(`/api/products/${productId}/images/${imageId}/main`, {
        method: 'PUT',
      });
      
      if (!res.ok) {
        throw new Error('Failed to set main image');
      }
      
      // Update local state
      const updatedImages = uploadedImages.map((img, i) => ({
        ...img,
        isMain: i === index
      }));
      setUploadedImages(updatedImages);
      
      toast({
        title: "Main Image Updated",
        description: "The main product image has been updated",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || 'Failed to update main image',
        variant: "destructive",
      });
    }
  };

  const handleSuggestPrice = async () => {
    setPriceLoading(true);
    try {
      await suggestPriceWithAI();
    } finally {
      setPriceLoading(false);
    }
  };

  const handleSuggestTags = async () => {
    setTagsLoading(true);
    try {
      await suggestTagsWithAI();
    } finally {
      setTagsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Tabs defaultValue="images" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="images">Product Images</TabsTrigger>
          <TabsTrigger value="info">Basic Information</TabsTrigger>
        </TabsList>
        
        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>Upload Images</CardTitle>
              <CardDescription>
                Upload high-quality images of your product. The first image will be used as the main product image.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploading ? (
                        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                      ) : (
                        <>
                          <ImagePlus className="w-8 h-8 mb-2 text-pink-500" />
                          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            PNG, JPG or WEBP (MAX. 5MB)
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploading}
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>

                {uploadedImages && uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                    {uploadedImages.map((image, index) => (
                      <div
                        key={index}
                        className="relative group aspect-square rounded-md overflow-hidden border hover:border-pink-500 transition-all"
                      >
                        <img
                          src={image.url}
                          alt={`Product image ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              onClick={() => setMainImage(image.id, index)}
                              className="rounded-full h-8 w-8"
                              disabled={image.isMain}
                            >
                              <Grid2X2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              onClick={() => removeImage(image.id, index)}
                              className="rounded-full h-8 w-8"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {image.isMain && (
                          <div className="absolute top-1 left-1">
                            <Badge variant="default" className="bg-pink-500">Main</Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Enter essential product details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter product name" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            // Auto-generate slug from product name
                            const slug = e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, '-')
                              .replace(/[^a-z0-9-]/g, '');
                            form.setValue('slug', slug);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Name should be clear and descriptive
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="product-url-slug" 
                          {...field}
                          onChange={(e) => {
                            // Ensure slug follows the pattern rules
                            const value = e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, '-')
                              .replace(/[^a-z0-9-]/g, '');
                            field.onChange({ ...e, target: { ...e.target, value } });
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Used in the product URL (automatically generated from name)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={
                          field.value ? field.value.toString() : undefined
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem
                              key={category.id}
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the most appropriate category
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center space-x-2">
                        <FormLabel>Cost Price (Wholesale)</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p>The price you pay to acquire the product from suppliers.</p>
                              <p className="mt-1">This is used as the base for calculating the selling price.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Enter cost price"
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Price you pay to acquire the product
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center space-x-2">
                        <FormLabel>Selling Price (Retail)</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p>Pricing is calculated based on your category-specific markup settings.</p>
                              <p className="mt-1">• Category-specific: Uses markup % defined for the product's category</p>
                              <p>• Default: Uses global markup % (usually 50%)</p>
                              <p>• AI-suggested: Considers market factors</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Enter selling price"
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Price customers will pay for the product
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter product description"
                          className="min-h-[120px]"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Detailed information about your product
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product brand" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>
                        Brand or manufacturer name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-2">
                          <div className="flex">
                            <Input
                              placeholder="Add a tag and press Enter"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const target = e.target as HTMLInputElement;
                                  const value = target.value.trim();
                                  if (value && (!field.value || !field.value.includes(value))) {
                                    const newTags = [...(field.value || []), value];
                                    field.onChange(newTags);
                                    target.value = '';
                                  }
                                }
                              }}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="ml-2"
                              onClick={() => {
                                const input = document.querySelector('input[placeholder="Add a tag and press Enter"]') as HTMLInputElement;
                                const value = input?.value.trim();
                                if (value && (!field.value || !field.value.includes(value))) {
                                  const newTags = [...(field.value || []), value];
                                  field.onChange(newTags);
                                  if (input) input.value = '';
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[40px]">
                            {field.value && field.value.length > 0 ? (
                              field.value.map((tag: string, index: number) => (
                                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newTags = [...field.value];
                                      newTags.splice(index, 1);
                                      field.onChange(newTags);
                                    }}
                                    className="text-xs ml-1"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">No tags added</div>
                            )}
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Tags help customers find your product
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* AI Analysis Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button 
          type="button" 
          className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white flex-1"
          onClick={analyzeImagesWithAI}
          disabled={aiAnalysisLoading || uploadedImages.length === 0}
        >
          {aiAnalysisLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Analyze with AI
        </Button>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                type="button" 
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white flex-1"
                onClick={handleSuggestPrice}
                disabled={priceLoading || !form.getValues('name') || !form.getValues('costPrice')}
              >
                {priceLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                AI Suggest Price
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              <p>Get AI pricing based on South African market trends and your cost price.</p>
              <p className="mt-1">• Uses category-specific markup if available</p>
              <p>• Falls back to default markup (50%) if needed</p>
              <p>• Considers market factors to balance competitiveness and profit</p>
              <p>• Price will never be below cost price</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <Button 
          type="button" 
          className="bg-gradient-to-r from-pink-500 to-rose-600 text-white flex-1"
          onClick={handleSuggestTags}
          disabled={tagsLoading || !form.getValues('name') || !form.getValues('description')}
        >
          {tagsLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          AI Suggest Tags
        </Button>
      </div>
      
      {/* AI Suggestions Display */}
      {aiSuggestions && (
        <Card className="mt-6 border-purple-200 dark:border-purple-900">
          <CardHeader className="bg-purple-50 dark:bg-purple-900/20">
            <CardTitle className="flex items-center text-purple-700 dark:text-purple-300">
              <Wand2 className="mr-2 h-5 w-5" />
              AI Suggestions
            </CardTitle>
            <CardDescription>
              Apply these AI-generated suggestions to your product
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {aiSuggestions.suggestedName && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Product Name</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={() => applyAISuggestion('suggestedName', aiSuggestions.suggestedName)}
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-sm p-2 bg-slate-50 dark:bg-slate-900 rounded border">
                  {aiSuggestions.suggestedName}
                </p>
              </div>
            )}
            
            {aiSuggestions.suggestedDescription && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Description</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={() => applyAISuggestion('suggestedDescription', aiSuggestions.suggestedDescription)}
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-sm p-2 bg-slate-50 dark:bg-slate-900 rounded border line-clamp-3">
                  {aiSuggestions.suggestedDescription}
                </p>
              </div>
            )}
            
            {aiSuggestions.suggestedCategory && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Category</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={() => applyAISuggestion('suggestedCategory', aiSuggestions.suggestedCategory)}
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-sm p-2 bg-slate-50 dark:bg-slate-900 rounded border">
                  {aiSuggestions.suggestedCategory}
                </p>
              </div>
            )}
            
            {aiSuggestions.suggestedCostPrice && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Cost Price</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={() => applyAISuggestion('suggestedCostPrice', aiSuggestions.suggestedCostPrice)}
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-sm p-2 bg-slate-50 dark:bg-slate-900 rounded border">
                  R{aiSuggestions.suggestedCostPrice.toFixed(2)}
                </p>
              </div>
            )}
            
            {aiSuggestions.suggestedPrice && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Selling Price</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={() => applyAISuggestion('suggestedPrice', aiSuggestions.suggestedPrice)}
                  >
                    Apply
                  </Button>
                </div>
                <div className="text-sm p-2 bg-slate-50 dark:bg-slate-900 rounded border space-y-1">
                  <p className="font-medium">R{aiSuggestions.suggestedPrice.toFixed(2)}</p>
                  {aiSuggestions.markupPercentage && (
                    <p className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
                        {aiSuggestions.markupPercentage}% markup
                      </span>
                      {aiSuggestions.markupSource && (
                        <span className="ml-2">
                          Source: {aiSuggestions.markupSource}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {aiSuggestions.suggestedTags && aiSuggestions.suggestedTags.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Tags</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={() => applyAISuggestion('suggestedTags', aiSuggestions.suggestedTags)}
                  >
                    Apply
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded border">
                  {aiSuggestions.suggestedTags.map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
              onClick={() => {
                if (!aiSuggestions) return;
                if (Object.keys(aiSuggestions).length === 0) {
                  toast({ 
                    title: "No suggestions available", 
                    description: "Try running the AI analysis again" 
                  });
                  return;
                }
                
                // Apply all available suggestions
                Object.keys(aiSuggestions).forEach(key => {
                  if (aiSuggestions[key]) {
                    applyAISuggestion(key, aiSuggestions[key]);
                  }
                });
                
                toast({
                  title: "All suggestions applied",
                  description: "AI suggestions have been applied to the product",
                });
              }}
            >
              Apply All Suggestions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}