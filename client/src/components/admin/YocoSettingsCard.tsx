import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CreditCard, TestTube, Shield, AlertCircle, CheckCircle } from 'lucide-react';

export function YocoSettingsCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current YoCo environment setting
  const { data: yocoEnvironment, isLoading } = useQuery({
    queryKey: ['/api/admin/settings/yoco_environment'],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Update YoCo environment setting mutation
  const updateEnvironmentMutation = useMutation({
    mutationFn: async (environment: 'test' | 'production') => {
      return apiRequest('PUT', '/api/admin/settings/yoco_environment', { value: environment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/yoco_environment'] });
      toast({
        title: "YoCo Environment Updated",
        description: "Payment environment setting has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update YoCo environment setting.",
        variant: "destructive",
      });
      console.error('Failed to update YoCo environment:', error);
    },
  });

  const currentEnvironment = yocoEnvironment?.data?.settingValue || 'test';
  const isProductionMode = currentEnvironment === 'production';

  const handleToggleChange = (checked: boolean) => {
    const newEnvironment = checked ? 'production' : 'test';
    updateEnvironmentMutation.mutate(newEnvironment);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          YoCo Payment Environment
        </CardTitle>
        <CardDescription>
          Control which YoCo API keys are used for card payments. Switch between test and production environments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Environment Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="yoco-environment" className="text-base font-medium">
                Payment Environment
              </Label>
              <Badge 
                variant={isProductionMode ? "destructive" : "secondary"}
                className={isProductionMode ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}
              >
                {isProductionMode ? "LIVE" : "TEST"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {isProductionMode 
                ? "Using live YoCo keys - real payments will be processed"
                : "Using test YoCo keys - safe for testing without real charges"
              }
            </p>
          </div>
          <Switch
            id="yoco-environment"
            checked={isProductionMode}
            onCheckedChange={handleToggleChange}
            disabled={isLoading || updateEnvironmentMutation.isPending}
          />
        </div>

        <Separator />

        {/* Environment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Test Environment Card */}
          <div className={`p-4 border rounded-lg ${!isProductionMode ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <TestTube className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-blue-800">Test Environment</h4>
              {!isProductionMode && <CheckCircle className="h-4 w-4 text-green-600" />}
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Uses YOCO_TEST_PUBLIC_KEY</li>
              <li>• Uses YOCO_TEST_SECRET_KEY</li>
              <li>• No real money transactions</li>
              <li>• Safe for development & testing</li>
            </ul>
          </div>

          {/* Production Environment Card */}
          <div className={`p-4 border rounded-lg ${isProductionMode ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-red-600" />
              <h4 className="font-medium text-red-800">Production Environment</h4>
              {isProductionMode && <CheckCircle className="h-4 w-4 text-green-600" />}
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Uses YOCO_PROD_PUBLIC_KEY</li>
              <li>• Uses YOCO_PROD_SECRET_KEY</li>
              <li>• Processes real payments</li>
              <li>• Live customer transactions</li>
            </ul>
          </div>
        </div>

        {/* Warning for Production Mode */}
        {isProductionMode && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 mb-1">Production Mode Active</h4>
              <p className="text-sm text-amber-700">
                All card payments will be processed as real transactions. Ensure your live YoCo keys are properly configured.
              </p>
            </div>
          </div>
        )}

        {/* Current Configuration Display */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">Current Configuration</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Environment: <span className="font-mono">{currentEnvironment}</span></div>
            <div>YoCo Mode: <span className="font-mono">{isProductionMode ? 'live' : 'test'}</span></div>
            <div>Keys Used: <span className="font-mono">{isProductionMode ? 'PROD' : 'TEST'}</span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}