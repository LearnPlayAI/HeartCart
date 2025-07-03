import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Share2, 
  MessageCircle, 
  Copy, 
  Check,
  Users,
  Heart,
  ExternalLink
} from "lucide-react";

/**
 * Website Share Card Component
 * Allows admins to share the TeeMeYou website with friends and family via WhatsApp
 */
export function WebsiteShareCard() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Website sharing message using the user's exact text
  const websiteShareMessage = `🛍️ Welcome to Tee Me You 🛍️

Hi Family and Friends! We are excited to invite you to join our new online store - https://teemeyou.shop 

✨ What we offer:
• Quality products at great prices
• Fast delivery across South Africa (PUDO)
• EFT payment option (Credit Card Payments using PayFast Coming Soon!)
• Become a Rep and get up to 10% of the profits people signed up with your RepCode generate.

🔗 Register here: https://teemeyou.shop
🆘 Found an issue? Please let us know:
📱 WhatsApp: +27712063084
📧 Email: sales@teemeyou.shop

Please feel free to forward this to your trusted friends and not to strangers before we completed the implementation of the Credit/Debit Card Payment System.

Thank you for supporting our growing business! 🙏
[TeeMeYou Logo]`;

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(websiteShareMessage)}`;
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "WhatsApp opened",
      description: "Share the message with your friends and family to help grow TeeMeYou!",
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
    window.open('https://teemeyou.shop', '_blank');
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
                Share TeeMeYou with your network and grow our business together
              </CardDescription>
            </div>
          </div>
          <Users className="h-8 w-8 text-pink-400" />
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Preview of the sharing message */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Preview Message:</h4>
            <div className="text-sm text-gray-600 whitespace-pre-line font-mono">
              {websiteShareMessage}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
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
                  They can help us improve TeeMeYou by reporting any issues they encounter.
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-blue-600">
                  <div className="flex items-center gap-1">
                    <span>📱</span>
                    <span>WhatsApp: +27712063084</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>📧</span>
                    <span>sales@teemeyou.shop</span>
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
              teemeyou.shop
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}