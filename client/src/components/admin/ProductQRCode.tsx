import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Facebook, Share2, MessageCircle, Music } from "lucide-react";
import { FaTiktok } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ProductQRCodeProps {
  productId: number;
  productName: string;
  className?: string;
}

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const platforms: Platform[] = [
  { id: "whatsapp", name: "WhatsApp", icon: <MessageCircle className="h-4 w-4" />, color: "bg-green-500" },
  { id: "facebook", name: "Facebook", icon: <Facebook className="h-4 w-4" />, color: "bg-blue-600" },
  { id: "instagram", name: "Instagram", icon: <Share2 className="h-4 w-4" />, color: "bg-pink-500" },
  { id: "tiktok", name: "TikTok", icon: <FaTiktok className="h-4 w-4" />, color: "bg-black" },
  { id: "offline", name: "Print/Offline", icon: <Download className="h-4 w-4" />, color: "bg-gray-700" }
];

export function ProductQRCode({ productId, productName, className }: ProductQRCodeProps) {
  const { toast } = useToast();
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  const generateQR = async (platform: string) => {
    try {
      setLoadingPlatform(platform);
      const response = await fetch(`/api/products/${productId}/qr-code?platform=${platform}&format=png&size=300`);
      
      if (!response.ok) throw new Error('Failed to generate QR code');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      setQrImages(prev => ({ ...prev, [platform]: url }));
      
      toast({
        title: "QR Code Generated",
        description: `QR code for ${platform} is ready`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setLoadingPlatform(null);
    }
  };

  const downloadQR = async (platform: string) => {
    try {
      const response = await fetch(`/api/products/${productId}/qr-code?platform=${platform}&format=png&size=600`);
      
      if (!response.ok) throw new Error('Failed to download QR code');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${productName.replace(/\s+/g, '-')}-${platform}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded",
        description: `QR code downloaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive",
      });
    }
  };

  const downloadAllQRCodes = async () => {
    try {
      const response = await fetch(`/api/products/${productId}/qr-code/social-kit?format=zip`);
      
      if (!response.ok) throw new Error('Failed to download QR codes');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${productName.replace(/\s+/g, '-')}-social-media-kit.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded",
        description: "Social media kit downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download social media kit",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>QR Code Generator</CardTitle>
        <CardDescription>
          Generate platform-specific QR codes for social media marketing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => (
            <div key={platform.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-full text-white", platform.color)}>
                  {platform.icon}
                </div>
                <span className="font-medium">{platform.name}</span>
              </div>
              
              {qrImages[platform.id] ? (
                <div className="space-y-2">
                  <img 
                    src={qrImages[platform.id]} 
                    alt={`${platform.name} QR Code`}
                    className="w-full aspect-square object-contain bg-white p-2 rounded border"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => generateQR(platform.id)}
                      data-testid={`button-regenerate-qr-${platform.id}`}
                    >
                      Regenerate
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => downloadQR(platform.id)}
                      data-testid={`button-download-qr-${platform.id}`}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => generateQR(platform.id)}
                  disabled={loadingPlatform === platform.id}
                  data-testid={`button-generate-qr-${platform.id}`}
                >
                  {loadingPlatform === platform.id ? "Generating..." : "Generate QR"}
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <Button
            variant="default"
            className="w-full"
            onClick={downloadAllQRCodes}
            data-testid="button-download-all-qr"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Complete Social Media Kit (All QR Codes)
          </Button>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Downloads all QR codes in a single ZIP file for easy distribution
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
