import React, { useState } from 'react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Form
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductDraft } from '../ProductWizard';

interface SalesPromotionsStepProps {
  draft: ProductDraft;
  onSave: (data: Partial<ProductDraft>, advanceToNext?: boolean) => void;
  isLoading?: boolean;
}

// Validation schema for sales and promotions
const formSchema = z.object({
  onSale: z.boolean().default(false),
  regularPrice: z.coerce.number().min(0, "Regular price must be a positive number"),
  salePrice: z.coerce.number().min(0, "Sale price must be a positive number").nullable().optional(),
  discountLabel: z.string().nullable().optional(),
  specialSaleText: z.string().nullable().optional(),
  // Use Date objects in the form for better UX, but store as strings in the database
  specialSaleStart: z.date().nullable().optional(),
  specialSaleEnd: z.date().nullable().optional(),
  // Rating and review count for marketplace appearance
  rating: z.coerce.number().min(0).max(5).nullable().optional(),
  review_count: z.coerce.number().min(0).nullable().optional(),
  isFlashDeal: z.boolean().default(false),
  flashDealEnd: z.date().nullable().optional()
}).refine(data => {
  // If onSale is true, salePrice must be provided and less than regularPrice
  if (data.onSale) {
    return !!data.salePrice && data.salePrice < data.regularPrice;
  }
  return true;
}, {
  message: "Sale price must be provided and less than regular price",
  path: ["salePrice"]
}).refine(data => {
  // If special sale text is provided, dates must be provided
  if (data.specialSaleText) {
    return !!data.specialSaleStart && !!data.specialSaleEnd;
  }
  return true;
}, {
  message: "Special sale start and end dates are required when special sale text is provided",
  path: ["specialSaleStart"]
}).refine(data => {
  // If special sale dates are provided, end must be after start
  if (data.specialSaleStart && data.specialSaleEnd) {
    return data.specialSaleEnd > data.specialSaleStart;
  }
  return true;
}, {
  message: "Special sale end date must be after start date",
  path: ["specialSaleEnd"]
}).refine(data => {
  // If flash deal is enabled, end date must be provided
  if (data.isFlashDeal) {
    return !!data.flashDealEnd;
  }
  return true;
}, {
  message: "Flash deal end date is required when flash deal is enabled",
  path: ["flashDealEnd"]
});

export const SalesPromotionsStep: React.FC<SalesPromotionsStepProps> = ({ 
  draft, 
  onSave,
  isLoading = false
}) => {
  const [saving, setSaving] = useState(false);
  
  // Initialize form with draft data
  // Convert string dates to Date objects for the date pickers
  const parseStringToDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    
    try {
      // Parse SAST formatted date string (YYYY-MM-DD HH:MM:SS) to Date object
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
      if (match) {
        const [_, year, month, day, hours, minutes, seconds] = match;
        return new Date(
          parseInt(year), 
          parseInt(month) - 1, // Month is 0-indexed in JS Date
          parseInt(day),
          parseInt(hours),
          parseInt(minutes),
          parseInt(seconds)
        );
      }
      
      // Fallback: try to parse as ISO string
      return new Date(dateStr);
    } catch (e) {
      console.error("Error parsing date string:", dateStr, e);
      return null;
    }
  };
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      onSale: draft.onSale || false,
      regularPrice: draft.regularPrice || 0,
      salePrice: draft.salePrice || null,
      discountLabel: draft.discountLabel || null,
      specialSaleText: draft.specialSaleText || null,
      specialSaleStart: draft.specialSaleStart ? parseStringToDate(draft.specialSaleStart) : null,
      specialSaleEnd: draft.specialSaleEnd ? parseStringToDate(draft.specialSaleEnd) : null,
      isFlashDeal: draft.isFlashDeal || false,
      flashDealEnd: draft.flashDealEnd ? parseStringToDate(draft.flashDealEnd) : null,
      // Rating and review count for marketplace appearance
      rating: draft.rating || null,
      review_count: draft.review_count || null
    }
  });

  // Calculate the discount percentage
  const calculateDiscountPercentage = () => {
    const regularPrice = form.watch('regularPrice');
    const salePrice = form.watch('salePrice');
    
    if (regularPrice && salePrice && regularPrice > 0) {
      const discountPercentage = ((regularPrice - salePrice) / regularPrice) * 100;
      return Math.round(discountPercentage);
    }
    
    return 0;
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('🎯 FORM SUBMISSION TRIGGERED - SalesPromotionsStep');
    console.log('🎯 Form values received:', values);
    setSaving(true);
    try {
      // Format dates as strings in SAST timezone for South Africa (UTC+2)
      // This ensures dates are saved as text strings to preserve the correct timezone
      const formatDateToSASTString = (date: Date | null): string | null => {
        if (!date) return null;
        
        // Create a formatter that outputs dates in SA timezone
        // Format: YYYY-MM-DD HH:MM:SS (local SAST time)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };
      
      // Type assertion to avoid TypeScript errors with ProductDraft interface
      // We're safely converting Date objects to strings and ensuring numeric fields are numbers
      const formattedValues = {
        ...values,
        // Convert string prices to numbers (same as BasicInfoStep)
        regularPrice: typeof values.regularPrice === 'string' ? parseFloat(values.regularPrice) : values.regularPrice,
        salePrice: values.salePrice && typeof values.salePrice === 'string' ? parseFloat(values.salePrice) : values.salePrice,
        // When onSale is false, explicitly set salePrice and discountLabel to null when saving
        ...(values.onSale === false && { 
          salePrice: null,
          discountLabel: null
        }),
        // Ensure all fields are explicitly included, including the ones in red boxes in the UI
        discountLabel: values.onSale ? values.discountLabel : null,
        specialSaleText: values.specialSaleText || null,
        // Convert date objects to text strings in SAST format
        specialSaleStart: formatDateToSASTString(values.specialSaleStart),
        specialSaleEnd: formatDateToSASTString(values.specialSaleEnd),
        isFlashDeal: values.isFlashDeal || false,
        flashDealEnd: formatDateToSASTString(values.flashDealEnd),
        // Include rating and review count for marketplace appearance
        rating: values.rating || null,
        review_count: values.review_count || null
      } as Partial<ProductDraft>;
      
      // Add debugging logs to see what's being sent
      console.log('Raw form values before formatting:', values);
      console.log('Rating value:', values.rating);
      console.log('Review count value:', values.review_count);
      console.log('Submitting sales promotions data:', formattedValues);
      console.log('Step ID: sales-promotions (5)');
      
      await onSave(formattedValues, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales & Promotions</CardTitle>
          <CardDescription>
            Configure sales pricing and promotional features for this product
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* On Sale Toggle */}
              <FormField
                control={form.control}
                name="onSale"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">On Sale</FormLabel>
                      <FormDescription>
                        Mark this product as being on sale with a discounted price
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          // When toggling off, keep the sale price value in the form state
                          // but it won't be sent to the server since the field will be hidden
                          field.onChange(checked);
                          
                          // If turning off sale mode, ensure salePrice validation doesn't trigger
                          if (!checked) {
                            form.clearErrors('salePrice');
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                {/* Regular Price */}
                <FormField
                  control={form.control}
                  name="regularPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regular Price</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.valueAsNumber || 0);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Sale Price (conditionally shown) */}
                {/* When onSale is toggled off, we keep the field value in state but hide the field */}
                {form.watch('onSale') ? (
                  <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sale Price</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0.00" 
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              field.onChange(e.target.valueAsNumber || null);
                            }}
                          />
                        </FormControl>
                        {form.watch('onSale') && 
                          form.watch('salePrice') && 
                          form.watch('regularPrice') > 0 && (
                          <FormDescription>
                            {calculateDiscountPercentage()}% discount from regular price
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  // Show a placeholder when onSale is false
                  <div className="flex flex-col space-y-2 opacity-50">
                    <span className="text-sm font-medium">Sale Price</span>
                    <div className="h-10 rounded-md border border-input bg-muted flex items-center px-3 text-sm text-muted-foreground">
                      Toggle "On Sale" to set a sale price
                    </div>
                  </div>
                )}
              </div>

              {/* Discount Label */}
              {form.watch('onSale') ? (
                <FormField
                  control={form.control}
                  name="discountLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Label</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Example: 'Summer Sale' or '20% Off'" 
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormDescription>
                        This label will be displayed with the product
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="opacity-50">
                  <span className="text-sm font-medium">Discount Label</span>
                  <div className="h-10 rounded-md border border-input bg-muted mt-2"></div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enable "On Sale" to add a discount label
                  </p>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium">Special Sale Period</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Set a limited time period for special promotions
                </p>

                {/* Special Sale Text */}
                <FormField
                  control={form.control}
                  name="specialSaleText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Sale Text</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Example: 'Black Friday Special Offer'" 
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormDescription>
                        Will be displayed as a special promotional message
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Special Sale Date Range */}
                {form.watch('specialSaleText') && (
                  <div className="grid gap-4 md:grid-cols-2 mt-4">
                    <FormField
                      control={form.control}
                      name="specialSaleStart"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
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
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date(new Date().setHours(0, 0, 0, 0))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="specialSaleEnd"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
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
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < (form.watch('specialSaleStart') || new Date())
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium">Flash Deal</h3>
                
                {/* Flash Deal Toggle */}
                <FormField
                  control={form.control}
                  name="isFlashDeal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Flash Deal</FormLabel>
                        <FormDescription>
                          Mark as a limited-time flash deal with countdown timer
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* Flash Deal End Date */}
                {form.watch('isFlashDeal') && (
                  <FormField
                    control={form.control}
                    name="flashDealEnd"
                    render={({ field }) => (
                      <FormItem className="flex flex-col mt-4">
                        <FormLabel>Deal Ends On</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP 'at' p")
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
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          The flash deal will automatically end at this date and time
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Rating & Reviews Section for Marketplace Appearance */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Product Rating & Reviews</CardTitle>
                  <CardDescription>
                    Set initial rating and review count to make your product appear established in the marketplace
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Star Rating */}
                    <FormField
                      control={form.control}
                      name="rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Star Rating</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => {
                                      const newRating = star === field.value ? 0 : star;
                                      field.onChange(newRating || null);
                                    }}
                                    className={`p-1 transition-colors rounded ${
                                      star <= (field.value || 0) 
                                        ? 'text-yellow-500 hover:text-yellow-600' 
                                        : 'text-gray-300 hover:text-yellow-400'
                                    }`}
                                  >
                                    <Star 
                                      className="h-6 w-6" 
                                      fill={star <= (field.value || 0) ? 'currentColor' : 'none'}
                                    />
                                  </button>
                                ))}
                                <span className="ml-2 text-sm text-muted-foreground">
                                  {field.value > 0 ? `${field.value} star${field.value !== 1 ? 's' : ''}` : 'No rating'}
                                </span>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Set the initial star rating to make your product appear established
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Review Count */}
                    <FormField
                      control={form.control}
                      name="review_count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Reviews</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value ? parseInt(value) : null);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Set the initial review count to build customer confidence
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Rating Preview */}
                  {(form.watch('rating') > 0 || form.watch('review_count') > 0) && (
                    <div className="p-4 bg-muted/30 rounded-md">
                      <h4 className="text-sm font-medium mb-2">Preview:</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (form.watch('rating') || 0)
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {form.watch('rating') || 0}/5
                        </span>
                        {form.watch('review_count') > 0 && (
                          <span className="text-sm text-muted-foreground">
                            ({form.watch('review_count')} reviews)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    console.log('🚨 SAVE BUTTON CLICKED - Direct form.getValues()');
                    const values = form.getValues();
                    console.log('🚨 Raw form values from getValues():', values);
                    console.log('🚨 Rating in raw values:', values.rating);
                    console.log('🚨 Review count in raw values:', values.review_count);
                    
                    // Define the same formatting function used in onSubmit
                    const formatDateToSASTString = (date: Date | null): string | null => {
                      if (!date) return null;
                      
                      // Format to SAST timezone (UTC+2) as text string
                      const sastOffset = 2 * 60; // 2 hours in minutes
                      const sastDate = new Date(date.getTime() + (sastOffset * 60 * 1000));
                      
                      const year = sastDate.getUTCFullYear();
                      const month = String(sastDate.getUTCMonth() + 1).padStart(2, '0');
                      const day = String(sastDate.getUTCDate()).padStart(2, '0');
                      const hours = String(sastDate.getUTCHours()).padStart(2, '0');
                      const minutes = String(sastDate.getUTCMinutes()).padStart(2, '0');
                      const seconds = String(sastDate.getUTCSeconds()).padStart(2, '0');
                      
                      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                    };
                    
                    // Apply the same formatting as onSubmit function
                    const formattedValues = {
                      ...values,
                      // Convert string prices to numbers (same as BasicInfoStep)
                      regularPrice: typeof values.regularPrice === 'string' ? parseFloat(values.regularPrice) : values.regularPrice,
                      salePrice: values.salePrice && typeof values.salePrice === 'string' ? parseFloat(values.salePrice) : values.salePrice,
                      // When onSale is false, explicitly set salePrice and discountLabel to null when saving
                      ...(values.onSale === false && { 
                        salePrice: null,
                        discountLabel: null
                      }),
                      // Ensure all fields are explicitly included, including the ones in red boxes in the UI
                      discountLabel: values.onSale ? values.discountLabel : null,
                      specialSaleText: values.specialSaleText || null,
                      // Convert date objects to text strings in SAST format
                      specialSaleStart: formatDateToSASTString(values.specialSaleStart),
                      specialSaleEnd: formatDateToSASTString(values.specialSaleEnd),
                      isFlashDeal: values.isFlashDeal || false,
                      flashDealEnd: formatDateToSASTString(values.flashDealEnd),
                      // Include rating and review count for marketplace appearance
                      rating: values.rating || null,
                      review_count: values.review_count || null
                    } as Partial<ProductDraft>;
                    
                    console.log('🚨 Formatted values for Save button:', formattedValues);
                    onSave(formattedValues, false);
                  }}
                  disabled={saving || isLoading}
                >
                  Save
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving || isLoading}
                >
                  Save & Continue
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesPromotionsStep;