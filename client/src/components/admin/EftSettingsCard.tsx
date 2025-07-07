/**
 * EFT Settings Card Component
 * Allows admin to enable/disable EFT payment option for customers
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export function EftSettingsCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current EFT setting
  const { data: eftSetting, isLoading } = useQuery({
    queryKey: ['/api/admin/settings/eft_payments_enabled'],
  });

  // Update EFT setting mutation
  const updateEftSetting = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest('PUT', '/api/admin/settings/eft_payments_enabled', {
        value: enabled.toString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/eft_payments_enabled'] });
      toast({
        title: 'EFT Settings Updated',
        description: 'EFT payment setting has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update EFT payment setting.',
        variant: 'destructive',
      });
    },
  });

  const currentEftEnabled = eftSetting?.data?.settingValue === 'true';

  const handleToggleChange = (checked: boolean) => {
    updateEftSetting.mutate(checked);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            EFT Payment Settings
          </CardTitle>
          <CardDescription>Loading EFT payment configuration...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          EFT Payment Settings
        </CardTitle>
        <CardDescription>
          Control whether customers can use EFT bank transfer payments during checkout
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* EFT Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="eft-enabled" className="text-base font-medium">
              EFT Payments
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow customers to pay via bank transfer (EFT)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={currentEftEnabled ? "default" : "secondary"}>
              {currentEftEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <Switch
              id="eft-enabled"
              checked={currentEftEnabled}
              onCheckedChange={handleToggleChange}
              disabled={updateEftSetting.isPending}
            />
          </div>
        </div>

        {/* Payment Methods Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Card Payments</span>
            </div>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Always Available
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              YoCo card payments are always enabled
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="h-4 w-4 text-green-600" />
              <span className="font-medium">EFT Payments</span>
            </div>
            <Badge variant={currentEftEnabled ? "default" : "secondary"} 
                   className={currentEftEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
              {currentEftEnabled ? 'Available' : 'Disabled'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {currentEftEnabled 
                ? 'Customers can use bank transfer' 
                : 'EFT option hidden from checkout'}
            </p>
          </div>
        </div>

        {/* Impact Notice */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Impact:</strong> When disabled, the EFT payment option will be hidden from checkout 
            and customers cannot select bank transfer as a payment method.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}