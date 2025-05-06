import { UseFormReturn } from 'react-hook-form';
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { X, Plus, Calendar } from 'lucide-react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DetailsStepProps {
  form: UseFormReturn<any>;
}

export function DetailsStep({ form }: DetailsStepProps) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getValues('tags') || [];
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue('tags', [...currentTags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tag: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(t => t !== tag));
  };

  return (
    <div className="space-y-6">
      <div className="bg-pink-50 dark:bg-pink-900/10 p-4 rounded-lg border border-pink-100 dark:border-pink-900/30 mb-6">
        <h3 className="text-lg font-medium text-pink-800 dark:text-pink-300 mb-2">Additional Product Details</h3>
        <p className="text-sm text-pink-700 dark:text-pink-400">
          Add more information to help customers make informed decisions. Complete descriptions and accurate details improve your product's visibility.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Description</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Describe your product in detail..."
                  value={field.value || ''}
                  className="min-h-[150px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="Enter brand name"
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Product Tags</FormLabel>
          <div className="flex flex-wrap gap-2 mb-2">
            {(form.getValues('tags') || []).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => handleRemoveTag(tag)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
          
          <div className="flex">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Enter tags and press Add or Enter"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={handleAddTag}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <FormDescription>
            Add tags to help customers find this product. Press Enter after each tag.
          </FormDescription>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="salePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sale Price (ZAR)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </FormControl>
                <FormDescription>
                  Leave empty to use regular price
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Percentage (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    {...field}
                    value={field.value || 0}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="isFlashDeal"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Flash Deal</FormLabel>
                  <FormDescription>
                    Mark this product as a limited time offer
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
            name="freeShipping"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Free Shipping</FormLabel>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="isFeatured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Featured Product</FormLabel>
                  <FormDescription>
                    Display this product on the homepage
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
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active Status</FormLabel>
                  <FormDescription>
                    Make this product visible to customers
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
        </div>

        {form.watch('isFlashDeal') && (
          <FormField
            control={form.control}
            name="flashDealEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Flash Deal End Date & Time</FormLabel>
                <FormControl>
                  <div className="relative">
                    <DatePicker
                      selected={field.value ? new Date(field.value) : null}
                      onChange={(date) => field.onChange(date)}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="MMMM d, yyyy h:mm aa"
                      minDate={new Date()}
                      placeholderText="Select date and time"
                      className={cn(
                        "w-full rounded-md border border-input bg-background px-3 py-2",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                      )}
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                  </div>
                </FormControl>
                <FormDescription>
                  When the flash deal will end
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
}