import { useState, useEffect, useCallback } from "react";
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
  Users,
  Heart,
  ExternalLink,
  RotateCcw,
  Edit3,
  Loader2,
  Save
} from "lucide-react";



/**
 * Website Share Card Component
 * Allows admins to share the HeartCart website with friends and family via WhatsApp
 * Uses systemSettings for persistent storage
 */
export function WebsiteShareCard() {
  const [copied, setCopied] = useState(false);
  const [localMessage, setLocalMessage] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Default website sharing message
  const defaultMessage = `🛍️ Welcome to HeartCart 🛍️

Hi Family and Friends! We are excited to invite you to join our new online store - https://heartcart.shop 

✨ What we offer:
• Quality products at great prices
• Fast delivery across South Africa (PUDO)
• EFT payment option (Credit Card Payments using PayFast Coming Soon!)
• Become a Rep and get up to 10% of the profits people signed up with your RepCode generate.

🔗 Register here: https://heartcart.shop
🆘 Found an issue? Please let us know:
📱 WhatsApp: +27712063084
📧 Email: sales@heartcart.shop

Please feel free to forward this to your trusted friends and not to strangers before we completed the implementation of the Credit/Debit Card Payment System.

Thank you for supporting our growing business! 🙏
[HeartCart Logo]`;

  // Fetch message from systemSettings
  const { data: settingResponse, isLoading: isLoadingSetting } = useQuery({
    queryKey: ['/api/admin/settings/website_share_message'],
    queryFn: () => apiRequest('GET', '/api/admin/settings/website_share_message'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      try {
        const result = await apiRequest('PATCH', '/api/admin/settings/website_share_message', {
          value: message
        });
        
        if (!result?.success) {
          throw new Error('Failed to save website share message setting');
        }
        
        return result;
      } catch (error: any) {
        // Enhanced error handling for different types of errors
        if (error.message && error.message.includes('<!DOCTYPE html>')) {
          throw new Error('Server error occurred. Please check your connection and try again.');
        }
        if (error.message && error.message.includes('JSON')) {
          throw new Error('Invalid server response. Please try again or contact support.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      toast({
        title: "Message saved",
        description: "Your sharing message has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/website_share_message'] });
    },
    onError: (error: any) => {
      console.error('Website share message save error:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save your message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Get the current message (from API or local state)
  const websiteShareMessage = localMessage || settingResponse?.data?.settingValue || defaultMessage;

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

  const handleResetMessage = () => {
    setLocalMessage(defaultMessage);
    setHasUnsavedChanges(false);
    updateMessageMutation.mutate(defaultMessage);
    toast({
      title: "Message reset",
      description: "The message has been reset to the default text.",
    });
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(websiteShareMessage)}`;
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "WhatsApp opened",
      description: "Share the message with your friends and family to help grow HeartCart!",
    });
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(websiteShareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Message copied!",
        description: "The invitation message has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the message from the preview below.",
        variant: "destructive",
      });
    }
  };

  const handleOpenWebsite = () => {
    window.open('https://heartcart.shop', '_blank');
  };

  return (
    <Card className="border-pink-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-pink-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500 rounded-full">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-pink-700 flex items-center gap-2">
                Invite Friends & Family
                <Badge className="bg-pink-500 text-white text-xs">BETA</Badge>
              </CardTitle>
              <CardDescription className="text-pink-600">
                Share HeartCart with your network and grow our business together
              </CardDescription>
            </div>
          </div>
          <Users className="h-8 w-8 text-pink-400" />
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Editable sharing message */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Edit Message:
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
                value={websiteShareMessage}
                onChange={(e) => handleMessageChange(e.target.value)}
                className="min-h-[180px] text-sm font-mono resize-none bg-white border-gray-300 focus:border-pink-400 focus:ring-pink-400"
                placeholder="Enter your sharing message..."
                disabled={updateMessageMutation.isPending}
              />
            )}
            
            {/* Save status indicator */}
            {(hasUnsavedChanges || updateMessageMutation.isPending) && (
              <div className="flex items-center gap-2 mt-2 text-sm">
                {updateMessageMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                    <span className="text-blue-500">Saving...</span>
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
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
              <MessageCircle className="h-4 w-4 mr-2" />
              Share via WhatsApp
            </Button>
            
            <Button
              onClick={handleCopyMessage}
              variant="outline"
              className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50"
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Message'}
            </Button>
          </div>

          {/* Additional info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-blue-500 rounded-full">
                <Share2 className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-800 text-sm mb-1">
                  Beta Testing Community
                </h4>
                <p className="text-blue-700 text-sm">
                  Your friends and family will be part of our beta testing group. 
                  They can help us improve HeartCart by reporting any issues they encounter.
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-blue-600">
                  <div className="flex items-center gap-1">
                    <span>📱</span>
                    <span>WhatsApp: +27712063084</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>📧</span>
                    <span>sales@heartcart.shop</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick website access */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="text-sm text-gray-600">
              Visit our website:
            </span>
            <Button
              onClick={handleOpenWebsite}
              variant="ghost"
              size="sm"
              className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              heartcart.shop
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}