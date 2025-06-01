/**
 * AI Image Downloader Component
 * 
 * Downloads product images from supplier URLs using AI to extract and process images
 */

import React, { useState } from 'react';
import { Loader2, Download, Globe, ImageIcon, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DownloadedImage {
  url: string;
  objectKey: string;
  filename: string;
  size: number;
  contentType: string;
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
  const [isDownloading, setIsDownloading] = useState(false);
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

  const handleDownload = async () => {
    if (!supplierUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a supplier URL to download images from.",
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

    setIsDownloading(true);
    setDownloadResult(null);

    try {
      const response = await apiRequest('/api/ai/download-images', {
        method: 'POST',
        body: JSON.stringify({
          supplierUrl: supplierUrl.trim(),
          productId
        })
      });

      setDownloadResult(response);

      if (response.success && response.images.length > 0) {
        onImagesDownloaded(response.images);
        toast({
          title: "Images Downloaded",
          description: `Successfully downloaded ${response.images.length} images from the supplier page.`
        });
      } else {
        toast({
          title: "No Images Found",
          description: response.message || "No suitable product images were found on the supplier page.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download images. Please check the URL and try again.",
        variant: "destructive"
      });
      setDownloadResult({
        success: false,
        images: [],
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          AI Image Downloader
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter a supplier URL to automatically extract and download product images
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
              disabled={isDownloading}
              className="flex-1"
            />
            <Button
              onClick={handleDownload}
              disabled={isDownloading || !supplierUrl.trim()}
              className="px-6"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Download Progress/Status */}
        {isDownloading && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Analyzing the supplier page and downloading images. This may take a few moments...
            </AlertDescription>
          </Alert>
        )}

        {/* Download Results */}
        {downloadResult && (
          <div className="space-y-3">
            {downloadResult.success ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong>Download Complete!</strong> Found and downloaded {downloadResult.images.length} images.
                  {downloadResult.meta && (
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline">
                        {downloadResult.meta.foundUrls} URLs found
                      </Badge>
                      <Badge variant="outline" className="bg-green-100">
                        {downloadResult.meta.downloadedCount} downloaded
                      </Badge>
                      {downloadResult.meta.errorCount > 0 && (
                        <Badge variant="outline" className="bg-orange-100">
                          {downloadResult.meta.errorCount} failed
                        </Badge>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Failed to download images. {downloadResult.errors[0] || 'Unknown error occurred.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Downloaded Images Preview */}
            {downloadResult.images.length > 0 && (
              <div className="space-y-2">
                <Label>Downloaded Images</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {downloadResult.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.url}
                        alt={`Downloaded image ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 text-white text-xs text-center p-2">
                          <div className="truncate">{image.filename}</div>
                          <div>{formatFileSize(image.size)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                <li>• AI automatically finds product images on the page</li>
                <li>• Images are downloaded, optimized, and added to your product</li>
                <li>• Supports JPG, PNG, WebP, and GIF formats</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIImageDownloader;