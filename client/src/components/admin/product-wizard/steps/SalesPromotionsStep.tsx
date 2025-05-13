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
              control={form.control}
              name="onSale"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setField('onSale', checked);
                      }}
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

          {form.watch('onSale') && (
            <FormField
              control={form.control}
              name="salePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sale Price (R)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        field.onChange(value);
                        setField('salePrice', value);
                      }}
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
            control={form.control}
            name="discountLabel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Label</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g., 20% OFF"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setField('discountLabel', e.target.value);
                    }}
                  />
                </FormControl>
                <FormDescription>Display this label on the product (optional)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specialSaleText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special Sale Text</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g., Summer Sale"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setField('specialSaleText', e.target.value);
                    }}
                  />
                </FormControl>
                <FormDescription>Promotional text to display on the product</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch('specialSaleText') && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="specialSaleStart"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Special Sale Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), 'PPP')
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
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            const dateValue = date || null;
                            field.onChange(dateValue);
                            handleDateChange('specialSaleStart', dateValue);
                          }}
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
                control={form.control}
                name="specialSaleEnd"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Special Sale End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), 'PPP')
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
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            const dateValue = date || null;
                            field.onChange(dateValue);
                            handleDateChange('specialSaleEnd', dateValue);
                          }}
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
            control={form.control}
            name="isFlashDeal"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      setField('isFlashDeal', checked);
                    }}
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

          {form.watch('isFlashDeal') && (
            <FormField
              control={form.control}
              name="flashDealEnd"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Flash Deal End Date & Time</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), 'PPP')
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
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => {
                          const dateValue = date || null;
                          field.onChange(dateValue);
                          handleDateChange('flashDealEnd', dateValue);
                        }}
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