import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { UseFormReturn } from "react-hook-form";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface AdditionalInfoStepProps {
  form: UseFormReturn<any>;
}

export default function AdditionalInfoStep({
  form,
}: AdditionalInfoStepProps) {
  // Fetch catalogs for the dropdown
  const { data: catalogs, isLoading: isLoadingCatalogs } = useQuery({
    queryKey: ['/api/catalogs'],
    queryFn: async () => {
      const res = await fetch('/api/catalogs');
      if (!res.ok) throw new Error('Failed to fetch catalogs');
      return res.json();
    }
  });

  return (
    <div className="space-y-6">
      {/* Catalog Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>Catalog Assignment</CardTitle>
          <CardDescription>
            Assign this product to a catalog for better organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="catalogId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Catalog</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === 'null' ? null : parseInt(value))}
                  value={field.value?.toString() || 'null'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a catalog" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="null">None</SelectItem>
                    {catalogs?.map((catalog) => (
                      <SelectItem key={catalog.id} value={catalog.id.toString()}>
                        {catalog.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Assigning a product to a catalog helps with organization and bulk operations
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Featured & Flash Deal Settings</CardTitle>
          <CardDescription>
            Manage special promotions for this product
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Featured Product Toggle */}
          <FormField
            control={form.control}
            name="isFeatured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Featured Product
                  </FormLabel>
                  <FormDescription>
                    Show this product on the homepage Featured Products section
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

          {/* Flash Deal Toggle and Settings */}
          <FormField
            control={form.control}
            name="isFlashDeal"
            render={({ field }) => (
              <FormItem className="rounded-lg border p-4">
                <div className="flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Flash Deal
                    </FormLabel>
                    <FormDescription>
                      Promote as a time-limited special offer
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) {
                          form.setValue('flashDealEnd', null);
                        }
                      }}
                    />
                  </FormControl>
                </div>

                {field.value && (
                  <div className="mt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Percentage</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter discount %"
                              min={0}
                              max={100}
                              {...field}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                field.onChange(isNaN(value) ? 0 : Math.min(value, 100));
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Percentage off the regular price (0-100%)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="flashDealEnd"
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
                                    format(new Date(field.value), "PPP")
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
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            When the flash deal will end
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping Settings</CardTitle>
          <CardDescription>
            Configure shipping options for this product
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="freeShipping"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Free Shipping
                  </FormLabel>
                  <FormDescription>
                    Offer free shipping for this product
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

          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Weight in grams"
                    min={0}
                    {...field}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      field.onChange(isNaN(value) ? 0 : value);
                    }}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  Used to calculate shipping costs if not free
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
                <FormLabel>Dimensions (cm)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Format: LxWxH (e.g., 10x5x2)"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  Product dimensions in centimeters
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}