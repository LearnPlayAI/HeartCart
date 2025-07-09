import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Copy, MessageCircle, Mail, Send, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FaFacebook, FaTwitter } from "react-icons/fa";
import { useQuery } from "@tanstack/react-query";
import { ensureValidImageUrl } from "@/utils/file-utils";

interface ShareProductDialogProps {
  productId: number;
  productTitle: string;
  productPrice: number;
  salePrice?: number;
  productImage?: string;
  trigger?: React.ReactNode;
}

export default function ShareProductDialog({ 
  productId, 
  productTitle, 
  productPrice,
  salePrice,
  productImage,
  trigger 
}: ShareProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Use sale price if available, otherwise regular price
  const displayPrice = salePrice || productPrice;
  
  // Generate product URLs - always use production domain for sharing
  const productUrl = `https://teemeyou.shop/product/id/${productId}`;
  
  // For WhatsApp sharing, use social preview URL to ensure rich card display
  const socialPreviewUrl = `https://teemeyou.shop/api/social-preview/product/${productId}`;
  
  // Fetch dynamic product sharing template from public settings (available to all users)
  const { data: sharingTemplate, isLoading: templateLoading, error: templateError } = useQuery({
    queryKey: ['/api/settings/product_sharing_message'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fallback hardcoded template if system settings fail
  const fallbackTemplate = `🎯 *${productTitle}* 🎯

💰 *Price: R${displayPrice.toLocaleString()}*
${salePrice && productPrice !== salePrice ? `~~R${productPrice.toLocaleString()}~~ *SAVE R${(productPrice - salePrice).toLocaleString()}!*` : ''}

🛍️ Shop on TeeMeYou - South Africa's trusted online marketplace
🚚 Fast delivery across SA
💳 Secure payment options
⭐ Quality guaranteed

🇿🇦 Connect with South Africa's community

🤝 Bringing people together 🎯 Trusted community 📍 Local connections

👆 Tap to view full details and photos`;

  // Use dynamic template with placeholder replacement, fallback to hardcoded
  // Access the correct field: settingValue from the API response
  const dynamicTemplate = sharingTemplate?.data?.settingValue;
  const templateText = dynamicTemplate || fallbackTemplate;
  
  // Replace placeholders with actual product data, handling promotional pricing
  let shareText = templateText;
  
  // Product name replacement
  shareText = shareText.replace(/\[PRODUCT_NAME\]/g, productTitle);
  
  // Smart price replacement - if product has sale price, show both original and sale price
  if (salePrice && productPrice !== salePrice) {
    const savingsAmount = productPrice - salePrice;
    const discountPercentage = Math.round((savingsAmount / productPrice) * 100);
    
    // For promotional products, replace [PRICE] with "R199 (was R299) - SAVE R100 (33% OFF)!"
    const promotionalPricing = `${displayPrice.toLocaleString()} (was R${productPrice.toLocaleString()}) - SAVE R${savingsAmount.toLocaleString()} (${discountPercentage}% OFF)!`;
    shareText = shareText.replace(/\[PRICE\]/g, promotionalPricing);
  } else {
    // For regular products, just show the price
    shareText = shareText.replace(/\[PRICE\]/g, displayPrice.toLocaleString());
  }
  
  // Product URL replacement
  shareText = shareText.replace(/\[PRODUCT_URL\]/g, productUrl);

  const shareData = {
    title: `${productTitle} - R${displayPrice.toLocaleString()} | TeeMeYou`,
    text: shareText,
    url: productUrl,
  };

  // Check if native share is available
  const canShare = 'share' in navigator;

  const handleNativeShare = async () => {
    if (canShare) {
      try {
        await navigator.share(shareData);
        setOpen(false);
        
      } catch (error) {
        // User cancelled or error occurred
        if (error instanceof Error && error.name !== 'AbortError') {
          toast({
            title: "Share failed",
            description: "Please try copying the link instead.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the URL from your browser.",
        variant: "destructive",
      });
    }
  };

  const handleWhatsAppShare = () => {
    // Use social preview URL for rich WhatsApp card display
    const whatsappMessage = `${shareText}

🔗 ${socialPreviewUrl}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
    setOpen(false);
  };

  const handleFacebookShare = () => {
    // Use regular product URL - Facebook will crawl for Open Graph tags on the actual product page
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setOpen(false);
  };

  const handleTwitterShare = () => {
    // Use dynamic template for consistent messaging across all platforms
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setOpen(false);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out this ${productTitle} on TeeMeYou`);
    // Use dynamic template with additional product URL for email format
    const emailBody = `Hi,

I found this interesting product on TeeMeYou that you might like:

${shareText}

View it here: ${productUrl}

Best regards`;
    
    const body = encodeURIComponent(emailBody);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailtoUrl);
    setOpen(false);
  };

  const handleSMSShare = () => {
    // Use dynamic template with product URL for SMS
    const smsText = `${shareText}

${productUrl}`;
    const smsUrl = `sms:?body=${encodeURIComponent(smsText)}`;
    window.open(smsUrl);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="lg" className="border-pink-200 text-pink-600 hover:bg-pink-50">
            <Share2 className="w-5 h-5" />
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md max-w-[95vw] mx-auto" aria-describedby="share-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-pink-600">
            <Share2 className="w-5 h-5" />
            Share this product
          </DialogTitle>
          <p id="share-description" className="text-sm text-muted-foreground sr-only">
            Share this product via social media, messaging apps, or copy the link to share with others.
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Product Preview */}
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-100">
            {productImage && (
              <img 
                src={ensureValidImageUrl(productImage)} 
                alt={productTitle}
                className="w-12 h-12 object-cover rounded border border-pink-200"
                onError={(e) => {
                  console.error('ShareProductDialog: Failed to load product image:', productImage);
                  console.log('ShareProductDialog: Processed URL:', ensureValidImageUrl(productImage));
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-gray-800">{productTitle}</p>
              <div className="flex items-center gap-2">
                <p className="text-pink-600 font-bold">R{displayPrice.toLocaleString()}</p>
                {salePrice && productPrice !== salePrice && (
                  <p className="text-gray-400 text-sm line-through">R{productPrice.toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>

          {/* Native Share Button (if available) */}
          {canShare && (
            <Button 
              onClick={handleNativeShare}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share via device
            </Button>
          )}

          {/* Share Options Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Copy Link */}
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 h-12 border-gray-200 hover:bg-gray-50"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              <span className="text-sm">Copy Link</span>
            </Button>

            {/* WhatsApp */}
            <Button
              variant="outline"
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-2 h-12 text-green-600 border-green-200 hover:bg-green-50"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">WhatsApp</span>
            </Button>

            {/* Facebook */}
            <Button
              variant="outline"
              onClick={handleFacebookShare}
              className="flex items-center justify-center gap-2 h-12 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <FaFacebook className="w-4 h-4" />
              <span className="text-sm">Facebook</span>
            </Button>

            {/* Twitter */}
            <Button
              variant="outline"
              onClick={handleTwitterShare}
              className="flex items-center justify-center gap-2 h-12 text-blue-400 border-blue-200 hover:bg-blue-50"
            >
              <FaTwitter className="w-4 h-4" />
              <span className="text-sm">Twitter</span>
            </Button>

            {/* Email */}
            <Button
              variant="outline"
              onClick={handleEmailShare}
              className="flex items-center justify-center gap-2 h-12 border-gray-200 hover:bg-gray-50"
            >
              <Mail className="w-4 h-4" />
              <span className="text-sm">Email</span>
            </Button>

            {/* SMS */}
            <Button
              variant="outline"
              onClick={handleSMSShare}
              className="flex items-center justify-center gap-2 h-12 border-gray-200 hover:bg-gray-50"
            >
              <Send className="w-4 h-4" />
              <span className="text-sm">SMS</span>
            </Button>
          </div>

          {/* URL Display */}
          <div className="pt-2 border-t border-pink-100">
            <p className="text-xs text-muted-foreground mb-2">Product URL:</p>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs break-all border">
              <span className="flex-1 text-gray-600">{productUrl}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}