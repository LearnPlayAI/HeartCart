import React from 'react';
import { useProductWizardContext } from '../context';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
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

export function SalesPromotionsStep() {
  const { state, setField } = useProductWizardContext();

  const handleDateChange = (field: 'specialSaleStart' | 'specialSaleEnd' | 'flashDealEnd', date: Date | undefined) => {
    if (date) {
      setField(field, date.toISOString());
    } else {
      setField(field, null);
    }
  };

  return (
    <div className="space-y-6">
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
              name="regularPrice"
              render={() => (
                <FormItem>
                  <FormLabel>Regular Price (R)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={state.regularPrice}
                      onChange={(e) => setField('regularPrice', parseFloat(e.target.value))}
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
                      checked={state.onSale}
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

          {state.onSale && (
            <FormField
              name="salePrice"
              render={() => (
                <FormItem>
                  <FormLabel>Sale Price (R)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={state.salePrice || ''}
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
                    value={state.discountLabel || ''}
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
                    value={state.specialSaleText || ''}
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
                              !state.specialSaleStart && "text-muted-foreground"
                            )}
                          >
                            {state.specialSaleStart ? (
                              format(new Date(state.specialSaleStart), 'PPP')
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
                              !state.specialSaleEnd && "text-muted-foreground"
                            )}
                          >
                            {state.specialSaleEnd ? (
                              format(new Date(state.specialSaleEnd), 'PPP')
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
                    checked={state.isFlashDeal}
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

          {state.isFlashDeal && (
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
                            !state.flashDealEnd && "text-muted-foreground"
                          )}
                        >
                          {state.flashDealEnd ? (
                            format(new Date(state.flashDealEnd), 'PPP')
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
    </div>
  );
}