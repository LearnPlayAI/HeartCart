import { useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage, 
  FormDescription 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { slugify } from "@/lib/slugify";

interface BasicInfoStepProps {
  form: UseFormReturn<any>;
  categories: Category[];
}

export function BasicInfoStep({ form, categories }: BasicInfoStepProps) {
  const { control, watch, setValue } = form;
  const name = watch("name");

  // Auto-generate slug when name changes
  useEffect(() => {
    if (name) {
      setValue("slug", slugify(name));
    }
  }, [name, setValue]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Basic Information</h3>
        <p className="text-sm text-muted-foreground">
          Start by filling in the essential details about your product.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter product name" {...field} />
              </FormControl>
              <FormDescription>
                A clear, descriptive name for your product
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Slug</FormLabel>
              <FormControl>
                <Input 
                  placeholder="product-url-slug" 
                  {...field} 
                  className="font-mono text-sm"
                />
              </FormControl>
              <FormDescription>
                Auto-generated from the product name
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value))} 
                value={field.value?.toString() || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the most appropriate category for your product
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="costPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cost Price (ZAR)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0" 
                  step="0.01"
                  placeholder="0.00" 
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || '')}
                />
              </FormControl>
              <FormDescription>
                Wholesale price you pay to suppliers
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Retail Price (ZAR)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0" 
                  step="0.01"
                  placeholder="0.00" 
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || '')}
                />
              </FormControl>
              <FormDescription>
                Regular selling price in South African Rand
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="costPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cost Price (ZAR)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0" 
                  step="0.01"
                  placeholder="0.00" 
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || '')}
                />
              </FormControl>
              <FormDescription>
                Cost price from suppliers (before markup)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        <FormField
          control={control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active Product</FormLabel>
                <FormDescription>
                  Make this product visible to customers
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}