/**
 * Pricing Step Component
 * 
 * This component manages pricing information for the product,
 * including regular price, sale price, and markup calculations.
 */

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useDraft } from '../DraftContext';
import { Loader2, Calculator, TrendingUp } from 'lucide-react';
import { cn, debounce } from '@/lib/utils';

// Form schema for pricing information
const pricingSchema = z.object({
  costPrice: z.coerce.number().min(0, 'Cost price must be a positive number').optional(),
  regularPrice: z.coerce.number().min(0.01, 'Regular price is required'),
  salePrice: z.coerce.number().min(0, 'Sale price must be a positive number').optional(),
  onSale: z.boolean().default(false),
  markupPercentage: z.coerce.number().min(0, 'Markup must be a positive number').optional(),
});

type PricingFormValues = z.infer<typeof pricingSchema>;

const PricingStep: React.FC = () => {
  const { draft, draftLoading, updateDraft, updateDraftStep } = useDraft();
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  
  // Create form with draft data as default values
  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      costPrice: draft?.costPrice || 0,
      regularPrice: draft?.regularPrice || 0,
      salePrice: draft?.salePrice || 0,
      onSale: draft?.onSale || false,
      markupPercentage: draft?.markupPercentage || 30,
    },
  });
  
  // Watch form values for calculations
  const costPrice = form.watch('costPrice') || 0;
  const markupPercentage = form.watch('markupPercentage') || 30;
  const onSale = form.watch('onSale');
  
  // Calculate regular price based on cost and markup
  useEffect(() => {
    if (costPrice && markupPercentage) {
      const calculatedRegularPrice = costPrice * (1 + markupPercentage / 100);
      setCalculatedPrice(Number(calculatedRegularPrice.toFixed(2)));
    } else {
      setCalculatedPrice(null);
    }
  }, [costPrice, markupPercentage]);
  
  // Update form when draft data changes
  useEffect(() => {
    if (draft && !draftLoading) {
      form.reset({
        costPrice: draft.costPrice || 0,
        regularPrice: draft.regularPrice || 0,
        salePrice: draft.salePrice || 0,
        onSale: draft.onSale || false,
        markupPercentage: draft.markupPercentage || 30,
      });
    }
  }, [draft, draftLoading, form]);
  
  // Apply calculated price to regular price
  const applyCalculatedPrice = () => {
    if (calculatedPrice) {
      form.setValue('regularPrice', calculatedPrice);
      updateDraft('regularPrice', calculatedPrice);
    }
  };
  
  // Handle field changes with debounce for auto-save
  const handleFieldChange = debounce((field: string, value: any) => {
    updateDraft(field as any, value);
  }, 500);
  
  // Submit handler to update the step
  const onSubmit = async (data: PricingFormValues) => {
    await updateDraftStep('pricing', data);
  };
  
  if (draftLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  
  // Calculate discount percentage if on sale
  const calculateDiscountPercentage = () => {
    const regularPrice = form.getValues('regularPrice');
    const salePrice = form.getValues('salePrice');
    
    if (!regularPrice || !salePrice || regularPrice <= 0 || salePrice >= regularPrice) {
      return 0;
    }
    
    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
  };
  
  const discountPercentage = calculateDiscountPercentage();
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Cost & Markup Calculator */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-lg font-medium flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Price Calculator
            </h3>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Cost Price */}
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input 
                          type="number"
                          min="0"
                          step="0.01"
                          className="pl-7"
                          placeholder="0.00" 
                          {...field} 
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(e);
                            handleFieldChange('costPrice', isNaN(value) ? 0 : value);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Your cost to acquire this product.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Markup Percentage */}
              <FormField
                control={form.control}
                name="markupPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Markup Percentage ({field.value}%)</FormLabel>
                    <FormControl>
                      <div className="pt-2">
                        <Slider
                          min={0}
                          max={200}
                          step={1}
                          defaultValue={[field.value || 30]}
                          onValueChange={(values) => {
                            const value = values[0];
                            field.onChange(value);
                            handleFieldChange('markupPercentage', value);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Percentage markup over cost price.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Calculated Price Preview */}
            {calculatedPrice !== null && costPrice > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-md flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Calculated Retail Price:</p>
                  <p className="text-lg font-bold">${calculatedPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    Based on ${costPrice.toFixed(2)} + {markupPercentage}% markup
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={applyCalculatedPrice}
                  className="text-sm text-primary hover:underline"
                >
                  Apply This Price
                </button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Pricing Fields */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Regular Price */}
          <FormField
            control={form.control}
            name="regularPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Regular Price</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                    <Input 
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="pl-7"
                      placeholder="0.00" 
                      {...field} 
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        field.onChange(e);
                        handleFieldChange('regularPrice', isNaN(value) ? 0 : value);
                      }}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Standard retail price of the product.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* On Sale Switch */}
          <FormField
            control={form.control}
            name="onSale"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">On Sale</FormLabel>
                  <FormDescription>
                    Enable special sale pricing for this product.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      handleFieldChange('onSale', checked);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          {/* Sale Price - Only shown if onSale is true */}
          {onSale && (
            <FormField
              control={form.control}
              name="salePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sale Price</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                      <Input 
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-7"
                        placeholder="0.00" 
                        {...field} 
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(e);
                          handleFieldChange('salePrice', isNaN(value) ? 0 : value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription className="flex justify-between">
                    <span>Discounted price for the product.</span>
                    {discountPercentage > 0 && (
                      <span className="text-green-600 font-medium flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {discountPercentage}% Discount
                      </span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        
        {/* Price Comparison */}
        {onSale && form.getValues('salePrice') > 0 && (
          <Card className={cn(
            "border",
            discountPercentage > 0 ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
          )}>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-2">Price Comparison</h3>
              <div className="flex space-x-8">
                <div>
                  <p className="text-sm text-muted-foreground">Regular Price:</p>
                  <p className={cn(
                    "text-lg font-bold",
                    onSale && discountPercentage > 0 && "line-through text-muted-foreground"
                  )}>
                    ${parseFloat(form.getValues('regularPrice').toString()).toFixed(2)}
                  </p>
                </div>
                
                {onSale && discountPercentage > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sale Price:</p>
                    <p className="text-lg font-bold text-green-600">
                      ${parseFloat(form.getValues('salePrice').toString()).toFixed(2)}
                    </p>
                  </div>
                )}
                
                {onSale && discountPercentage > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Savings:</p>
                    <p className="text-lg font-bold text-green-600">
                      {discountPercentage}% OFF
                    </p>
                  </div>
                )}
              </div>
              
              {onSale && discountPercentage <= 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  Note: Sale price should be lower than the regular price.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </form>
    </Form>
  );
};

export default PricingStep;