import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminLayout } from "@/components/admin/layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Save } from "lucide-react";

const catalogFormSchema = z.object({
  name: z.string().min(1, "Catalog name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
  supplierId: z.number().min(1, "Please select a supplier"),
  defaultMarkupPercentage: z.number().min(0, "Markup percentage must be 0 or higher").max(1000, "Markup percentage cannot exceed 1000%").optional(),
  isActive: z.boolean().default(true),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type CatalogFormData = z.infer<typeof catalogFormSchema>;

export default function AddCatalogPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch suppliers for the dropdown
  const { data: suppliers, isLoading: loadingSuppliers } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const form = useForm<CatalogFormData>({
    resolver: zodResolver(catalogFormSchema),
    defaultValues: {
      name: "",
      description: "",
      supplierId: 0,
      defaultMarkupPercentage: 0,
      isActive: true,
      startDate: "",
      endDate: "",
    },
  });

  const createCatalogMutation = useMutation({
    mutationFn: async (data: CatalogFormData) => {
      return apiRequest("/api/catalogs", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Catalog created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/catalogs"] });
      setLocation("/admin/catalogs");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create catalog",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CatalogFormData) => {
    createCatalogMutation.mutate(data);
  };

  const handleCancel = () => {
    setLocation("/admin/catalogs");
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="self-start"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Catalogs
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Add New Catalog</h1>
            <p className="text-muted-foreground">
              Create a new product catalog for your supplier
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Catalog Details</CardTitle>
            <CardDescription>
              Fill in the information below to create a new catalog
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Catalog Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catalog Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter catalog name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Supplier */}
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier *</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value ? String(field.value) : ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {loadingSuppliers ? (
                              <SelectItem value="loading" disabled>
                                Loading suppliers...
                              </SelectItem>
                            ) : suppliers?.data?.length ? (
                              suppliers.data.map((supplier: any) => (
                                <SelectItem
                                  key={supplier.id}
                                  value={String(supplier.id)}
                                >
                                  {supplier.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No suppliers available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter catalog description (optional)"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a brief description of this catalog
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Default Markup Percentage */}
                  <FormField
                    control={form.control}
                    name="defaultMarkupPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Markup Percentage</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="1000"
                            step="0.1"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Default markup percentage for products in this catalog
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Active Status */}
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Status</FormLabel>
                          <FormDescription>
                            Set whether this catalog is active and visible
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start Date */}
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          When this catalog becomes active (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* End Date */}
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          When this catalog expires (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button
                    type="submit"
                    disabled={createCatalogMutation.isPending}
                    className="flex-1 sm:flex-none"
                  >
                    {createCatalogMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Create Catalog
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={createCatalogMutation.isPending}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}