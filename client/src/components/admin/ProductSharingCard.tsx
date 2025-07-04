import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Share2, 
  MessageCircle, 
  Copy, 
  Check,
  ShoppingBag,
  Facebook,
  ExternalLink,
  RotateCcw,
  Edit3,
  Loader2,
  Save,
  Smartphone
} from "lucide-react";

/**
 * Product Sharing Card Component
 * Allows admins to customize text templates for product sharing on Facebook and WhatsApp
 * Uses systemSettings for persistent storage
 */
export function ProductSharingCard() {
  const [copied, setCopied] = useState(false);
  const [localMessage, setLocalMessage] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Default product sharing message with product placeholders
  const defaultMessage = `🛍️ Check out this amazing product! 🛍️

[PRODUCT_NAME]

💰 Price: R[PRICE]
📦 Free delivery available via PUDO lockers

✨ Why shop with TeeMeYou?
• Quality products at great prices
• Fast delivery across South Africa
• Secure EFT payments
• Trusted online store

🛒 Shop now: [PRODUCT_URL]

📱 More products: https://teemeyou.shop

#TeeMeYou #OnlineShopping #SouthAfrica #QualityProducts`;

  // Fetch message from systemSettings
  const { data: settingResponse, isLoading: isLoadingSetting } = useQuery({
    queryKey: ['/api/admin/settings/product_sharing_message'],
    queryFn: async () => {
      const response = await fetch('/api/admin/settings/product_sharing_message', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch setting');
      return response.json();
    }
  });

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest('PATCH', '/api/admin/settings/product_sharing_message', {
        value: message
      });
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      toast({
        title: "Product sharing template saved",
        description: "Your product sharing template has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/product_sharing_message'] });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: "Failed to save your product sharing template. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Get the current message (from API or local state)
  const productSharingMessage = localMessage || settingResponse?.data?.settingValue || defaultMessage;

  // Initialize local message when data loads
  useEffect(() => {
    if (settingResponse?.data?.settingValue && !localMessage) {
      setLocalMessage(settingResponse.data.settingValue);
    }
  }, [settingResponse, localMessage]);

  // Handle message change
  const handleMessageChange = (message: string) => {
    setLocalMessage(message);
    const hasChanges = message !== (settingResponse?.data?.settingValue || defaultMessage);
    setHasUnsavedChanges(hasChanges);
  };

  // Manual save function
  const handleSaveMessage = () => {
    if (localMessage && hasUnsavedChanges) {
      updateMessageMutation.mutate(localMessage);
    }
  };

  // Reset to default
  const handleResetMessage = () => {
    setLocalMessage(defaultMessage);
    setHasUnsavedChanges(true);
  };

  // Copy message to clipboard
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(productSharingMessage);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Product sharing template copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy template to clipboard",
        variant: "destructive",
      });
    }
  };

  // Generate sample WhatsApp URL for testing
  const handleWhatsAppShare = () => {
    const sampleMessage = productSharingMessage
      .replace(/\[PRODUCT_NAME\]/g, 'Sample Product - Amazing Quality T-Shirt')
      .replace(/\[PRICE\]/g, '199')
      .replace(/\[PRODUCT_URL\]/g, 'https://teemeyou.shop/product/sample-product');
    
    const encodedMessage = encodeURIComponent(sampleMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  // Generate sample Facebook share for testing
  const handleFacebookShare = () => {
    const sampleMessage = productSharingMessage
      .replace(/\[PRODUCT_NAME\]/g, 'Sample Product - Amazing Quality T-Shirt')
      .replace(/\[PRICE\]/g, '199')
      .replace(/\[PRODUCT_URL\]/g, 'https://teemeyou.shop/product/sample-product');
    
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://teemeyou.shop/product/sample-product')}&quote=${encodeURIComponent(sampleMessage)}`;
    window.open(facebookUrl, '_blank');
  };

  return (
    <Card className="border-green-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-full">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-green-700 flex items-center gap-2">
                Product Sharing Templates
                <Badge className="bg-green-500 text-white text-xs">SOCIAL</Badge>
              </CardTitle>
              <CardDescription className="text-green-600">
                Customize templates for sharing products on Facebook and WhatsApp
              </CardDescription>
            </div>
          </div>
          <Share2 className="h-8 w-8 text-green-400" />
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Placeholder Information */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-green-700 mb-2">Template Placeholders:</h4>
            <div className="text-sm text-green-600 space-y-1">
              <div><code className="bg-green-100 px-2 py-1 rounded">[PRODUCT_NAME]</code> - Product title</div>
              <div><code className="bg-green-100 px-2 py-1 rounded">[PRICE]</code> - Product price (without R symbol)</div>
              <div><code className="bg-green-100 px-2 py-1 rounded">[PRODUCT_URL]</code> - Direct link to product page</div>
            </div>
          </div>

          {/* Editable product sharing message */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Edit Product Sharing Template:
              </h4>
              <Button
                onClick={handleResetMessage}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700 h-8 px-2"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
            {isLoadingSetting ? (
              <div className="min-h-[180px] bg-white border border-gray-300 rounded-md flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <Textarea
                value={productSharingMessage}
                onChange={(e) => handleMessageChange(e.target.value)}
                className="min-h-[180px] text-sm font-mono resize-none bg-white border-gray-300 focus:border-green-400 focus:ring-green-400"
                placeholder="Enter your product sharing template..."
                disabled={updateMessageMutation.isPending}
              />
            )}
            
            {/* Save status indicator */}
            {(hasUnsavedChanges || updateMessageMutation.isPending) && (
              <div className="flex items-center gap-2 mt-2 text-sm">
                {updateMessageMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-green-500" />
                    <span className="text-green-500">Saving...</span>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <Save className="h-3 w-3 text-orange-500" />
                    <span className="text-orange-500">You have unsaved changes</span>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {hasUnsavedChanges && (
              <Button
                onClick={handleSaveMessage}
                disabled={updateMessageMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              >
                {updateMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {updateMessageMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
            
            <Button
              onClick={handleWhatsAppShare}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Test WhatsApp
            </Button>

            <Button
              onClick={handleFacebookShare}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Facebook className="h-4 w-4 mr-2" />
              Test Facebook
            </Button>
            
            <Button
              onClick={handleCopyMessage}
              variant="outline"
              className="flex-1 border-green-200 text-green-600 hover:bg-green-50"
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Template'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}