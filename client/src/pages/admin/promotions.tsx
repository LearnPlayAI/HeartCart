import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Plus, Edit, Trash2, Users, TrendingUp, Gift, Package, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Types for promotions
interface Promotion {
  id: number;
  promotionName: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  promotionType: 'percentage' | 'fixed' | 'bogo';
  discountValue?: number;
  minimumOrderValue?: number;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

// Form schema for creating/editing promotions
const promotionSchema = z.object({
  promotionName: z.string().min(1, "Promotion name is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isActive: z.boolean().default(true),
  promotionType: z.enum(['percentage', 'fixed', 'bogo']),
  discountValue: z.union([
    z.string().transform((val) => val === '' ? undefined : parseFloat(val)),
    z.number(),
    z.undefined()
  ]).optional(),
  minimumOrderValue: z.union([
    z.string().transform((val) => val === '' ? undefined : parseFloat(val)),
    z.number(),
    z.undefined()
  ]).optional(),
});

type PromotionFormData = z.infer<typeof promotionSchema>;

export default function PromotionsPage() {
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Fetch promotions
  const { data: promotionsData, isLoading } = useQuery({
    queryKey: ['/api/promotions'],
  });

  const promotions = promotionsData?.data || [];

  // Create promotion mutation
  const createPromotionMutation = useMutation({
    mutationFn: (data: PromotionFormData) => apiRequest('/api/promotions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      // Invalidate all promotion-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/promotions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/promotions/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/promotions/active-with-products'] });
      
      // Refetch the main promotions query immediately
      queryClient.refetchQueries({ queryKey: ['/api/promotions'] });
      
      setIsCreateDialogOpen(false);
      createForm.reset(); // Reset form after successful creation
      toast({
        title: "Success",
        description: "Promotion created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create promotion",
        variant: "destructive",
      });
    },
  });

  // Update promotion mutation
  const updatePromotionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PromotionFormData> }) =>
      apiRequest(`/api/promotions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // Invalidate all promotion-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/promotions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/promotions/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/promotions/active-with-products'] });
      
      // Refetch the main promotions query immediately
      queryClient.refetchQueries({ queryKey: ['/api/promotions'] });
      
      setIsEditDialogOpen(false);
      setSelectedPromotion(null);
      editForm.reset(); // Reset edit form
      toast({
        title: "Success",
        description: "Promotion updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update promotion",
        variant: "destructive",
      });
    },
  });

  // Delete promotion mutation
  const deletePromotionMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/promotions/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      // Invalidate all promotion-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/promotions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/promotions/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/promotions/active-with-products'] });
      
      // Refetch the main promotions query immediately
      queryClient.refetchQueries({ queryKey: ['/api/promotions'] });
      toast({
        title: "Success",
        description: "Promotion deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete promotion",
        variant: "destructive",
      });
    },
  });

  const createForm = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      promotionName: "",
      description: "",
      startDate: "",
      endDate: "",
      isActive: true,
      promotionType: "percentage",
      discountValue: "",
      minimumOrderValue: "",
    },
  });

  const editForm = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
  });

  const onCreateSubmit = (data: PromotionFormData) => {
    createPromotionMutation.mutate(data);
  };

  const onEditSubmit = (data: PromotionFormData) => {
    if (selectedPromotion) {
      updatePromotionMutation.mutate({ id: selectedPromotion.id, data });
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    editForm.reset({
      promotionName: promotion.promotionName,
      description: promotion.description || "",
      startDate: promotion.startDate.split('T')[0], // Convert to date input format
      endDate: promotion.endDate.split('T')[0],
      isActive: promotion.isActive,
      promotionType: promotion.promotionType,
      discountValue: promotion.discountValue ? promotion.discountValue.toString() : "",
      minimumOrderValue: promotion.minimumOrderValue ? promotion.minimumOrderValue.toString() : "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (promotion: Promotion) => {
    if (confirm(`Are you sure you want to delete "${promotion.promotionName}"?`)) {
      deletePromotionMutation.mutate(promotion.id);
    }
  };

  const handleManageProducts = (promotion: Promotion) => {
    navigate(`/admin/promotions/${promotion.id}/products`);
  };



  const getPromotionStatus = (promotion: Promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);

    if (!promotion.isActive) return { status: 'inactive', color: 'secondary' };
    if (now < startDate) return { status: 'scheduled', color: 'default' };
    if (now > endDate) return { status: 'expired', color: 'destructive' };
    return { status: 'active', color: 'default' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDiscountDisplay = (promotion: Promotion) => {
    if (promotion.promotionType === 'percentage') {
      return `${promotion.discountValue}%`;
    } else if (promotion.promotionType === 'fixed') {
      return `R${promotion.discountValue}`;
    } else {
      return 'BOGO';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading promotions...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promotions Management</h1>
          <p className="text-muted-foreground">Create and manage promotional campaigns</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Promotion</DialogTitle>
              <DialogDescription>
                Set up a new promotional campaign for your products
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="promotionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Promotion Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Father's Day Sale" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="promotionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                            <SelectItem value="bogo">Buy One Get One</SelectItem>
                          </SelectContent>
                        </Select>
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Promotional campaign description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="discountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Value</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="10" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="minimumOrderValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Order Value</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Enable this promotion immediately
                        </div>
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

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPromotionMutation.isPending}>
                    {createPromotionMutation.isPending ? "Creating..." : "Create Promotion"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Promotions</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promotions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Promotions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promotions.filter((p: Promotion) => getPromotionStatus(p).status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promotions.filter((p: Promotion) => getPromotionStatus(p).status === 'scheduled').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Promotions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Promotions</CardTitle>
          <CardDescription>Manage your promotional campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {promotions.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No promotions</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new promotion.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {promotions.map((promotion: Promotion) => {
                const statusInfo = getPromotionStatus(promotion);
                return (
                  <div key={promotion.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{promotion.promotionName}</h3>
                        <Badge variant={statusInfo.color as any}>
                          {statusInfo.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {promotion.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                        <span>{formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}</span>
                        <span>Discount: {getDiscountDisplay(promotion)}</span>
                        {promotion.minimumOrderValue && (
                          <span>Min Order: R{promotion.minimumOrderValue}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleManageProducts(promotion)}>
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(promotion)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(promotion)}
                        disabled={deletePromotionMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Promotion</DialogTitle>
            <DialogDescription>
              Update the promotional campaign details
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              {/* Same form fields as create form */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="promotionName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promotion Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Father's Day Sale" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="promotionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                          <SelectItem value="bogo">Buy One Get One</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Promotional campaign description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="10" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="minimumOrderValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Order Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="100" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable this promotion immediately
                      </div>
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

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePromotionMutation.isPending}>
                  {updatePromotionMutation.isPending ? "Updating..." : "Update Promotion"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>


      </div>
    </AdminLayout>
  );
}