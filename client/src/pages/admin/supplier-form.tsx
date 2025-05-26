import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Loader2, Building, Mail, Phone, User, Globe, MapPin, FileText, Power } from "lucide-react";
import { Link } from "wouter";

// Form validation schema
const supplierFormSchema = z.object({
  name: z.string().min(2, "Supplier name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z.string().min(1, "Phone number is required"),
  contactName: z.string().min(2, "Contact person name must be at least 2 characters"),
  address: z.string().optional(),
  notes: z.string().optional(),
  website: z.string().optional().refine((val) => {
    if (!val || val === "") return true;
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, "Please enter a valid URL"),
  isActive: z.boolean().default(true),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export default function SupplierForm() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const supplierId = params.id;
  const isEditing = !!supplierId;

  // Fetch supplier details for editing
  const { data: supplierResponse, isLoading: isLoadingSupplier } = useQuery({
    queryKey: [`/api/suppliers/${supplierId}`],
    enabled: isEditing,
  });

  const supplier = supplierResponse?.data;

  // Form setup
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      contactName: "",
      address: "",
      notes: "",
      website: "",
      isActive: true,
    },
  });

  // Update form when supplier data is loaded
  useEffect(() => {
    if (supplier) {
      form.reset({
        name: supplier.name || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        contactName: supplier.contactName || "",
        address: supplier.address || "",
        notes: supplier.notes || "",
        website: supplier.website || "",
        isActive: supplier.isActive ?? true,
      });
    }
  }, [supplier, form]);

  // Create supplier mutation
  const createSupplier = useMutation({
    mutationFn: (data: SupplierFormValues) =>
      apiRequest("/api/suppliers", { method: "POST", data }),
    onSuccess: (response) => {
      toast({
        title: "Success!",
        description: `Supplier "${response.data.name}" created successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setLocation("/admin/suppliers");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create supplier",
        variant: "destructive",
      });
    },
  });

  // Update supplier mutation
  const updateSupplier = useMutation({
    mutationFn: (data: SupplierFormValues) =>
      apiRequest(`/api/suppliers/${supplierId}`, { method: "PATCH", data }),
    onSuccess: (response) => {
      toast({
        title: "Success!",
        description: `Supplier "${response.data.name}" updated successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/suppliers/${supplierId}`] });
      setLocation("/admin/suppliers");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update supplier",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupplierFormValues) => {
    if (isEditing) {
      updateSupplier.mutate(data);
    } else {
      createSupplier.mutate(data);
    }
  };

  const isLoading = createSupplier.isPending || updateSupplier.isPending;

  if (isEditing && isLoadingSupplier) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
            <span className="text-muted-foreground">Loading supplier details...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (isEditing && !supplier) {
    return (
      <AdminLayout>
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            Supplier not found. Please check the URL and try again.
          </p>
          <Link href="/admin/suppliers">
            <Button className="mt-4">Go to Suppliers List</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditing ? "Edit Supplier" : "Create New Supplier"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing 
                ? "Update supplier information and settings" 
                : "Add a new supplier to your catalog"
              }
            </p>
          </div>
          <Link href="/admin/suppliers">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Suppliers
            </Button>
          </Link>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Supplier Details
            </CardTitle>
            <CardDescription>
              Fill in the supplier information below. Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Supplier Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Supplier Name *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter supplier company name" 
                            {...field} 
                            className="h-10"
                          />
                        </FormControl>
                        <FormDescription>
                          The official name of the supplier company
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Contact Person */}
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Contact Person *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter contact person name" 
                            {...field} 
                            className="h-10"
                          />
                        </FormControl>
                        <FormDescription>
                          Main point of contact at the supplier
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email Address
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="contact@supplier.com" 
                            {...field} 
                            className="h-10"
                          />
                        </FormControl>
                        <FormDescription>
                          Primary contact email for the supplier
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Number *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+27 XX XXX XXXX" 
                            {...field} 
                            className="h-10"
                          />
                        </FormControl>
                        <FormDescription>
                          Primary contact phone for the supplier
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Website */}
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Website
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://supplier-website.com" 
                            {...field} 
                            className="h-10"
                          />
                        </FormControl>
                        <FormDescription>
                          The supplier's website address (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Address */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Address
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Physical address" 
                            {...field} 
                            className="h-10"
                          />
                        </FormControl>
                        <FormDescription>
                          Physical address of the supplier
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notes - Full Width */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Notes
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes about the supplier, their products, or special terms..."
                          className="min-h-[100px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional additional information about the supplier
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 space-y-0">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2 text-base">
                          <Power className="h-4 w-4" />
                          Active Supplier
                        </FormLabel>
                        <FormDescription>
                          Set whether this supplier is currently active and available for use
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

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 sm:flex-none gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isEditing ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {isEditing ? "Update Supplier" : "Create Supplier"}
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none"
                  >
                    Reset Form
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