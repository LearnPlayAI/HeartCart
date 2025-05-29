import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";
import { Loader2, Upload, Image as ImageIcon, Trash2, RefreshCw, Undo2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Product = {
  id: number;
  name: string;
  slug: string;
  catalogId: number;
  catalogName?: string;
  sku: string;
  thumbnailUrl?: string;
};

export default function ProductImages() {
  const { id } = useParams<{ id: string }>();
  const [_, navigate] = useLocation();
  const productId = parseInt(id);
  
  // Fetch product details
  const { data: product, isLoading, isError, refetch } = useQuery<Product>({
    queryKey: [`/api/products/${productId}`],
    enabled: !!productId && !isNaN(productId),
  });

  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState<boolean>(true);

  // Initialize dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
    }
  });

  // Fetch existing images
  useEffect(() => {
    if (productId && !isNaN(productId)) {
      setLoadingImages(true);
      
      // This is a placeholder - in a real implementation, you would fetch images from your API
      // GET /api/products/{id}/images
      setTimeout(() => {
        if (product?.thumbnailUrl) {
          setExistingImages([product.thumbnailUrl]);
        } else {
          setExistingImages([]);
        }
        setLoadingImages(false);
      }, 1000);
    }
  }, [productId, product]);

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one image file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulated upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 200);

    try {
      // This is a placeholder - in a real implementation, you would upload to your API
      // For example: POST /api/products/{id}/images
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(interval);
      setUploadProgress(100);
      
      
      
      // Reset state
      setFiles([]);
      setIsUploading(false);
      setUploadProgress(0);
      
      // Switch to manage tab and refresh image list
      setActiveTab("manage");
      
      // Add the file URLs to existing images (simulated)
      setExistingImages(prev => [
        ...prev,
        ...files.map(file => URL.createObjectURL(file))
      ]);
      
    } catch (error) {
      clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(0);
      
      toast({
        title: "Upload failed",
        description: "There was an error uploading your images. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleImageDelete = (imageUrl: string) => {
    // This is a placeholder - in a real implementation, you would delete via your API
    // For example: DELETE /api/products/{id}/images/{imageId}
    
    // Remove from local state
    setExistingImages(prev => prev.filter(url => url !== imageUrl));
    
    
  };
  
  const handleSetThumbnail = (imageUrl: string) => {
    // This is a placeholder - in a real implementation, you would update via your API
    // For example: POST /api/products/{id}/thumbnail
    
    
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      </AdminLayout>
    );
  }

  if (isError || !product) {
    return (
      <AdminLayout>
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load product details. The product may not exist or there was an error with the request.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/admin/products")}>
          <Undo2 className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product Images</h1>
          <p className="text-muted-foreground">
            Manage images for <span className="font-medium">{product.name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/admin/catalogs/${product.catalogId}/products`)}>
            <Undo2 className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
          <Button onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Images Management</CardTitle>
          <CardDescription>
            Upload and manage images for this product. Images will be displayed in the product catalog and detail pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="upload">Upload Images</TabsTrigger>
              <TabsTrigger value="manage">Manage Images</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload">
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-md p-10 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-pink-500 bg-pink-50" : "border-gray-300 hover:border-pink-500 hover:bg-pink-50"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload className="h-10 w-10 text-gray-400" />
                  <div className="text-lg font-medium">
                    {isDragActive
                      ? "Drop the files here..."
                      : "Drag & drop image files here, or click to select files"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Supported formats: JPEG, PNG, GIF, WebP
                  </p>
                </div>
              </div>
              
              {files.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Selected Files ({files.length})</Label>
                    <Button variant="outline" size="sm" onClick={() => setFiles([])}>
                      Clear All
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div 
                        key={file.name} 
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-gray-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[300px]">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFiles(files.filter((f) => f !== file));
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {isUploading && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    className="mt-4 w-full"
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload {files.length} {files.length === 1 ? "Image" : "Images"}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="manage">
              {loadingImages ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                </div>
              ) : existingImages.length === 0 ? (
                <div className="text-center py-10">
                  <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">No images found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload images using the "Upload Images" tab
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveTab("upload")}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Images
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {existingImages.map((imageUrl, index) => (
                    <div key={index} className="border rounded-md p-2 flex flex-col">
                      <div className="rounded-md overflow-hidden aspect-square bg-gray-100">
                        <img 
                          src={imageUrl} 
                          alt={`Product image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetThumbnail(imageUrl)}
                          className={imageUrl === product.thumbnailUrl ? "bg-pink-100 text-pink-800" : ""}
                        >
                          {imageUrl === product.thumbnailUrl ? (
                            "Current Thumbnail"
                          ) : (
                            "Set as Thumbnail"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleImageDelete(imageUrl)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}