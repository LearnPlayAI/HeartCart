import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductDraft } from '../ProductWizard';

// Validation schema for the additional info step
const additionalInfoSchema = z.object({
  dimensions: z.string().nullable(),
  weight: z.string().nullable(),
  discountLabel: z.string().nullable(),
  specialSaleText: z.string().nullable(),
  specialSaleStart: z.date().nullable(),
  specialSaleEnd: z.date().nullable(),
  isFlashDeal: z.boolean().default(false),
  flashDealEnd: z.date().nullable(),
});

type AdditionalInfoFormValues = z.infer<typeof additionalInfoSchema>;

interface AdditionalInfoStepProps {
  draft: ProductDraft;
  onSave: (data: any) => void;
  isLoading: boolean;
}

export const AdditionalInfoStep: React.FC<AdditionalInfoStepProps> = ({ draft, onSave, isLoading }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('specifications');
  
  // Initialize the form with draft values
  const form = useForm<AdditionalInfoFormValues>({
    resolver: zodResolver(additionalInfoSchema),
    defaultValues: {
      dimensions: draft.dimensions || '',
      weight: draft.weight || '',
      discountLabel: draft.discountLabel || '',
      specialSaleText: draft.specialSaleText || '',
      specialSaleStart: draft.specialSaleStart ? new Date(draft.specialSaleStart) : null,
      specialSaleEnd: draft.specialSaleEnd ? new Date(draft.specialSaleEnd) : null,
      isFlashDeal: draft.isFlashDeal || false,
      flashDealEnd: draft.flashDealEnd ? new Date(draft.flashDealEnd) : null,
    },
  });

  // Handle form submission
  const onSubmit = (data: AdditionalInfoFormValues) => {
    onSave(data);
  };

  // Watch values to enable/disable related fields
  const isFlashDeal = form.watch('isFlashDeal');

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="w-full overflow-x-auto sm:overflow-visible">
                <TabsTrigger value="specifications" className="flex-shrink-0 text-xs sm:text-sm">Specifications</TabsTrigger>
                <TabsTrigger value="discounts" className="flex-shrink-0 text-xs sm:text-sm">Discounts & Offers</TabsTrigger>
              </TabsList>
              
              {/* Specifications Tab */}
              <TabsContent value="specifications" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dimensions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dimensions</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 10 x 5 x 2 cm" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>
                          Product dimensions in length x width x height format
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 0.5 kg" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>
                          Product weight with unit (e.g., kg, g)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              
              {/* Discounts & Special Offers Tab */}
              <TabsContent value="discounts" className="space-y-4">
                <FormField
                  control={form.control}
                  name="discountLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Label</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. 20% OFF" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormDescription>
                        Label to display for the discount (e.g., "20% OFF", "Clearance")
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator className="my-4" />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Special Sale Period</h3>
                  
                  <FormField
                    control={form.control}
                    name="specialSaleText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Sale Text</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Spring Sale" 
                            {...field} 
                            value={field.value || ''} 
                          />
                        </FormControl>
                        <FormDescription>
                          Text to display for the special sale
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    "pl-3 text-left font-normal",
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
                                disabled={(date) => date < new Date()}
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
                          <FormLabel>Sale End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
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
                                  date < new Date() || 
                                  (form.getValues('specialSaleStart') ? date < form.getValues('specialSaleStart') : false)
                                }
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
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="isFlashDeal"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm sm:text-base">Flash Deal</FormLabel>
                          <FormDescription className="text-xs sm:text-sm">
                            Mark as a flash deal with limited time
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
                  
                  {isFlashDeal && (
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
                                    "pl-3 text-left font-normal",
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
                                disabled={(date) => date < new Date()}
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
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end mt-4 sm:mt-6">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-9 w-full sm:w-auto sm:h-10 text-sm sm:text-base"
              >
                {isLoading && (
                  <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                )}
                Save & Continue
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AdditionalInfoStep;