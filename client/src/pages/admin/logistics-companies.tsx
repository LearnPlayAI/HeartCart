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
  Truck,
  MoreVertical,
  Edit,
  Trash,
  ToggleLeft,
  ToggleRight,
  Package,
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type LogisticsCompany = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  trackingUrlTemplate: string | null;
  createdAt: string;
  updatedAt: string;
};

const logisticsCompanySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters").regex(/^[A-Z0-9_]+$/, "Code must be uppercase letters, numbers, and underscores only"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  trackingUrlTemplate: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type LogisticsCompanyFormData = z.infer<typeof logisticsCompanySchema>;

export default function LogisticsCompaniesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<LogisticsCompany | null>(null);

  const { data: companiesResponse, isLoading } = useQuery<{ success: boolean; data: LogisticsCompany[] }>({
    queryKey: ["/api/logistics-companies"],
  });

  const companies = companiesResponse?.data || [];

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createForm = useForm<LogisticsCompanyFormData>({
    resolver: zodResolver(logisticsCompanySchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      isActive: true,
      trackingUrlTemplate: "",
    },
  });

  const editForm = useForm<LogisticsCompanyFormData>({
    resolver: zodResolver(logisticsCompanySchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      isActive: true,
      trackingUrlTemplate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LogisticsCompanyFormData) => {
      return apiRequest("/api/logistics-companies", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics-companies"] });
      toast({
        title: "Success",
        description: "Logistics company created successfully",
      });
      setShowCreateDialog(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create logistics company",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<LogisticsCompanyFormData> }) => {
      return apiRequest(`/api/logistics-companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics-companies"] });
      toast({
        title: "Success",
        description: "Logistics company updated successfully",
      });
      setShowEditDialog(false);
      setSelectedCompany(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update logistics company",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/logistics-companies/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics-companies"] });
      toast({
        title: "Success",
        description: "Logistics company deleted successfully",
      });
      setShowDeleteDialog(false);
      setSelectedCompany(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete logistics company",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setShowCreateDialog(true);
    createForm.reset();
  };

  const handleEdit = (company: LogisticsCompany) => {
    setSelectedCompany(company);
    editForm.reset({
      name: company.name,
      code: company.code,
      description: company.description || "",
      isActive: company.isActive,
      trackingUrlTemplate: company.trackingUrlTemplate || "",
    });
    setShowEditDialog(true);
  };

  const handleDelete = (company: LogisticsCompany) => {
    setSelectedCompany(company);
    setShowDeleteDialog(true);
  };

  const handleToggleStatus = (company: LogisticsCompany) => {
    updateMutation.mutate({
      id: company.id,
      data: { isActive: !company.isActive },
    });
  };

  const onCreateSubmit = (data: LogisticsCompanyFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: LogisticsCompanyFormData) => {
    if (!selectedCompany) return;
    updateMutation.mutate({
      id: selectedCompany.id,
      data,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Truck className="h-8 w-8 text-blue-600" />
              Logistics Companies
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage shipping carriers and logistics providers
            </p>
          </div>
          <Button onClick={handleCreate} data-testid="button-create-company">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
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
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No companies found matching your search" : "No logistics companies yet"}
                </p>
                {!searchQuery && (
                  <Button onClick={handleCreate} className="mt-4" variant="outline">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Your First Company
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking URL</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.id} data-testid={`row-company-${company.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${company.id}`}>
                        {company.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{company.code}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {company.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.isActive ? "default" : "secondary"}>
                          {company.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {company.trackingUrlTemplate ? (
                          <span className="text-xs text-muted-foreground">{company.trackingUrlTemplate}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${company.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(company)} data-testid={`action-edit-${company.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(company)} data-testid={`action-toggle-${company.id}`}>
                              {company.isActive ? (
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
                              onClick={() => handleDelete(company)}
                              className="text-destructive"
                              data-testid={`action-delete-${company.id}`}
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
            <DialogTitle>Create Logistics Company</DialogTitle>
            <DialogDescription>
              Add a new shipping carrier or logistics provider
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., PUDO Locker" {...field} data-testid="input-create-name" />
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
                    <FormLabel>Company Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., PUDO_LOCKER" {...field} data-testid="input-create-code" />
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the logistics company..."
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
                name="trackingUrlTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking URL Template (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., https://track.company.com/track?id={trackingNumber}"
                        {...field}
                        data-testid="input-create-tracking-url"
                      />
                    </FormControl>
                    <FormDescription>
                      Use {"{trackingNumber}"} as placeholder for the tracking number
                    </FormDescription>
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
                        Make this company available for shipping methods
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
                    "Create Company"
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
            <DialogTitle>Edit Logistics Company</DialogTitle>
            <DialogDescription>
              Update logistics company information
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
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
                    <FormLabel>Company Code</FormLabel>
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
                name="trackingUrlTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking URL Template (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-tracking-url" />
                    </FormControl>
                    <FormDescription>
                      Use {"{trackingNumber}"} as placeholder for the tracking number
                    </FormDescription>
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
                        Make this company available for shipping methods
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
                    "Update Company"
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
            <DialogTitle>Delete Logistics Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCompany?.name}"? This action cannot be undone and may affect existing shipping methods.
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
              onClick={() => selectedCompany && deleteMutation.mutate(selectedCompany.id)}
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
