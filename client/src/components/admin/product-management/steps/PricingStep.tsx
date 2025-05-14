/**
 * Pricing Step
 * 
 * This component handles the pricing and inventory information
 * for the product, including regular price, sale price, cost, etc.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useDraftContext } from '../DraftContext';
import { debounce } from '@/lib/utils';

// Validation schema for pricing information
const formSchema = z.object({
  price: z.coerce.number().min(0, {
    message: "Price must be a positive number.",
  }),
  compareAtPrice: z.coerce.number().min(0, {
    message: "Compare-at price must be a positive number.",
  }).optional().nullable(),
  costPrice: z.coerce.number().min(0, {
    message: "Cost price must be a positive number.",
  }).optional().nullable(),
  onSale: z.boolean().default(false),
  salePrice: z.coerce.number().min(0, {
    message: "Sale price must be a positive number.",
  }).optional().nullable(),
  taxRatePercentage: z.coerce.number().min(0, {
    message: "Tax rate must be a positive percentage.",
  }).max(100, {
    message: "Tax rate cannot exceed 100%.",
  }).optional().nullable(),
  weight: z.coerce.number().min(0, {
    message: "Weight must be a positive number.",
  }).optional().nullable(),
  dimensions: z.string().optional().nullable(),
});

// Component props
interface PricingStepProps {
  onNext: () => void;
}

export function PricingStep({ onNext }: PricingStepProps) {
  const { toast } = useToast();
  const { draft, updateDraft, saveDraft, loading } = useDraftContext();
  const [saving, setSaving] = useState(false);
  const [profit, setProfit] = useState<number | null>(null);
  const [profitMargin, setProfitMargin] = useState<number | null>(null);
  
  // Initialize form with draft values or defaults
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      price: draft?.price || 0,
      compareAtPrice: draft?.compareAtPrice || null,
      costPrice: draft?.costPrice || null,
      onSale: draft?.onSale || false,
      salePrice: draft?.salePrice || null,
      taxRatePercentage: draft?.taxRatePercentage || null,
      weight: draft?.weight || null,
      dimensions: draft?.dimensions || '',
    },
    mode: 'onChange',
  });
  
  // Update form values when draft changes
  useEffect(() => {
    if (draft) {
      form.reset({
        price: draft.price || 0,
        compareAtPrice: draft.compareAtPrice || null,
        costPrice: draft.costPrice || null,
        onSale: draft.onSale || false,
        salePrice: draft.salePrice || null,
        taxRatePercentage: draft.taxRatePercentage || null,
        weight: draft.weight || null,
        dimensions: draft.dimensions || '',
      });
    }
  }, [draft, form]);
  
  // Calculate profit and profit margin
  useEffect(() => {
    const costPrice = form.getValues('costPrice');
    const price = form.getValues('price');
    const onSale = form.getValues('onSale');
    const salePrice = form.getValues('salePrice');
    
    if (costPrice && (price || (onSale && salePrice))) {
      const effectivePrice = onSale && salePrice ? salePrice : price;
      const calculatedProfit = effectivePrice - costPrice;
      setProfit(calculatedProfit);
      
      if (effectivePrice > 0) {
        const calculatedMargin = (calculatedProfit / effectivePrice) * 100;
        setProfitMargin(calculatedMargin);
      } else {
        setProfitMargin(null);
      }
    } else {
      setProfit(null);
      setProfitMargin(null);
    }
  }, [form.watch('price'), form.watch('costPrice'), form.watch('onSale'), form.watch('salePrice')]);
  
  // Debounced save function
  const debouncedSave = debounce(async (data: z.infer<typeof formSchema>) => {
    try {
      setSaving(true);
      await updateDraft({
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        costPrice: data.costPrice,
        onSale: data.onSale,
        salePrice: data.salePrice,
        taxRatePercentage: data.taxRatePercentage,
        weight: data.weight,
        dimensions: data.dimensions,
      });
      await saveDraft();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Error Saving',
        description: 'Could not save pricing information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, 800);
  
  // Handle form submission
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setSaving(true);
      
      // Validate sale price if product is on sale
      if (data.onSale && (!data.salePrice || data.salePrice >= data.price)) {
        toast({
          title: 'Invalid Sale Price',
          description: 'Sale price must be less than the regular price.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }
      
      await updateDraft({
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        costPrice: data.costPrice,
        onSale: data.onSale,
        salePrice: data.salePrice,
        taxRatePercentage: data.taxRatePercentage,
        weight: data.weight,
        dimensions: data.dimensions,
      });
      await saveDraft();
      
      toast({
        title: 'Pricing Saved',
        description: 'Product pricing and inventory information has been saved.',
      });
      
      onNext();
    } catch (error) {
      console.error('Error saving pricing information:', error);
      toast({
        title: 'Error Saving',
        description: 'Could not save pricing information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pricing & Inventory</h2>
        <p className="text-muted-foreground">
          Set product pricing, sale status, and physical properties.
        </p>
      </div>
      
      <Separator className="my-6" />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-6">
                <h3 className="text-lg font-semibold">Pricing</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Regular Price (ZAR)*</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              debouncedSave({
                                ...form.getValues(),
                                price: parseFloat(e.target.value) || 0,
                              });
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          The standard retail price of the product.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="compareAtPrice"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Compare-At Price (ZAR)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00" 
                            value={value === null ? '' : value}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              onChange(val);
                              debouncedSave({
                                ...form.getValues(),
                                compareAtPrice: val,
                              });
                            }}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Original price for comparison (displayed as strikethrough).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="onSale"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">On Sale</FormLabel>
                        <FormDescription>
                          Enable sale pricing for this product.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            debouncedSave({
                              ...form.getValues(),
                              onSale: checked,
                            });
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {form.watch('onSale') && (
                  <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Sale Price (ZAR)*</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00" 
                            value={value === null ? '' : value}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              onChange(val);
                              debouncedSave({
                                ...form.getValues(),
                                salePrice: val,
                              });
                            }}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Discounted price that will be used when product is on sale.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Cost Price (ZAR)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00" 
                          value={value === null ? '' : value}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            onChange(val);
                            debouncedSave({
                              ...form.getValues(),
                              costPrice: val,
                            });
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Your purchase cost (not shown to customers).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {profit !== null && profitMargin !== null && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4">
                      <div className="text-sm font-medium">Profit</div>
                      <div className="mt-1 text-2xl font-bold">
                        R {profit.toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-sm font-medium">Profit Margin</div>
                      <div className="mt-1 text-2xl font-bold">
                        {profitMargin.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                )}
                
                <Separator />
                
                <h3 className="text-lg font-semibold">Tax</h3>
                
                <FormField
                  control={form.control}
                  name="taxRatePercentage"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="15.00" 
                          value={value === null ? '' : value}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            onChange(val);
                            debouncedSave({
                              ...form.getValues(),
                              taxRatePercentage: val,
                            });
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Default is VAT at 15%. Leave empty to use system default.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator />
                
                <h3 className="text-lg font-semibold">Shipping Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00" 
                            value={value === null ? '' : value}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              onChange(val);
                              debouncedSave({
                                ...form.getValues(),
                                weight: val,
                              });
                            }}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Used for shipping calculations.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dimensions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dimensions</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="L x W x H (e.g., 10cm x 5cm x 2cm)" 
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              field.onChange(e);
                              debouncedSave({
                                ...form.getValues(),
                                dimensions: e.target.value,
                              });
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Product dimensions in format: Length x Width x Height.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-4">
            <Button 
              type="submit" 
              disabled={loading || saving || !form.formState.isValid}
            >
              {saving ? 'Saving...' : 'Save & Continue'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}