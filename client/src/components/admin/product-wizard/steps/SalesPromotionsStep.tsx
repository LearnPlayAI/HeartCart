import React from 'react';
import { useProductWizardContext } from '../context';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Define validation schema
const salesPromotionsSchema = z.object({
  regularPrice: z.coerce.number().min(0, "Price must be 0 or greater"),
  onSale: z.boolean().default(false),
  salePrice: z.coerce.number().min(0, "Sale price must be 0 or greater").nullable().optional(),
  discountLabel: z.string().optional(),
  specialSaleText: z.string().optional(),
  specialSaleStart: z.date().nullable().optional(),
  specialSaleEnd: z.date().nullable().optional(),
  isFlashDeal: z.boolean().default(false),
  flashDealEnd: z.date().nullable().optional(),
});

type SalesPromotionsFormValues = z.infer<typeof salesPromotionsSchema>;

export function SalesPromotionsStep() {
  const { state, setField } = useProductWizardContext();

  const handleDateChange = (field: 'specialSaleStart' | 'specialSaleEnd' | 'flashDealEnd', date: Date | undefined) => {
    if (date) {
      setField(field, date.toISOString());
    } else {
      setField(field, null);
    }
  };
  
  // Ensure default values to prevent null errors
  const {
    regularPrice = 0,
    onSale = false,
    salePrice = null,
    discountLabel = '',
    specialSaleText = '',
    specialSaleStart = null,
    specialSaleEnd = null,
    isFlashDeal = false,
    flashDealEnd = null,
  } = state || {};
  
  // Initialize form
  const form = useForm<SalesPromotionsFormValues>({
    resolver: zodResolver(salesPromotionsSchema),
    defaultValues: {
      regularPrice,
      onSale,
      salePrice,
      discountLabel,
      specialSaleText,
      specialSaleStart: specialSaleStart ? new Date(specialSaleStart) : null,
      specialSaleEnd: specialSaleEnd ? new Date(specialSaleEnd) : null,
      isFlashDeal,
      flashDealEnd: flashDealEnd ? new Date(flashDealEnd) : null,
    }
  });

  // Handle form submission
  const onSubmit = (values: SalesPromotionsFormValues) => {
    // Update all fields in context
    Object.entries(values).forEach(([key, value]) => {
      // Convert dates to ISO strings for storage
      if (value instanceof Date) {
        setField(key as any, value.toISOString());
      } else {
        setField(key as any, value);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h3 className="text-lg font-medium">Sales & Promotions</h3>
        <p className="text-sm text-muted-foreground">
          Configure special sales, discounts, and promotional deals for this product.
        </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regular Pricing</CardTitle>
          <CardDescription>Basic pricing information for the product</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="regularPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Regular Price (R)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => {
                        field.onChange(parseFloat(e.target.value));
                        setField('regularPrice', parseFloat(e.target.value));
                      }}
                      min={0}
                      step={0.01}
                    />
                  </FormControl>
                  <FormDescription>The standard retail price of the product</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="onSale"
              render={() => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={onSale}
                      onCheckedChange={(checked) => setField('onSale', checked)}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>On Sale</FormLabel>
                    <FormDescription>
                      Display the product on sale with a discount
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {onSale && (
            <FormField
              name="salePrice"
              render={() => (
                <FormItem>
                  <FormLabel>Sale Price (R)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={salePrice || ''}
                      onChange={(e) => setField('salePrice', parseFloat(e.target.value))}
                      min={0}
                      step={0.01}
                    />
                  </FormControl>
                  <FormDescription>The discounted price of the product</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Special Sale</CardTitle>
          <CardDescription>Configure a time-limited special sale for this product</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            name="discountLabel"
            render={() => (
              <FormItem>
                <FormLabel>Discount Label</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g., 20% OFF"
                    value={discountLabel || ''}
                    onChange={(e) => setField('discountLabel', e.target.value)}
                  />
                </FormControl>
                <FormDescription>Display this label on the product (optional)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="specialSaleText"
            render={() => (
              <FormItem>
                <FormLabel>Special Sale Text</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g., Summer Sale"
                    value={specialSaleText || ''}
                    onChange={(e) => setField('specialSaleText', e.target.value)}
                  />
                </FormControl>
                <FormDescription>Promotional text to display on the product</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {state.specialSaleText && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                name="specialSaleStart"
                render={() => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Special Sale Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !specialSaleStart && "text-muted-foreground"
                            )}
                          >
                            {specialSaleStart ? (
                              format(new Date(specialSaleStart), 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={state.specialSaleStart ? new Date(state.specialSaleStart) : undefined}
                          onSelect={(date) => handleDateChange('specialSaleStart', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      When the special sale starts
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="specialSaleEnd"
                render={() => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Special Sale End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !specialSaleEnd && "text-muted-foreground"
                            )}
                          >
                            {specialSaleEnd ? (
                              format(new Date(specialSaleEnd), 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={state.specialSaleEnd ? new Date(state.specialSaleEnd) : undefined}
                          onSelect={(date) => handleDateChange('specialSaleEnd', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      When the special sale ends
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flash Deal</CardTitle>
          <CardDescription>Set up a time-limited flash deal with a countdown timer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            name="isFlashDeal"
            render={() => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={isFlashDeal}
                    onCheckedChange={(checked) => setField('isFlashDeal', checked)}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Enable Flash Deal</FormLabel>
                  <FormDescription>
                    Display a countdown timer for this product
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {isFlashDeal && (
            <FormField
              name="flashDealEnd"
              render={() => (
                <FormItem className="flex flex-col">
                  <FormLabel>Flash Deal End Date & Time</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !flashDealEnd && "text-muted-foreground"
                          )}
                        >
                          {flashDealEnd ? (
                            format(new Date(flashDealEnd), 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={state.flashDealEnd ? new Date(state.flashDealEnd) : undefined}
                        onSelect={(date) => handleDateChange('flashDealEnd', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When the flash deal ends
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </CardContent>
      </Card>
      </form>
    </Form>
  );
}