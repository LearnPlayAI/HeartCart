import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Share2, Save, RotateCcw, ShoppingBag, Star, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ProductSharingCardProps {
  className?: string;
}

export function ProductSharingCard({ className = '' }: ProductSharingCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [message, setMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch current product sharing message
  const { data: settingData, isLoading } = useQuery({
    queryKey: ['/api/admin/settings/product_sharing_message'],
    queryFn: () => apiRequest('GET', '/api/admin/settings/product_sharing_message')
  });

  // Save message mutation
  const saveMutation = useMutation({
    mutationFn: (value: string) => 
      apiRequest('PATCH', '/api/admin/settings/product_sharing_message', { value }),
    onSuccess: () => {
      setHasUnsavedChanges(false);
      toast({
        title: "Success",
        description: "Product sharing message saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/product_sharing_message'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save product sharing message",
        variant: "destructive",
      });
    }
  });

  const handleMessageChange = (value: string) => {
    setMessage(value);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(message);
  };

  const handleReset = () => {
    const defaultMessage = `🔥 HOT DEAL ALERT! 🔥

✨ [PRODUCT_NAME] ✨

💸 SPECIAL PRICE: R[PRICE]
🎯 Limited time offer - Don't miss out!

🌟 Why You'll LOVE This:
💎 Premium quality guaranteed
🚚 FREE delivery across South Africa  
📦 Secure PUDO locker delivery
💳 Easy EFT payment options
⭐ Trusted by thousands of customers

🎁 BONUS: Follow us for more exclusive deals!

👆 GET YOURS NOW: [PRODUCT_URL]

🛍️ Browse more amazing products: https://teemeyou.shop

💬 Questions? DM us anytime!

#TeeMeYou #DealsOfTheDay #SouthAfricaShopping #QualityProducts #PUDO #OnlineStore #SouthAfrica 🇿🇦

Tag a friend who needs this! 👇`;
    
    setMessage(defaultMessage);
    setHasUnsavedChanges(true);
  };

  // Initialize message when data loads
  useEffect(() => {
    if (settingData?.data?.settingValue && !isLoading) {
      setMessage(settingData.data.settingValue);
    }
  }, [settingData?.data?.settingValue, isLoading]);

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold">Product Sharing Template</CardTitle>
            <CardDescription>
              Customize the template used for sharing products on social media
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="flex items-center gap-1">
            <ShoppingBag className="h-3 w-3" />
            Product Marketing
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            Social Media
          </Badge>
        </div>

        <div className="space-y-2">
          <label htmlFor="product-sharing-message" className="text-sm font-medium">
            Sharing Template
          </label>
          <Textarea
            ref={textareaRef}
            id="product-sharing-message"
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            placeholder="Enter your product sharing template..."
            className="min-h-[300px] resize-none"
            disabled={isLoading || saveMutation.isPending}
          />
          <div className="space-y-1">
            <p className="text-xs text-gray-500">
              Available placeholders:
            </p>
            <div className="text-xs text-gray-500 space-x-4">
              <span className="font-mono bg-gray-100 px-1 rounded">[PRODUCT_NAME]</span>
              <span className="font-mono bg-gray-100 px-1 rounded">[PRICE]</span>
              <span className="font-mono bg-gray-100 px-1 rounded">[PRODUCT_URL]</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1 text-sm text-orange-600">
                <div className="w-2 h-2 bg-orange-600 rounded-full" />
                You have unsaved changes
              </div>
            )}
            {!hasUnsavedChanges && !isLoading && message && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="w-3 h-3" />
                Saved
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isLoading || saveMutation.isPending}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to Default
            </Button>
            
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isLoading || saveMutation.isPending}
              className="flex items-center gap-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
            >
              <Save className="h-3 w-3" />
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}