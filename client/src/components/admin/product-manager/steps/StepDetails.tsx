import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { StepComponentProps } from '../types';
import { Tabs, TabsContent, TabsItem, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Schema for details validation
const detailsSchema = z.object({
  stockLevel: z.coerce.number().int().min(0, 'Stock must be 0 or greater'),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  isFlashDeal: z.boolean().default(false),
  flashDealEnd: z.date().optional().nullable(),
  specialSaleText: z.string().optional(),
  specialSaleStart: z.date().optional().nullable(),
  specialSaleEnd: z.date().optional().nullable(),
  discountLabel: z.string().optional(),
  // Add attributes field if needed in the future
});

type DetailsFormValues = z.infer<typeof detailsSchema>;

export const StepDetails: React.FC<StepComponentProps> = ({ 
  draft, 
  onSave, 
  onNext, 
  isLoading 
}) => {
  // Parse dates from string to Date objects
  const parseOptionalDate = (dateStr: string | null | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  };
  
  // Set up the form
  const form = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      stockLevel: draft.stockLevel || 0,
      isActive: draft.isActive !== undefined ? draft.isActive : true,
      isFeatured: draft.isFeatured || false,
      weight: draft.weight || '',
      dimensions: draft.dimensions || '',
      isFlashDeal: draft.isFlashDeal || false,
      flashDealEnd: parseOptionalDate(draft.flashDealEnd),
      specialSaleText: draft.specialSaleText || '',
      specialSaleStart: parseOptionalDate(draft.specialSaleStart),
      specialSaleEnd: parseOptionalDate(draft.specialSaleEnd),
      discountLabel: draft.discountLabel || ''
    },
  });
  
  // Watch flash deal toggle to show/hide date picker
  const isFlashDeal = form.watch('isFlashDeal');
  
  // Handle form submission
  const onSubmit = (data: DetailsFormValues) => {
    // Format the dates back to ISO strings
    const formatOptionalDate = (date: Date | null | undefined): string | null => {
      return date ? date.toISOString() : null;
    };
    
    const formattedData = {
      stockLevel: data.stockLevel,
      isActive: data.isActive,
      isFeatured: data.isFeatured,
      weight: data.weight || '',
      dimensions: data.dimensions || '',
      isFlashDeal: data.isFlashDeal,
      flashDealEnd: formatOptionalDate(data.flashDealEnd),
      specialSaleText: data.specialSaleText || '',
      specialSaleStart: formatOptionalDate(data.specialSaleStart),
      specialSaleEnd: formatOptionalDate(data.specialSaleEnd),
      discountLabel: data.discountLabel || ''
    };
    
    // Save and advance
    onSave(formattedData, true);
  };
  
  // Handle save without advancing
  const handleSaveOnly = () => {
    const values = form.getValues();
    
    // Format the dates back to ISO strings
    const formatOptionalDate = (date: Date | null | undefined): string | null => {
      return date ? date.toISOString() : null;
    };
    
    const formattedData = {
      stockLevel: values.stockLevel,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
      weight: values.weight || '',
      dimensions: values.dimensions || '',
      isFlashDeal: values.isFlashDeal,
      flashDealEnd: formatOptionalDate(values.flashDealEnd),
      specialSaleText: values.specialSaleText || '',
      specialSaleStart: formatOptionalDate(values.specialSaleStart),
      specialSaleEnd: formatOptionalDate(values.specialSaleEnd),
      discountLabel: values.discountLabel || ''
    };
    
    // Save without advancing
    onSave(formattedData, false);
  };
  
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="inventory" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="physical">Physical</TabsTrigger>
                <TabsTrigger value="promotion">Promotions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="inventory" className="space-y-4">
                {/* Stock Level */}
                <FormField
                  control={form.control}
                  name="stockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Is Active */}
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Product</FormLabel>
                        <FormDescription>
                          Product will be visible and available for purchase
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* Is Featured */}
                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Featured Product</FormLabel>
                        <FormDescription>
                          Product will appear in featured sections of the store
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* Add attributes here if needed in the future */}
              </TabsContent>
              
              <TabsContent value="physical" className="space-y-4">
                {/* Weight */}
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="e.g., 1.5" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the weight in kilograms
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Dimensions */}
                <FormField
                  control={form.control}
                  name="dimensions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dimensions (LxWxH in cm)</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="e.g., 30x20x10" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter dimensions in format: Length x Width x Height
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="promotion" className="space-y-4">
                {/* Discount Label */}
                <FormField
                  control={form.control}
                  name="discountLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Label</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="e.g., Summer Sale" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Short text to describe the discount
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Flash Deal */}
                <FormField
                  control={form.control}
                  name="isFlashDeal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Flash Deal</FormLabel>
                        <FormDescription>
                          Enable a time-limited flash deal for this product
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* Flash Deal End Date */}
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
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={isLoading}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                              disabled={isLoading}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          The date when the flash deal ends
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* Special Sale Text */}
                <FormField
                  control={form.control}
                  name="specialSaleText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Sale Text</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="e.g., Limited Time Offer" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Text to display for special promotions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Special Sale Period */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Special Sale Start */}
                  <FormField
                    control={form.control}
                    name="specialSaleStart"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Special Sale Start</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={isLoading}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                              disabled={isLoading}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Special Sale End */}
                  <FormField
                    control={form.control}
                    name="specialSaleEnd"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Special Sale End</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={isLoading}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                              disabled={isLoading}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveOnly}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              
              <Button 
                type="submit"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Continue
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};