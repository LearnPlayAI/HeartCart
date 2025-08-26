/**
 * Admin Shipping Fee Settings Card Component
 * Allows admin to skip shipping fees for testing card payments
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Truck, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export function AdminShippingFeeCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current shipping fee skip setting
  const { data: shippingFeeSetting, isLoading } = useQuery({
    queryKey: ['/api/admin/settings/skip_shipping_fee_for_admin'],
  });

  // Update shipping fee skip setting mutation
  const updateShippingFeeSetting = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest('PUT', '/api/admin/settings/skip_shipping_fee_for_admin', {
        value: enabled.toString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/skip_shipping_fee_for_admin'] });
      toast({
        title: 'Shipping Fee Settings Updated',
        description: 'Admin shipping fee skip setting has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update shipping fee skip setting.',
        variant: 'destructive',
      });
    },
  });

  const currentSkipEnabled = shippingFeeSetting?.data?.settingValue === 'true';

  const handleToggleChange = (checked: boolean) => {
    updateShippingFeeSetting.mutate(checked);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Admin Shipping Fee Settings
          </CardTitle>
          <CardDescription>Loading admin shipping fee configuration...</CardDescription>
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
          <TestTube className="h-5 w-5" />
          Admin Shipping Fee Settings
        </CardTitle>
        <CardDescription>
          Skip shipping fees for admin card payments to enable testing with cheaper amounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Shipping Fee Skip Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="skip-shipping-fee" className="text-base font-medium">
              Skip Shipping Fees for Admin
            </Label>
            <p className="text-sm text-muted-foreground">
              Remove shipping fees from card payments when admin places orders
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={currentSkipEnabled ? "default" : "secondary"}>
              {currentSkipEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <Switch
              id="skip-shipping-fee"
              checked={currentSkipEnabled}
              onCheckedChange={handleToggleChange}
              disabled={updateShippingFeeSetting.isPending}
            />
          </div>
        </div>

        {/* Shipping Fee Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Regular Customers</span>
            </div>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Shipping Always Applied
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Normal customers always pay shipping costs (R85 lockers / R119 door)
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TestTube className="h-4 w-4 text-purple-600" />
              <span className="font-medium">Admin Testing</span>
            </div>
            <Badge variant={currentSkipEnabled ? "default" : "secondary"} 
                   className={currentSkipEnabled ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-600"}>
              {currentSkipEnabled ? 'Shipping Skipped' : 'Shipping Charged'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {currentSkipEnabled 
                ? 'Admin card payments skip shipping fees' 
                : 'Admin pays normal shipping costs'}
            </p>
          </div>
        </div>

        {/* Impact Notice */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800">
            <strong>Testing Impact:</strong> When enabled, admin users pay reduced amounts during card payments, 
            but orders still show full amount including shipping in database, emails, and invoices.
          </p>
        </div>

        {/* Usage Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Usage:</strong> Enable this setting to test real card payments with cheaper amounts. 
            For example, a R50 product will charge R50 instead of R169 (R50 + R119 door shipping).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}