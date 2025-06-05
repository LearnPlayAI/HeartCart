/**
 * Pricing Step
 * 
 * This component manages the product pricing information,
 * including regular price, cost price, sale price, and tax settings.
 */

import { useState } from 'react';
import { useDraftContext } from '../DraftContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Calculator, 
  PercentIcon,
  DollarSign,
  BadgePercent
} from 'lucide-react';
import { formatPrice, calculateDiscountPercentage, debounce, parsePreciseDecimal } from '@/lib/utils';

interface PricingStepProps {
  onNext: () => void;
}

export function PricingStep({ onNext }: PricingStepProps) {
  const { draft, updateDraft, saveDraft } = useDraftContext();
  
  // Auto-save with debounce
  const debouncedSave = debounce(async () => {
    try {
      await saveDraft();
    } catch (err) {
      console.error('Failed to auto-save draft:', err);
    }
  }, 1500);
  
  // Handle form field changes
  const handleChange = (field: string, value: string | number | boolean | null) => {
    updateDraft({ [field]: value });
    debouncedSave();
  };
  
  // Handle numeric input change with precision preservation
  const handleNumericChange = (field: string, rawValue: string) => {
    const preciseValue = parsePreciseDecimal(rawValue, 2);
    handleChange(field, preciseValue);
  };
  
  // Calculate profit margin
  const calculateMargin = () => {
    if (!draft?.regularPrice || !draft?.costPrice || draft.costPrice <= 0) {
      return null;
    }
    
    const margin = ((draft.regularPrice - draft.costPrice) / draft.regularPrice) * 100;
    return Math.round(margin * 100) / 100; // Round to 2 decimal places
  };
  
  // Get discount percentage (compare-at price vs regular price)
  const discountPercentage = calculateDiscountPercentage(
    draft?.compareAtPrice || draft?.regularPrice, 
    draft?.regularPrice
  );
  
  // Get sale discount percentage (regular price vs sale price)
  const saleDiscountPercentage = calculateDiscountPercentage(
    draft?.regularPrice, 
    draft?.salePrice
  );
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Pricing</h2>
      <p className="text-muted-foreground">
        Set your product pricing, including cost, regular price, and promotional pricing.
      </p>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Regular Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Regular Price <span className="text-destructive">*</span></Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-9"
                  value={draft?.price ?? ''}
                  onChange={(e) => handleNumericChange('price', e.target.value)}
                  required
                />
              </div>
            </div>
            
            {/* Cost Price */}
            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="costPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-9"
                  value={draft?.costPrice ?? ''}
                  onChange={(e) => handleNumericChange('costPrice', e.target.value)}
                />
              </div>
              {draft?.price && draft?.costPrice && (
                <div className="text-sm mt-1">
                  <span 
                    className={calculateMargin() && calculateMargin()! < 0 
                      ? "text-destructive" 
                      : "text-muted-foreground"
                    }
                  >
                    Margin: {calculateMargin() !== null ? `${calculateMargin()}%` : 'N/A'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Compare at Price */}
            <div className="space-y-2">
              <Label htmlFor="compareAtPrice">Compare-at Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="compareAtPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-9"
                  value={draft?.compareAtPrice ?? ''}
                  onChange={(e) => handleNumericChange('compareAtPrice', e.target.value)}
                />
              </div>
              {discountPercentage && (
                <div className="text-sm mt-1">
                  <span className="text-green-600 flex items-center">
                    <BadgePercent className="h-3 w-3 mr-1" /> 
                    {discountPercentage}% off
                  </span>
                </div>
              )}
            </div>
            
            {/* Tax Settings */}
            <div className="space-y-2">
              <Label htmlFor="taxRatePercentage">Tax Rate (%)</Label>
              <div className="relative">
                <PercentIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="taxRatePercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-9"
                  value={draft?.taxRatePercentage ?? ''}
                  onChange={(e) => handleNumericChange('taxRatePercentage', e.target.value)}
                />
              </div>
            </div>
            
            {/* On Sale Switch */}
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="onSale"
                  checked={draft?.onSale || false}
                  onCheckedChange={(checked) => handleChange('onSale', checked)}
                />
                <Label htmlFor="onSale">This product is on sale</Label>
              </div>
              
              {draft?.onSale && (
                <div className="pt-2 pl-6 space-y-2">
                  <Label htmlFor="salePrice">Sale Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="salePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-9"
                      value={draft?.salePrice ?? ''}
                      onChange={(e) => handleNumericChange('salePrice', e.target.value)}
                    />
                  </div>
                  {saleDiscountPercentage && (
                    <div className="text-sm mt-1">
                      <span className="text-green-600 flex items-center">
                        <BadgePercent className="h-3 w-3 mr-1" /> 
                        {saleDiscountPercentage}% off regular price
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Price Summary Card */}
          <div className="mt-8 bg-muted/50 p-4 rounded-md">
            <h3 className="text-lg font-medium flex items-center mb-3">
              <Calculator className="mr-2 h-4 w-4" />
              Price Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium">Regular Price:</div>
                <div className="text-lg">{formatPrice(draft?.price)}</div>
              </div>
              
              {draft?.compareAtPrice ? (
                <div>
                  <div className="text-sm font-medium">Compare-at Price:</div>
                  <div className="text-lg line-through text-muted-foreground">
                    {formatPrice(draft?.compareAtPrice)}
                  </div>
                </div>
              ) : null}
              
              {draft?.onSale && draft?.salePrice ? (
                <div>
                  <div className="text-sm font-medium">Sale Price:</div>
                  <div className="text-lg text-green-600">{formatPrice(draft?.salePrice)}</div>
                </div>
              ) : null}
              
              {draft?.costPrice ? (
                <div>
                  <div className="text-sm font-medium">Cost Price:</div>
                  <div className="text-lg">{formatPrice(draft?.costPrice)}</div>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}