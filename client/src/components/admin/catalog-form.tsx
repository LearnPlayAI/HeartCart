import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

// Form validation schema
const catalogFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  supplierId: z.string().min(1, "Please select a supplier"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description cannot exceed 500 characters"),
  isActive: z.boolean().default(true),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
  markupPercentage: z.coerce.number().min(0).default(0),
  freeShipping: z.boolean().default(false),
});

type CatalogFormValues = z.infer<typeof catalogFormSchema>;

// Define the supplier type for the dropdown
type Supplier = {
  id: number;
  name: string;
};

interface CatalogFormProps {
  initialData?: Partial<CatalogFormValues>;
  onSubmit: (data: CatalogFormValues) => void;
  isLoading?: boolean;
}

export function CatalogForm({ 
  initialData, 
  onSubmit, 
  isLoading = false 
}: CatalogFormProps) {
  const { toast } = useToast();
  
  const form = useForm<CatalogFormValues>({
    resolver: zodResolver(catalogFormSchema),
    defaultValues: {
      name: "",
      supplierId: "",
      description: "",
      isActive: true,
      startDate: new Date(),
      endDate: null,
      markupPercentage: 0,
      freeShipping: false,
      ...initialData,
    },
  });

  // Fetch suppliers for the dropdown
  const { data: suppliers = [], isLoading: isSuppliersLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    // No need to define a custom queryFn as the default fetcher is already set up in queryClient
  });

  useEffect(() => {
    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        if (value !== undefined) {
          form.setValue(key as keyof CatalogFormValues, value as any);
        }
      });
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Catalog Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter catalog name" {...field} />
                </FormControl>
                <FormDescription>
                  A descriptive name for this product catalog
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier *</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={isSuppliersLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                    {suppliers.length === 0 && (
                      <SelectItem value="none" disabled>
                        No suppliers available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The supplier who provides the products in this catalog
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date *</FormLabel>
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
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  When this catalog becomes available
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
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
                          <span>No end date (ongoing)</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-2 border-b">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={() => {
                          field.onChange(null);
                          document.body.click(); // Close the popover
                        }}
                      >
                        No end date
                      </Button>
                    </div>
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < (form.getValues("startDate") || new Date())
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Optional: When this catalog expires (leave empty for ongoing catalogs)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="markupPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Markup Percentage</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <Input 
                      type="number" 
                      min="0" 
                      max="100" 
                      placeholder="0" 
                      {...field}
                      value={field.value || "0"}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                    <span className="ml-2">%</span>
                  </div>
                </FormControl>
                <FormDescription>
                  Default markup percentage for all products in this catalog
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a description of this catalog and its products"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Detailed information about the catalog for internal reference
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="freeShipping"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Free Shipping</FormLabel>
                  <FormDescription>
                    All products in this catalog will have free shipping
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Active Status</FormLabel>
                  <FormDescription>
                    Set the catalog as active or inactive
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isLoading}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">◠</span>
                Saving...
              </>
            ) : initialData?.name ? (
              "Update Catalog"
            ) : (
              "Create Catalog"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}