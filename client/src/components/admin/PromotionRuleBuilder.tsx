import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Info, RotateCcw } from 'lucide-react';

// Rule type definitions
interface PromotionRule {
  type: 'minimum_quantity_same_promotion' | 'minimum_order_value' | 'buy_x_get_y' | 'category_mix' | 'none';
  [key: string]: any;
}

interface PromotionRuleBuilderProps {
  value?: PromotionRule | null;
  onChange: (rule: PromotionRule | null) => void;
  disabled?: boolean;
}

const RULE_TYPES = [
  { value: 'none', label: 'No Special Rules', description: 'Standard promotion without additional requirements' },
  { value: 'minimum_quantity_same_promotion', label: 'Minimum Quantity', description: 'Require minimum items from same promotion' },
  { value: 'minimum_order_value', label: 'Minimum Order Value', description: 'Require minimum total order amount' },
  { value: 'buy_x_get_y', label: 'Buy X Get Y', description: 'BOGO-style promotions (Coming Soon)' },
  { value: 'category_mix', label: 'Category Mix', description: 'Require items from specific categories (Coming Soon)' }
];

const PRICING_TYPES = [
  { value: 'fixed_total', label: 'Fixed Total Price', description: 'Customer pays a fixed amount for all items' },
  { value: 'extra_discount', label: 'Extra Discount %', description: 'Additional percentage discount applied' },
  { value: 'fixed_per_item', label: 'Fixed Price Per Item', description: 'Each item costs a fixed amount' }
];

export function PromotionRuleBuilder({ value, onChange, disabled = false }: PromotionRuleBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<PromotionRule | null>(value || null);

  useEffect(() => {
    setCurrentRule(value || null);
  }, [value]);

  const handleRuleTypeChange = (ruleType: string) => {
    if (ruleType === 'none') {
      const newRule = null;
      setCurrentRule(newRule);
      onChange(newRule);
      return;
    }

    const newRule: PromotionRule = {
      type: ruleType as any,
      ...getDefaultRuleValues(ruleType)
    };
    
    setCurrentRule(newRule);
    onChange(newRule);
  };

  const getDefaultRuleValues = (ruleType: string) => {
    switch (ruleType) {
      case 'minimum_quantity_same_promotion':
        return {
          minimumQuantity: 2,
          specialPricing: {
            type: 'fixed_total',
            value: 99
          }
        };
      case 'minimum_order_value':
        return {
          minimumValue: 100
        };
      default:
        return {};
    }
  };

  const updateRule = (updates: Partial<PromotionRule>) => {
    if (!currentRule) return;
    
    const newRule = { ...currentRule, ...updates };
    setCurrentRule(newRule);
    onChange(newRule);
  };

  const updateSpecialPricing = (updates: any) => {
    if (!currentRule) return;
    
    const newRule = {
      ...currentRule,
      specialPricing: { ...currentRule.specialPricing, ...updates }
    };
    setCurrentRule(newRule);
    onChange(newRule);
  };

  const resetToDefaults = () => {
    if (!currentRule) return;
    
    const defaultRule = {
      type: currentRule.type,
      ...getDefaultRuleValues(currentRule.type)
    };
    setCurrentRule(defaultRule);
    onChange(defaultRule);
  };

  const generatePreviewText = () => {
    if (!currentRule) return 'Standard promotion without special rules';
    
    switch (currentRule.type) {
      case 'minimum_quantity_same_promotion':
        const qty = currentRule.minimumQuantity || 2;
        const pricing = currentRule.specialPricing;
        
        if (pricing?.type === 'fixed_total') {
          return `Customer must add at least ${qty} items from this promotion to pay total of R${pricing.value}`;
        } else if (pricing?.type === 'extra_discount') {
          return `Customer must add at least ${qty} items from this promotion to get ${pricing.value}% extra discount`;
        } else if (pricing?.type === 'fixed_per_item') {
          return `Customer must add at least ${qty} items from this promotion to pay R${pricing.value} per item`;
        }
        return `Customer must add at least ${qty} items from this promotion`;
      
      case 'minimum_order_value':
        return `Customer must spend at least R${currentRule.minimumValue || 100} to qualify for this promotion`;
      
      default:
        return 'Custom promotion rule configured';
    }
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Special Rules
                  {currentRule && currentRule.type !== 'none' && (
                    <Badge variant="secondary">
                      {RULE_TYPES.find(t => t.value === currentRule.type)?.label}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Add flexible rules to control how customers can use this promotion
                </CardDescription>
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            
            {/* Rule Type Selection */}
            <div className="space-y-3">
              <Label htmlFor="rule-type" className="text-sm font-medium">
                Rule Type
              </Label>
              <Select 
                value={currentRule?.type || 'none'} 
                onValueChange={handleRuleTypeChange}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rule type" />
                </SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rule Configuration */}
            {currentRule && currentRule.type !== 'none' && (
              <>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium">Rule Configuration</h3>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={resetToDefaults}
                      disabled={disabled}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  </div>

                  {/* Minimum Quantity Rule */}
                  {currentRule.type === 'minimum_quantity_same_promotion' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="min-quantity">Minimum Items Required</Label>
                          <Input
                            id="min-quantity"
                            type="number"
                            min="1"
                            value={currentRule.minimumQuantity || 2}
                            onChange={(e) => updateRule({ minimumQuantity: parseInt(e.target.value) || 2 })}
                            disabled={disabled}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Apply To</Label>
                          <div className="flex items-center space-x-2 mt-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                              <span className="text-sm">Same Promotion Items</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Special Pricing Section */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-3">Special Pricing (When Rule Met)</h4>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Pricing Type</Label>
                            <RadioGroup
                              value={currentRule.specialPricing?.type || 'fixed_total'}
                              onValueChange={(value) => updateSpecialPricing({ type: value })}
                              disabled={disabled}
                            >
                              {PRICING_TYPES.map(type => (
                                <div key={type.value} className="flex items-center space-x-2">
                                  <RadioGroupItem value={type.value} id={type.value} />
                                  <Label htmlFor={type.value} className="flex-1 cursor-pointer">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{type.label}</span>
                                      <span className="text-xs text-muted-foreground">{type.description}</span>
                                    </div>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="pricing-value">
                                {currentRule.specialPricing?.type === 'fixed_total' && 'Total Price (R)'}
                                {currentRule.specialPricing?.type === 'extra_discount' && 'Discount (%)'}
                                {currentRule.specialPricing?.type === 'fixed_per_item' && 'Price Per Item (R)'}
                              </Label>
                              <Input
                                id="pricing-value"
                                type="number"
                                min="0"
                                step={currentRule.specialPricing?.type === 'extra_discount' ? '1' : '0.01'}
                                value={currentRule.specialPricing?.value || 99}
                                onChange={(e) => updateSpecialPricing({ value: parseFloat(e.target.value) || 99 })}
                                disabled={disabled}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Minimum Order Value Rule */}
                  {currentRule.type === 'minimum_order_value' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="min-value">Minimum Order Value (R)</Label>
                          <Input
                            id="min-value"
                            type="number"
                            min="0"
                            step="0.01"
                            value={currentRule.minimumValue || 100}
                            onChange={(e) => updateRule({ minimumValue: parseFloat(e.target.value) || 100 })}
                            disabled={disabled}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rule Preview */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Rule Preview</h4>
                      <p className="text-sm text-blue-800">{generatePreviewText()}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* No Rules Selected */}
            {(!currentRule || currentRule.type === 'none') && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No special rules configured</p>
                <p className="text-xs mt-1">This promotion will work like a standard discount</p>
              </div>
            )}

          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default PromotionRuleBuilder;