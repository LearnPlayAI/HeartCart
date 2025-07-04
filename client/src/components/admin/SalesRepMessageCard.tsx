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
  Users,
  Briefcase,
  ExternalLink,
  RotateCcw,
  Edit3,
  Loader2,
  Save,
  DollarSign
} from "lucide-react";

/**
 * Sales Rep Message Card Component
 * Allows admins to customize text for sales rep recruitment messages including repCode URLs
 * Uses systemSettings for persistent storage
 */
export function SalesRepMessageCard() {
  const [copied, setCopied] = useState(false);
  const [localMessage, setLocalMessage] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Default sales rep message with repCode placeholder
  const defaultMessage = `🚀 Exciting Sales Rep Opportunity! 🚀

Hi [NAME]! I'd love to invite you to become a TeeMeYou Sales Representative and start earning commission on every sale!

💰 What you'll earn:
• Up to 10% commission on profit margins
• Passive income from your network
• No investment required - completely FREE to join

🔗 Your special registration link: https://teemeyou.shop/auth?tab=register&repCode=[REPCODE]

📱 How it works:
1. Share your unique registration link with friends and family
2. When they register and make purchases, you earn commission
3. Track your earnings in the admin dashboard

✨ Why TeeMeYou?
• Quality products at great prices
• Fast delivery across South Africa (PUDO)
• Growing online business with great potential

🆘 Questions? Contact us:
📱 WhatsApp: +27712063084
📧 Email: sales@teemeyou.shop

Ready to start earning? Click your link above and let's grow together! 💪

[TeeMeYou Team]`;

  // Fetch message from systemSettings
  const { data: settingResponse, isLoading: isLoadingSetting } = useQuery({
    queryKey: ['/api/admin/settings/sales_rep_message'],
    queryFn: async () => {
      const response = await fetch('/api/admin/settings/sales_rep_message', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch setting');
      return response.json();
    }
  });

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest('PATCH', '/api/admin/settings/sales_rep_message', {
        value: message
      });
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      toast({
        title: "Sales rep message saved",
        description: "Your sales rep recruitment message has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/sales_rep_message'] });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: "Failed to save your sales rep message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Get the current message (from API or local state)
  const salesRepMessage = localMessage || settingResponse?.data?.settingValue || defaultMessage;

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
      await navigator.clipboard.writeText(salesRepMessage);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Sales rep message copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy message to clipboard",
        variant: "destructive",
      });
    }
  };

  // Generate sample WhatsApp URL for testing
  const handleWhatsAppShare = () => {
    const sampleMessage = salesRepMessage
      .replace(/\[NAME\]/g, 'John')
      .replace(/\[REPCODE\]/g, 'SAMPLE123');
    
    const encodedMessage = encodeURIComponent(sampleMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Card className="border-blue-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-full">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-blue-700 flex items-center gap-2">
                Sales Rep Communications
                <Badge className="bg-blue-500 text-white text-xs">CUSTOMIZE</Badge>
              </CardTitle>
              <CardDescription className="text-blue-600">
                Customize recruitment messages for sales representatives with repCode URLs
              </CardDescription>
            </div>
          </div>
          <DollarSign className="h-8 w-8 text-blue-400" />
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Placeholder Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-blue-700 mb-2">Template Placeholders:</h4>
            <div className="text-sm text-blue-600 space-y-1">
              <div><code className="bg-blue-100 px-2 py-1 rounded">[NAME]</code> - Sales rep's name</div>
              <div><code className="bg-blue-100 px-2 py-1 rounded">[REPCODE]</code> - Sales rep's unique code for URL</div>
            </div>
          </div>

          {/* Editable sales rep message */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Edit Sales Rep Message:
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
              <div className="min-h-[200px] bg-white border border-gray-300 rounded-md flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <Textarea
                value={salesRepMessage}
                onChange={(e) => handleMessageChange(e.target.value)}
                className="min-h-[200px] text-sm font-mono resize-none bg-white border-gray-300 focus:border-blue-400 focus:ring-blue-400"
                placeholder="Enter your sales rep recruitment message..."
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
              Test WhatsApp Share
            </Button>
            
            <Button
              onClick={handleCopyMessage}
              variant="outline"
              className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Message'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}