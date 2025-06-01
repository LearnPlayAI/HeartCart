/**
 * AI Image Downloader Component
 * 
 * Downloads product images from supplier URLs using AI to extract and process images
 */

import React, { useState } from 'react';
import { Loader2, Download, Globe, ImageIcon, AlertTriangle, CheckCircle, Eye, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DownloadedImage {
  url: string;
  objectKey: string;
  filename: string;
  size: number;
  contentType: string;
}

interface PreviewImage {
  url: string;
  index: number;
  selected: boolean;
}

interface AIImageDownloaderProps {
  onImagesDownloaded: (images: DownloadedImage[]) => void;
  productId?: number;
  className?: string;
}

export const AIImageDownloader: React.FC<AIImageDownloaderProps> = ({
  onImagesDownloaded,
  productId,
  className
}) => {
  const [supplierUrl, setSupplierUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [downloadResult, setDownloadResult] = useState<{
    success: boolean;
    images: DownloadedImage[];
    errors: string[];
    meta?: {
      foundUrls: number;
      downloadedCount: number;
      errorCount: number;
    };
  } | null>(null);
  const { toast } = useToast();

  const handleExtractImages = async () => {
    if (!supplierUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a supplier URL to extract images from.",
        variant: "destructive"
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(supplierUrl);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL.",
        variant: "destructive"
      });
      return;
    }

    setIsExtracting(true);
    setDownloadResult(null);

    try {
      const response = await apiRequest('POST', '/api/ai/extract-images', {
        supplierUrl: supplierUrl.trim()
      });

      let data;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Response parsing error:', parseError);
        data = {};
      }
      console.log('AI extract response:', data);

      if (data.success && data.images && data.images.length > 0) {
        setPreviewImages(data.images);
        setShowPreviewModal(true);
        toast({
          title: "Images Found",
          description: `Found ${data.images.length} images. Select which ones to download.`
        });
      } else {
        toast({
          title: data.message || "No Images Found",
          description: data.errors?.[0] || "No suitable product images were found on the supplier page.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('AI image extraction failed:', error);
      toast({
        title: "Extraction Failed",
        description: "Failed to extract images. Please check the URL and try again.",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadSelected = async () => {
    const selectedUrls = previewImages
      .filter(img => img.selected)
      .map(img => img.url);

    if (selectedUrls.length === 0) {
      toast({
        title: "No Images Selected",
        description: "Please select at least one image to download.",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);

    try {
      const response = await apiRequest('POST', '/api/ai/download-selected-images', {
        imageUrls: selectedUrls,
        productId
      });

      let data;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Response parsing error:', parseError);
        data = {};
      }
      console.log('AI download response:', data);
      setDownloadResult(data);

      if (data.success && data.images && data.images.length > 0) {
        toast({
          title: "Images Downloaded",
          description: `Successfully downloaded ${data.images.length} images from the supplier page.`
        });

        onImagesDownloaded(data.images);
        setShowPreviewModal(false);
        setPreviewImages([]);
      } else {
        toast({
          title: data.message || "Download Failed",
          description: data.errors?.[0] || "Failed to download the selected images.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('AI image download failed:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download images. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleImageSelection = (index: number) => {
    setPreviewImages(prev => 
      prev.map(img => 
        img.index === index 
          ? { ...img, selected: !img.selected }
          : img
      )
    );
  };

  const selectAllImages = () => {
    const allSelected = previewImages.every(img => img.selected);
    setPreviewImages(prev => 
      prev.map(img => ({ ...img, selected: !allSelected }))
    );
  };

  const selectedCount = previewImages.filter(img => img.selected).length;

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            AI Image Downloader
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter a supplier URL to extract and preview product images before downloading
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier-url">Supplier URL</Label>
            <div className="flex gap-2">
              <Input
                id="supplier-url"
                type="url"
                placeholder="https://example-supplier.com/product/..."
                value={supplierUrl}
                onChange={(e) => setSupplierUrl(e.target.value)}
                disabled={isExtracting}
                className="flex-1"
              />
              <Button
                onClick={handleExtractImages}
                disabled={isExtracting || !supplierUrl.trim()}
                className="px-6"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Result Display */}
          {downloadResult && (
            <div className="space-y-3">
              {downloadResult.success ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="space-y-2">
                      <p className="font-medium">Success!</p>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Downloaded:</span>
                          <Badge variant="outline" className="text-green-700 border-green-300">
                            {downloadResult.images.length} images
                          </Badge>
                        </div>
                        {downloadResult.meta && (
                          <div className="flex justify-between">
                            <span>Selected:</span>
                            <span>{downloadResult.meta.selectedCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {downloadResult.message || "Failed to download images"}
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Details */}
              {downloadResult.errors.length > 0 && (
                <details className="space-y-2">
                  <summary className="cursor-pointer text-sm font-medium text-orange-600">
                    View Error Details ({downloadResult.errors.length})
                  </summary>
                  <div className="bg-orange-50 p-3 rounded border">
                    {downloadResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-orange-800">
                        • {error}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <ImageIcon className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Paste a supplier's product page URL</li>
                  <li>• AI finds product images on the page and shows previews</li>
                  <li>• Select which images you want to download</li>
                  <li>• Chosen images are downloaded and added to your product</li>
                  <li>• Supports JPG, PNG, WebP, and GIF formats</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Preview Images ({previewImages.length} found)
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Select the images you want to download. Click on images to toggle selection.
            </p>
          </DialogHeader>

          <div className="flex items-center gap-2 py-2 border-b">
            <Checkbox
              id="select-all"
              checked={previewImages.length > 0 && previewImages.every(img => img.selected)}
              onCheckedChange={selectAllImages}
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              Select All ({selectedCount} of {previewImages.length} selected)
            </label>
          </div>

          <div className="overflow-y-auto max-h-[50vh]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {previewImages.map((image) => (
                <div
                  key={image.index}
                  className={`relative group cursor-pointer rounded-lg border-2 transition-all ${
                    image.selected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleImageSelection(image.index)}
                >
                  <div className="aspect-square rounded-lg overflow-hidden">
                    <img
                      src={image.url}
                      alt={`Preview ${image.index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  
                  {/* Selection overlay */}
                  <div className={`absolute inset-0 rounded-lg transition-opacity ${
                    image.selected 
                      ? 'bg-primary/20' 
                      : 'bg-black/0 group-hover:bg-black/10'
                  }`}>
                    <div className="absolute top-2 right-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        image.selected 
                          ? 'bg-primary text-white' 
                          : 'bg-white/80 text-gray-600'
                      }`}>
                        {image.selected ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <span className="text-xs font-medium">{image.index + 1}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowPreviewModal(false)}
              disabled={isDownloading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleDownloadSelected}
              disabled={selectedCount === 0 || isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Selected ({selectedCount})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIImageDownloader;