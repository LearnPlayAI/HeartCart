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
  Package,
  MoreVertical,
  Edit,
  Trash,
  ToggleLeft,
  ToggleRight,
  Clock,
  DollarSign,
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type LogisticsCompany = {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
};

type ShippingMethod = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  logisticsCompanyId: number;
  logisticsCompanyName: string;
  estimatedDeliveryDays: number;
  baseCost: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const shippingMethodSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters").regex(/^[A-Z0-9_]+$/, "Code must be uppercase letters, numbers, and underscores only"),
  description: z.string().optional(),
  logisticsCompanyId: z.number({ required_error: "Please select a logistics company" }),
  estimatedDeliveryDays: z.number().min(1, "Must be at least 1 day").max(365, "Must be less than 365 days"),
  baseCost: z.number().min(0, "Cost cannot be negative"),
  isActive: z.boolean().default(true),
});

type ShippingMethodFormData = z.infer<typeof shippingMethodSchema>;

export default function ShippingMethodsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<ShippingMethod | null>(null);

  const { data: methodsResponse, isLoading: methodsLoading } = useQuery<{ success: boolean; data: ShippingMethod[] }>({
    queryKey: ["/api/shipping-methods"],
  });

  const { data: companiesResponse, isLoading: companiesLoading } = useQuery<{ success: boolean; data: LogisticsCompany[] }>({
    queryKey: ["/api/logistics-companies"],
  });

  const methods = methodsResponse?.data || [];
  const companies = companiesResponse?.data || [];
  const activeCompanies = companies.filter(c => c.isActive);

  const filteredMethods = methods.filter((method) =>
    method.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    method.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    method.logisticsCompanyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createForm = useForm<ShippingMethodFormData>({
    resolver: zodResolver(shippingMethodSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      logisticsCompanyId: undefined,
      estimatedDeliveryDays: 3,
      baseCost: 0,
      isActive: true,
    },
  });

  const editForm = useForm<ShippingMethodFormData>({
    resolver: zodResolver(shippingMethodSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      logisticsCompanyId: undefined,
      estimatedDeliveryDays: 3,
      baseCost: 0,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ShippingMethodFormData) => {
      return apiRequest("/api/shipping-methods", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-methods"] });
      toast({
        title: "Success",
        description: "Shipping method created successfully",
      });
      setShowCreateDialog(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create shipping method",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ShippingMethodFormData> }) => {
      return apiRequest(`/api/shipping-methods/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-methods"] });
      toast({
        title: "Success",
        description: "Shipping method updated successfully",
      });
      setShowEditDialog(false);
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
      return apiRequest(`/api/shipping-methods/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-methods"] });
      toast({
        title: "Success",
        description: "Shipping method deleted successfully",
      });
      setShowDeleteDialog(false);
      setSelectedMethod(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete shipping method",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setShowCreateDialog(true);
    createForm.reset();
  };

  const handleEdit = (method: ShippingMethod) => {
    setSelectedMethod(method);
    editForm.reset({
      name: method.name,
      code: method.code,
      description: method.description || "",
      logisticsCompanyId: method.logisticsCompanyId,
      estimatedDeliveryDays: method.estimatedDeliveryDays,
      baseCost: method.baseCost,
      isActive: method.isActive,
    });
    setShowEditDialog(true);
  };

  const handleDelete = (method: ShippingMethod) => {
    setSelectedMethod(method);
    setShowDeleteDialog(true);
  };

  const handleToggleStatus = (method: ShippingMethod) => {
    updateMutation.mutate({
      id: method.id,
      data: { isActive: !method.isActive },
    });
  };

  const onCreateSubmit = (data: ShippingMethodFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: ShippingMethodFormData) => {
    if (!selectedMethod) return;
    updateMutation.mutate({
      id: selectedMethod.id,
      data,
    });
  };

  const isLoading = methodsLoading || companiesLoading;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-8 w-8 text-blue-600" />
              Shipping Methods
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage shipping options and delivery methods
            </p>
          </div>
          <Button onClick={handleCreate} disabled={activeCompanies.length === 0} data-testid="button-create-method">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Method
          </Button>
        </div>

        {activeCompanies.length === 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800">
                No active logistics companies available. Please create and activate at least one logistics company before adding shipping methods.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMethods.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No shipping methods found matching your search" : "No shipping methods yet"}
                </p>
                {!searchQuery && activeCompanies.length > 0 && (
                  <Button onClick={handleCreate} className="mt-4" variant="outline">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Your First Method
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Delivery Time</TableHead>
                    <TableHead>Base Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMethods.map((method) => (
                    <TableRow key={method.id} data-testid={`row-method-${method.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${method.id}`}>
                        {method.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{method.code}</Badge>
                      </TableCell>
                      <TableCell>{method.logisticsCompanyName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{method.estimatedDeliveryDays} {method.estimatedDeliveryDays === 1 ? 'day' : 'days'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>R{method.baseCost.toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={method.isActive ? "default" : "secondary"}>
                          {method.isActive ? "Active" : "Inactive"}
                        </Badge>
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
                            <DropdownMenuItem onClick={() => handleEdit(method)} data-testid={`action-edit-${method.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(method)} data-testid={`action-toggle-${method.id}`}>
                              {method.isActive ? (
                                <>
                                  <ToggleLeft className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(method)}
                              className="text-destructive"
                              data-testid={`action-delete-${method.id}`}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Shipping Method</DialogTitle>
            <DialogDescription>
              Add a new shipping option for customers
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Door to Door Delivery" {...field} data-testid="input-create-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., DOOR_TO_DOOR" {...field} data-testid="input-create-code" />
                    </FormControl>
                    <FormDescription>
                      Unique identifier (uppercase, numbers, underscores only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="logisticsCompanyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logistics Company</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-create-company">
                          <SelectValue placeholder="Select a logistics company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeCompanies.map((company) => (
                          <SelectItem key={company.id} value={company.id.toString()}>
                            {company.name}
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
                  control={createForm.control}
                  name="estimatedDeliveryDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Delivery (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-create-delivery-days"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="baseCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Cost (R)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-create-base-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the shipping method..."
                        {...field}
                        data-testid="input-create-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Make this method available for customer orders
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-create-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Method"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Shipping Method</DialogTitle>
            <DialogDescription>
              Update shipping method information
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method Code</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-code" />
                    </FormControl>
                    <FormDescription>
                      Unique identifier (uppercase, numbers, underscores only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="logisticsCompanyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logistics Company</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-company">
                          <SelectValue placeholder="Select a logistics company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeCompanies.map((company) => (
                          <SelectItem key={company.id} value={company.id.toString()}>
                            {company.name}
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
                  control={editForm.control}
                  name="estimatedDeliveryDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Delivery (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-edit-delivery-days"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="baseCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Cost (R)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-edit-base-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-edit-description" />
                    </FormControl>
                    <FormMessage />
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
                        Make this method available for customer orders
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
                  onClick={() => setShowEditDialog(false)}
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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Shipping Method</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedMethod?.name}"? This action cannot be undone and may affect supplier shipping configurations.
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
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
