import * as React from "react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { UseFormReturn } from "react-hook-form";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { GlobalAttribute, GlobalAttributeOption } from "@shared/schema";

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

      <Card>
        <CardHeader>
          <CardTitle>Global Attributes</CardTitle>
          <CardDescription>
            Assign global attributes like color, size, material to this product
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GlobalAttributesSection productId={form.getValues("id")} />
        </CardContent>
      </Card>
    </div>
  );
}

// Component to manage global attributes for a product
function GlobalAttributesSection({ productId }: { productId?: number }) {
  const [selectedAttributes, setSelectedAttributes] = React.useState<number[]>([]);
  
  // Fetch all global attributes
  const { data: globalAttributes, isLoading: isLoadingAttributes } = useQuery({
    queryKey: ['/api/global-attributes'],
    queryFn: async () => {
      const res = await fetch('/api/global-attributes');
      if (!res.ok) throw new Error('Failed to fetch global attributes');
      return res.json() as Promise<GlobalAttribute[]>;
    }
  });
  
  // Fetch product attributes if a product ID is provided
  const { data: productAttributes, isLoading: isLoadingProductAttributes } = useQuery({
    queryKey: ['/api/products', productId, 'attributes'],
    queryFn: async () => {
      if (!productId) return [];
      const res = await fetch(`/api/products/${productId}/attributes`);
      if (!res.ok) throw new Error('Failed to fetch product attributes');
      return res.json();
    },
    enabled: !!productId
  });
  
  // Fetch attribute options for a specific attribute
  const getAttributeOptions = async (attributeId: number) => {
    const res = await fetch(`/api/global-attributes/${attributeId}/options`);
    if (!res.ok) throw new Error('Failed to fetch attribute options');
    return res.json() as Promise<GlobalAttributeOption[]>;
  };
  
  // Add a global attribute to the product
  const addAttributeToProduct = async (attributeId: number, selectedOptions: number[]) => {
    if (!productId) return;
    
    try {
      const res = await fetch(`/api/products/${productId}/attributes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attributeId,
          optionIds: selectedOptions
        })
      });
      
      if (!res.ok) throw new Error('Failed to add attribute to product');
      return true;
    } catch (error) {
      console.error('Error adding attribute to product:', error);
      return false;
    }
  };
  
  // Remove a global attribute from the product
  const removeAttributeFromProduct = async (attributeId: number) => {
    if (!productId) return;
    
    try {
      const res = await fetch(`/api/products/${productId}/attributes/${attributeId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error('Failed to remove attribute from product');
      return true;
    } catch (error) {
      console.error('Error removing attribute from product:', error);
      return false;
    }
  };
  
  return (
    <div className="space-y-4">
      {isLoadingAttributes ? (
        <div className="text-center py-4">Loading global attributes...</div>
      ) : globalAttributes && globalAttributes.length > 0 ? (
        <>
          <div className="mb-4">
            <Select onValueChange={(value) => {
              const attributeId = parseInt(value);
              if (!selectedAttributes.includes(attributeId)) {
                setSelectedAttributes([...selectedAttributes, attributeId]);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select an attribute to add" />
              </SelectTrigger>
              <SelectContent>
                {globalAttributes.map((attribute) => (
                  <SelectItem 
                    key={attribute.id} 
                    value={attribute.id.toString()}
                    disabled={selectedAttributes.includes(attribute.id)}
                  >
                    {attribute.displayName || attribute.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedAttributes.map((attributeId) => {
            const attribute = globalAttributes.find(a => a.id === attributeId);
            if (!attribute) return null;
            
            return (
              <Card key={attribute.id} className="mb-4">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{attribute.displayName || attribute.name}</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedAttributes(selectedAttributes.filter(id => id !== attribute.id));
                        if (productId) {
                          removeAttributeFromProduct(attribute.id);
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <AttributeOptionSelector 
                    attributeId={attribute.id} 
                    getOptions={getAttributeOptions}
                    onSave={(selectedOptions) => {
                      if (productId) {
                        addAttributeToProduct(attribute.id, selectedOptions);
                      }
                    }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </>
      ) : (
        <div className="text-center py-4 border rounded-md">
          <p className="text-muted-foreground mb-2">No global attributes available</p>
          <Button asChild size="sm" variant="outline">
            <a href="/admin/global-attributes" target="_blank" rel="noopener noreferrer">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create attributes
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

// Component to select options for an attribute
function AttributeOptionSelector({ 
  attributeId, 
  getOptions,
  onSave
}: { 
  attributeId: number; 
  getOptions: (attributeId: number) => Promise<GlobalAttributeOption[]>;
  onSave: (selectedOptions: number[]) => void;
}) {
  const [options, setOptions] = React.useState<GlobalAttributeOption[]>([]);
  const [selectedOptions, setSelectedOptions] = React.useState<number[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    const loadOptions = async () => {
      setIsLoading(true);
      try {
        const optionsData = await getOptions(attributeId);
        setOptions(optionsData);
      } catch (error) {
        console.error('Error loading attribute options:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadOptions();
  }, [attributeId, getOptions]);
  
  if (isLoading) {
    return <div className="text-center py-2">Loading options...</div>;
  }
  
  if (options.length === 0) {
    return (
      <div className="text-center py-2 border rounded-md">
        <p className="text-muted-foreground mb-2">No options available for this attribute</p>
        <Button asChild size="sm" variant="outline">
          <a href={`/admin/global-attributes/${attributeId}`} target="_blank" rel="noopener noreferrer">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add options
          </a>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <div 
            key={option.id}
            className={`
              border p-2 rounded-md cursor-pointer
              ${selectedOptions.includes(option.id) ? 'bg-primary/10 border-primary' : ''}
            `}
            onClick={() => {
              if (selectedOptions.includes(option.id)) {
                setSelectedOptions(selectedOptions.filter(id => id !== option.id));
              } else {
                setSelectedOptions([...selectedOptions, option.id]);
              }
            }}
          >
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-full ${selectedOptions.includes(option.id) ? 'bg-primary' : 'bg-muted'}`} />
              <span>{option.value}</span>
            </div>
          </div>
        ))}
      </div>
      
      <Button 
        onClick={() => onSave(selectedOptions)}
        variant="outline" 
        size="sm"
        className="w-full"
        disabled={selectedOptions.length === 0}
      >
        Save Selected Options
      </Button>
    </div>
  );
}