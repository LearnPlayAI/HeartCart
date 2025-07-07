import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Save, Calculator, FileText } from 'lucide-react';

interface VATSettings {
  vatRate: string;
  vatRegistrationNumber: string;
  vatRegistered: string;
}

export function VATSettingsCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [vatRate, setVatRate] = useState('');
  const [vatRegistrationNumber, setVatRegistrationNumber] = useState('');
  const [vatRegistered, setVatRegistered] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch VAT settings
  const { data: vatRateSetting } = useQuery({
    queryKey: ['/api/admin/settings/vatRate'],
    queryFn: () => apiRequest('GET', '/api/admin/settings/vatRate'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: vatRegNumberSetting } = useQuery({
    queryKey: ['/api/admin/settings/vatRegistrationNumber'],
    queryFn: () => apiRequest('GET', '/api/admin/settings/vatRegistrationNumber'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: vatRegisteredSetting } = useQuery({
    queryKey: ['/api/admin/settings/vatRegistered'],
    queryFn: () => apiRequest('GET', '/api/admin/settings/vatRegistered'),
    staleTime: 5 * 60 * 1000,
  });

  // Initialize form values when data loads
  React.useEffect(() => {
    if (vatRateSetting?.data?.settingValue !== undefined) {
      setVatRate(vatRateSetting.data.settingValue);
    }
    if (vatRegNumberSetting?.data?.settingValue !== undefined) {
      setVatRegistrationNumber(vatRegNumberSetting.data.settingValue);
    }
    if (vatRegisteredSetting?.data?.settingValue !== undefined) {
      setVatRegistered(vatRegisteredSetting.data.settingValue === 'true');
    }
  }, [vatRateSetting, vatRegNumberSetting, vatRegisteredSetting]);

  // Save VAT settings mutation
  const saveVATSettingsMutation = useMutation({
    mutationFn: async (settings: VATSettings) => {
      // Save all three settings
      await Promise.all([
        apiRequest('PUT', '/api/admin/settings/vatRate', { settingValue: settings.vatRate }),
        apiRequest('PUT', '/api/admin/settings/vatRegistrationNumber', { settingValue: settings.vatRegistrationNumber }),
        apiRequest('PUT', '/api/admin/settings/vatRegistered', { settingValue: settings.vatRegistered }),
      ]);
    },
    onSuccess: () => {
      // Invalidate all VAT settings queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/vatRate'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/vatRegistrationNumber'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/vatRegistered'] });
      
      setHasUnsavedChanges(false);
      toast({
        title: "VAT Settings Saved",
        description: "VAT configuration has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving VAT Settings",
        description: error.message || "Failed to save VAT settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVatRateChange = (value: string) => {
    setVatRate(value);
    setHasUnsavedChanges(true);
  };

  const handleVatRegNumberChange = (value: string) => {
    setVatRegistrationNumber(value);
    setHasUnsavedChanges(true);
  };

  const handleVatRegisteredChange = (checked: boolean) => {
    setVatRegistered(checked);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    saveVATSettingsMutation.mutate({
      vatRate,
      vatRegistrationNumber,
      vatRegistered: vatRegistered.toString(),
    });
  };

  const currentVatRateNum = parseFloat(vatRate) || 0;

  return (
    <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          <div>
            <CardTitle>South African VAT Configuration</CardTitle>
            <CardDescription className="text-orange-100">
              Configure Value Added Tax (VAT) settings for your business
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* VAT Registration Status */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-200">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">VAT Registered Business</Label>
            <p className="text-sm text-muted-foreground">
              Enable this when your company becomes VAT registered with SARS
            </p>
          </div>
          <Switch
            checked={vatRegistered}
            onCheckedChange={handleVatRegisteredChange}
          />
        </div>

        {/* VAT Rate Setting */}
        <div className="space-y-2">
          <Label htmlFor="vatRate" className="text-base font-medium">VAT Rate (%)</Label>
          <Input
            id="vatRate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="0.00"
            value={vatRate}
            onChange={(e) => handleVatRateChange(e.target.value)}
            className="text-lg"
          />
          <p className="text-sm text-muted-foreground">
            Current South African VAT rate is 15%. Set to 0% while not VAT registered.
          </p>
          
          {/* VAT Rate Display */}
          {currentVatRateNum > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>VAT will be calculated at {currentVatRateNum}%</strong> on all order totals
              </p>
            </div>
          )}
          
          {currentVatRateNum === 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>VAT is currently 0%</strong> - Orders will show VAT line items but with R0.00 amounts
              </p>
            </div>
          )}
        </div>

        {/* VAT Registration Number */}
        <div className="space-y-2">
          <Label htmlFor="vatRegNumber" className="text-base font-medium">VAT Registration Number</Label>
          <Input
            id="vatRegNumber"
            placeholder="e.g., 4123456789"
            value={vatRegistrationNumber}
            onChange={(e) => handleVatRegNumberChange(e.target.value)}
            className="text-lg"
          />
          <p className="text-sm text-muted-foreground">
            Your SARS VAT registration number (leave empty if not VAT registered)
          </p>
        </div>

        {/* Information Section */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-800">VAT Implementation Information</p>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• VAT will be displayed on all orders, cart, checkout, and email notifications</li>
                <li>• Invoice PDFs will include VAT registration number when registered</li>
                <li>• Historical orders store the VAT rate used at time of purchase</li>
                <li>• Supplier order costs will account for VAT in profit calculations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-700 flex-1">You have unsaved changes</p>
            <Button 
              onClick={handleSave}
              disabled={saveVATSettingsMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveVATSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}