/**
 * Promotions Step Component
 * 
 * This component manages promotions and special deals for products,
 * including flash deals, special sales, and discount labels.
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import { 
  Card, 
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useDraft } from '../DraftContext';
import { Loader2, Calendar as CalendarIcon, Zap, Tag, AlertTriangle } from 'lucide-react';
import { cn, debounce } from '@/lib/utils';

// Form schema for promotions
const promotionsSchema = z.object({
  discountLabel: z.string().optional(),
  specialSaleText: z.string().optional(),
  specialSaleStart: z.date().nullable().optional(),
  specialSaleEnd: z.date().nullable().optional(),
  isFlashDeal: z.boolean().default(false),
  flashDealEnd: z.date().nullable().optional(),
});

type PromotionsFormValues = z.infer<typeof promotionsSchema>;

const PromotionsStep: React.FC = () => {
  const { draft, draftLoading, updateDraft, updateDraftStep } = useDraft();
  
  // Parse dates from draft
  const parseDraftDate = (dateString?: string | null) => {
    if (!dateString) return null;
    
    try {
      return new Date(dateString);
    } catch (error) {
      console.error('Failed to parse date:', error);
      return null;
    }
  };
  
  // Create form with draft data as default values
  const form = useForm<PromotionsFormValues>({
    resolver: zodResolver(promotionsSchema),
    defaultValues: {
      discountLabel: draft?.discountLabel || '',
      specialSaleText: draft?.specialSaleText || '',
      specialSaleStart: parseDraftDate(draft?.specialSaleStart as string) || null,
      specialSaleEnd: parseDraftDate(draft?.specialSaleEnd as string) || null,
      isFlashDeal: draft?.isFlashDeal || false,
      flashDealEnd: parseDraftDate(draft?.flashDealEnd as string) || null,
    },
  });
  
  // Watch for flash deal toggle
  const isFlashDeal = form.watch('isFlashDeal');
  
  // Update form when draft data changes
  useEffect(() => {
    if (draft && !draftLoading) {
      form.reset({
        discountLabel: draft.discountLabel || '',
        specialSaleText: draft.specialSaleText || '',
        specialSaleStart: parseDraftDate(draft.specialSaleStart as string) || null,
        specialSaleEnd: parseDraftDate(draft.specialSaleEnd as string) || null,
        isFlashDeal: draft.isFlashDeal || false,
        flashDealEnd: parseDraftDate(draft.flashDealEnd as string) || null,
      });
    }
  }, [draft, draftLoading, form]);
  
  // Handle field changes with debounce for auto-save
  const handleFieldChange = debounce((field: string, value: any) => {
    updateDraft(field as any, value);
  }, 500);
  
  // Submit handler to update the step
  const onSubmit = async (data: PromotionsFormValues) => {
    await updateDraftStep('promotions', data);
  };
  
  if (draftLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Discount Label */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              Discount Label
            </CardTitle>
            <CardDescription>
              A short label describing the discount (e.g., "Summer Sale", "Clearance")
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="discountLabel"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="Enter discount label" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange('discountLabel', e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    This label will be displayed on product cards and detail pages.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        {/* Special Sale */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Special Sale</CardTitle>
            <CardDescription>
              Configure a special sale period with custom messaging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="specialSaleText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Sale Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter special sale message" 
                      className="resize-none"
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange('specialSaleText', e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Custom text to display during the sale period.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-4 md:grid-cols-2">
              {/* Special Sale Start Date */}
              <FormField
                control={form.control}
                name="specialSaleStart"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Sale Start Date</FormLabel>
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
                          onSelect={(date) => {
                            field.onChange(date);
                            handleFieldChange('specialSaleStart', date);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      When the special sale begins.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Special Sale End Date */}
              <FormField
                control={form.control}
                name="specialSaleEnd"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Sale End Date</FormLabel>
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
                          onSelect={(date) => {
                            field.onChange(date);
                            handleFieldChange('specialSaleEnd', date);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      When the special sale ends.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter>
            {form.watch('specialSaleStart') && form.watch('specialSaleEnd') && 
             form.watch('specialSaleStart') >= form.watch('specialSaleEnd') && (
              <div className="flex items-start text-amber-600 text-sm">
                <AlertTriangle className="h-4 w-4 mr-2 mt-0.5" />
                <p>End date must be after the start date.</p>
              </div>
            )}
          </CardFooter>
        </Card>
        
        {/* Flash Deal */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                Flash Deal
              </CardTitle>
              <FormField
                control={form.control}
                name="isFlashDeal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          handleFieldChange('isFlashDeal', checked);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <CardDescription>
              Flash deals create urgency with a countdown timer on the product.
            </CardDescription>
          </CardHeader>
          
          {isFlashDeal && (
            <CardContent>
              <FormField
                control={form.control}
                name="flashDealEnd"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Flash Deal End Date</FormLabel>
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
                          onSelect={(date) => {
                            field.onChange(date);
                            handleFieldChange('flashDealEnd', date);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      When the flash deal expires. Must be a future date.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {form.watch('flashDealEnd') && new Date(form.watch('flashDealEnd')) <= new Date() && (
                <div className="mt-2 flex items-start text-amber-600 text-sm">
                  <AlertTriangle className="h-4 w-4 mr-2 mt-0.5" />
                  <p>Flash deal end date must be in the future.</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </form>
    </Form>
  );
};

export default PromotionsStep;