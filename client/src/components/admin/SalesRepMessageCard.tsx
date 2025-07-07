import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Save, RotateCcw, Users, DollarSign, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SalesRepMessageCardProps {
  className?: string;
}

export function SalesRepMessageCard({ className = '' }: SalesRepMessageCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [message, setMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch current sales rep message
  const { data: settingData, isLoading } = useQuery({
    queryKey: ['/api/admin/settings/sales_rep_message'],
    queryFn: () => apiRequest('GET', '/api/admin/settings/sales_rep_message')
  });

  // Save message mutation
  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      try {
        const result = await apiRequest('PATCH', '/api/admin/settings/sales_rep_message', { value });
        
        if (!result?.success) {
          throw new Error('Failed to save sales rep message setting');
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
        title: "Success",
        description: "Sales rep message saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/sales_rep_message'] });
    },
    onError: (error: any) => {
      console.error('Sales rep message save error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save sales rep message",
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
    const defaultMessage = `🎉 JOIN THE TeeMeYou SALES TEAM! 🎉

💎 Become a Sales Representative and start earning TODAY! 💎

🌟 Why Choose Our Program?
💰 Earn commissions on EVERY sale
🚀 Work from anywhere, anytime  
📱 No experience needed - we'll guide you
💼 Perfect side hustle or full-time opportunity

🔥 What You Get:
✅ Personalized registration link 
✅ Marketing support & training
✅ Real-time commission tracking
✅ Fast payments directly to your account

💡 How It Works:
1️⃣ Share your unique link with friends & family
2️⃣ They shop quality products on TeeMeYou 
3️⃣ You earn commission on every purchase! 💸

🎯 Perfect For:
👥 Social media enthusiasts
📢 People with large networks  
💪 Go-getters wanting extra income
🏠 Stay-at-home parents

🚀 START EARNING NOW:
👆 Register here: https://teemeyou.shop/auth?tab=register&repCode={REP_CODE}

💬 Questions? We're here to help!
📧 sales@teemeyou.shop
🌐 https://teemeyou.shop

#TeeMeYou #SalesRep #EarnMoney #SouthAfrica #WorkFromHome 🇿🇦`;
    
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
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold">Sales Rep Recruitment Message</CardTitle>
            <CardDescription>
              Customize the message used to recruit new sales representatives
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Rep Recruitment
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Commission-based
          </Badge>
        </div>

        <div className="space-y-2">
          <label htmlFor="sales-rep-message" className="text-sm font-medium">
            Recruitment Message
          </label>
          <Textarea
            ref={textareaRef}
            id="sales-rep-message"
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            placeholder="Enter your sales rep recruitment message..."
            className="min-h-[300px] resize-none"
            disabled={isLoading || saveMutation.isPending}
          />
          <p className="text-xs text-gray-500">
            Use {"{REP_CODE}"} as a placeholder that will be replaced with the actual rep code
          </p>
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