import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage, 
  FormDescription 
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, XIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";

interface DetailsStepProps {
  form: UseFormReturn<any>;
}

export function DetailsStep({ form }: DetailsStepProps) {
  const { control, setValue, watch, getValues } = form;
  const [newTag, setNewTag] = useState<string>("");
  const tags = watch("tags") || [];
  const inFlashDeal = watch("inFlashDeal") || false;
  const flashDealEnd = watch("flashDealEnd");
  const discount = watch("discount") || 0;
  const discountType = watch("discountType") || "percentage";
  const price = watch("price") || 0;
  
  // Calculate final price based on discount
  const [calculatedPrice, setCalculatedPrice] = useState<number>(price);
  
  useEffect(() => {
    if (price && discount > 0) {
      if (discountType === "percentage") {
        setCalculatedPrice(price * (1 - discount / 100));
      } else { // fixed amount
        setCalculatedPrice(Math.max(0, price - discount));
      }
    } else {
      setCalculatedPrice(price);
    }
  }, [price, discount, discountType]);

  // Handle adding a new tag
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setValue("tags", [...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  // Handle removing a tag
  const handleRemoveTag = (tagToRemove: string) => {
    setValue("tags", tags.filter((t: string) => t !== tagToRemove));
  };

  // Handle keydown for tag input (enter key)
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Product Details</h3>
        <p className="text-sm text-muted-foreground">
          Add comprehensive details to help customers understand your product.
        </p>
      </div>

      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Details</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4 pt-4">
          <FormField
            control={control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Brand name" 
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  The manufacturer or brand of the product
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Detailed product description" 
                    className="min-h-[200px]"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  Rich description of the product with key features and benefits
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (g)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Weight in grams" 
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="dimensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dimensions (LxWxH cm)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. 10x5x2" 
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                <FormControl>
                  <Input placeholder="Unique product identifier" {...field} />
                </FormControl>
                <FormDescription>
                  A unique identifier for your product
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Price (ZAR)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      min="0" 
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || '')}
                    />
                  </FormControl>
                  <FormDescription>
                    Regular price before any discounts
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="compareAtPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Compare At Price (ZAR)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      min="0" 
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || '')}
                    />
                  </FormControl>
                  <FormDescription>
                    Original price to show as crossed out
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="border rounded-md p-4 space-y-4">
            <FormField
              control={control}
              name="inFlashDeal"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <div>
                    <FormLabel>Flash Deal</FormLabel>
                    <FormDescription>
                      Set this product as a limited-time flash deal
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

            {inFlashDeal && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="flashDealEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date)}
                        />
                      </FormControl>
                      <FormDescription>
                        When the flash deal ends
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="discountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            defaultValue="percentage"
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="fixed">Fixed Amount (ZAR)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {discount > 0 && (
                    <div className="mt-2 p-2 bg-muted rounded-md">
                      <p className="text-sm font-medium">Final Price: R{calculatedPrice.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {discountType === 'percentage' 
                          ? `${discount}% off` 
                          : `R${discount} off`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tags" className="space-y-4 pt-4">
          <div className="flex items-end gap-2">
            <FormItem className="flex-1">
              <FormLabel>Add Tags</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter tag and press Enter" 
                  value={newTag} 
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                />
              </FormControl>
              <FormDescription>
                Tags help with search and categorization
              </FormDescription>
            </FormItem>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={handleAddTag}
              className="mb-0.5"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          <div className="border rounded-md p-4">
            <FormLabel>Current Tags</FormLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.length > 0 ? (
                tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveTag(tag)} 
                      className="text-xs rounded-full hover:bg-primary/20 p-0.5"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tags added yet</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="shipping" className="space-y-4 pt-4">
          <FormField
            control={control}
            name="freeShipping"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div>
                  <FormLabel>Free Shipping</FormLabel>
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
            control={control}
            name="shippingClass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shipping Class</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || "standard"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shipping class" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="express">Express</SelectItem>
                    <SelectItem value="bulky">Bulky</SelectItem>
                    <SelectItem value="digital">Digital/Download</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Determines shipping rates and methods
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}