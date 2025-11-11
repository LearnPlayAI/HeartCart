import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin/layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PlusCircle,
  Search,
  Loader2,
  Settings,
  MoreVertical,
  Edit,
  Trash,
  Check,
  X,
  Factory,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

type Supplier = {
  id: number;
  name: string;
  isActive: boolean;
  configuredMethodsCount: number;
};

type ShippingMethod = {
  id: number;
  name: string;
  code: string;
  baseCost: number;
  logisticsCompanyName: string;
  isActive: boolean;
};

type SupplierShippingMethod = {
  id: number;
  supplierId: number;
  shippingMethodId: number;
  shippingMethodName: string;
  customerPrice: number;
  supplierCost: number;
  isActive: boolean;
  isDefault: boolean;
  logisticsCompanyName: string;
};

const supplierShippingSchema = z.object({
  shippingMethodId: z.number({ required_error: "Please select a shipping method" }),
  customerPrice: z.number().min(0, "Price cannot be negative"),
  supplierCost: z.number().min(0, "Cost cannot be negative"),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
}).refine((data) => data.customerPrice >= data.supplierCost, {
  message: "Customer price must be greater than or equal to supplier cost",
  path: ["customerPrice"],
});

type SupplierShippingFormData = z.infer<typeof supplierShippingSchema>;

export default function SupplierShippingPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showAddMethodDialog, setShowAddMethodDialog] = useState(false);
  const [showEditMethodDialog, setShowEditMethodDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<SupplierShippingMethod | null>(null);

  // Fetch all suppliers
  const { data: suppliersResponse, isLoading: suppliersLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/suppliers"],
  });

  // Fetch shipping methods for selected supplier
  const { data: supplierMethodsResponse, isLoading: methodsLoading } = useQuery<{ success: boolean; data: SupplierShippingMethod[] }>({
    queryKey: ["/api/supplier-shipping-methods", selectedSupplier?.id],
    queryFn: async () => {
      if (!selectedSupplier) return { success: false, data: [] };
      const response = await fetch(`/api/supplier-shipping-methods?supplierId=${selectedSupplier.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch supplier shipping methods");
      }
      return response.json();
    },
    enabled: !!selectedSupplier,
  });

  // Fetch available shipping methods
  const { data: allMethodsResponse, isLoading: allMethodsLoading } = useQuery<{ success: boolean; data: ShippingMethod[] }>({
    queryKey: ["/api/shipping-methods"],
  });

  const suppliers: Supplier[] = (suppliersResponse?.data || []).map(s => ({
    id: s.id,
    name: s.name,
    isActive: s.isActive !== false,
    configuredMethodsCount: 0, // TODO: Get count from API
  }));

  const supplierMethods = supplierMethodsResponse?.data || [];
  const allMethods = (allMethodsResponse?.data || []).filter(m => m.isActive);

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addForm = useForm<SupplierShippingFormData>({
    resolver: zodResolver(supplierShippingSchema),
    defaultValues: {
      shippingMethodId: undefined,
      customerPrice: 0,
      supplierCost: 0,
      isActive: true,
      isDefault: false,
    },
  });

  const editForm = useForm<SupplierShippingFormData>({
    resolver: zodResolver(supplierShippingSchema),
    defaultValues: {
      shippingMethodId: undefined,
      customerPrice: 0,
      supplierCost: 0,
      isActive: true,
      isDefault: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SupplierShippingFormData & { supplierId: number }) => {
      return apiRequest("/api/supplier-shipping-methods", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-shipping-methods"] });
      toast({
        title: "Success",
        description: "Shipping method added to supplier",
      });
      setShowAddMethodDialog(false);
      addForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add shipping method",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SupplierShippingFormData> }) => {
      return apiRequest(`/api/supplier-shipping-methods/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-shipping-methods"] });
      toast({
        title: "Success",
        description: "Shipping method updated",
      });
      setShowEditMethodDialog(false);
      setSelectedMethod(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shipping method",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/supplier-shipping-methods/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-shipping-methods"] });
      toast({
        title: "Success",
        description: "Shipping method removed from supplier",
      });
      setShowDeleteDialog(false);
      setSelectedMethod(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove shipping method",
        variant: "destructive",
      });
    },
  });

  const handleConfigureSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowConfigDialog(true);
  };

  const handleAddMethod = () => {
    setShowAddMethodDialog(true);
    addForm.reset();
  };

  const handleEditMethod = (method: SupplierShippingMethod) => {
    setSelectedMethod(method);
    editForm.reset({
      shippingMethodId: method.shippingMethodId,
      customerPrice: method.customerPrice,
      supplierCost: method.supplierCost,
      isActive: method.isActive,
      isDefault: method.isDefault,
    });
    setShowEditMethodDialog(true);
  };

  const handleDeleteMethod = (method: SupplierShippingMethod) => {
    setSelectedMethod(method);
    setShowDeleteDialog(true);
  };

  const handleToggleActive = (method: SupplierShippingMethod) => {
    updateMutation.mutate({
      id: method.id,
      data: { isActive: !method.isActive },
    });
  };

  const handleSetDefault = (method: SupplierShippingMethod) => {
    updateMutation.mutate({
      id: method.id,
      data: { isDefault: true },
    });
  };

  const onAddSubmit = (data: SupplierShippingFormData) => {
    if (!selectedSupplier) return;
    createMutation.mutate({
      ...data,
      supplierId: selectedSupplier.id,
    });
  };

  const onEditSubmit = (data: SupplierShippingFormData) => {
    if (!selectedMethod) return;
    updateMutation.mutate({
      id: selectedMethod.id,
      data,
    });
  };

  // Available methods are those not already assigned to the supplier
  const assignedMethodIds = new Set(supplierMethods.map(m => m.shippingMethodId));
  const availableMethods = allMethods.filter(m => !assignedMethodIds.has(m.id));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-8 w-8 text-blue-600" />
              Supplier Shipping Configuration
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure shipping methods and pricing for each supplier
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {suppliersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-center py-8">
                <Factory className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No suppliers found matching your search" : "No suppliers available"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Configured Methods</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id} data-testid={`row-supplier-${supplier.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${supplier.id}`}>
                        {supplier.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={supplier.isActive ? "default" : "secondary"}>
                          {supplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{supplier.configuredMethodsCount} methods</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfigureSupplier(supplier)}
                          data-testid={`button-configure-${supplier.id}`}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configure Shipping
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier Shipping Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              {selectedSupplier?.name} - Shipping Methods
            </DialogTitle>
            <DialogDescription>
              Manage shipping methods and pricing for this supplier
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Configured Methods</h3>
              <Button
                onClick={handleAddMethod}
                disabled={availableMethods.length === 0}
                size="sm"
                data-testid="button-add-method"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Method
              </Button>
            </div>

            {methodsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : supplierMethods.length === 0 ? (
              <div className="text-center py-8 border rounded-lg">
                <p className="text-muted-foreground">No shipping methods configured for this supplier</p>
                {availableMethods.length > 0 && (
                  <Button onClick={handleAddMethod} className="mt-4" variant="outline">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add First Method
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Customer Price</TableHead>
                    <TableHead>Supplier Cost</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierMethods.map((method) => {
                    const margin = method.customerPrice - method.supplierCost;
                    const marginPercent = method.supplierCost > 0
                      ? ((margin / method.supplierCost) * 100).toFixed(1)
                      : '0';
                    return (
                      <TableRow key={method.id} data-testid={`row-method-${method.id}`}>
                        <TableCell className="font-medium">{method.shippingMethodName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{method.logisticsCompanyName}</TableCell>
                        <TableCell>R{method.customerPrice.toFixed(2)}</TableCell>
                        <TableCell>R{method.supplierCost.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={margin >= 0 ? "text-green-600" : "text-red-600"}>
                            R{margin.toFixed(2)} ({marginPercent}%)
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={method.isActive ? "default" : "secondary"}>
                            {method.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {method.isDefault ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-gray-300" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`button-actions-${method.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditMethod(method)} data-testid={`action-edit-${method.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Pricing
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(method)} data-testid={`action-toggle-${method.id}`}>
                                {method.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              {!method.isDefault && (
                                <DropdownMenuItem onClick={() => handleSetDefault(method)} data-testid={`action-default-${method.id}`}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Set as Default
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteMethod(method)}
                                className="text-destructive"
                                data-testid={`action-delete-${method.id}`}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Method Dialog */}
      <Dialog open={showAddMethodDialog} onOpenChange={setShowAddMethodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Shipping Method</DialogTitle>
            <DialogDescription>
              Configure a new shipping method for {selectedSupplier?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="shippingMethodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Method</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-add-method">
                          <SelectValue placeholder="Select a shipping method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableMethods.map((method) => (
                          <SelectItem key={method.id} value={method.id.toString()}>
                            {method.name} ({method.logisticsCompanyName}) - Base: R{method.baseCost.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="customerPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Price (R)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-add-customer-price"
                        />
                      </FormControl>
                      <FormDescription>Price shown to customers</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="supplierCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Cost (R)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-add-supplier-cost"
                        />
                      </FormControl>
                      <FormDescription>Cost charged by supplier</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Set as Default</FormLabel>
                      <FormDescription>
                        Use this method as default for this supplier
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-add-default"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Make this method available for orders
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-add-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddMethodDialog(false)}
                  data-testid="button-cancel-add"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-add">
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Method"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Method Dialog */}
      <Dialog open={showEditMethodDialog} onOpenChange={setShowEditMethodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shipping Method</DialogTitle>
            <DialogDescription>
              Update pricing and settings for {selectedMethod?.shippingMethodName}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="customerPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Price (R)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-edit-customer-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="supplierCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Cost (R)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-edit-supplier-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Set as Default</FormLabel>
                      <FormDescription>
                        Use this method as default for this supplier
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-default"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Make this method available for orders
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditMethodDialog(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Method"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Shipping Method</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{selectedMethod?.shippingMethodName}" from {selectedSupplier?.name}? This will affect future orders.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedMethod && deleteMutation.mutate(selectedMethod.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
