import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Edit, Trash2, TrendingUp, Gift, MoreHorizontal, Package } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  rules?: any; // JSON field for flexible promotion rules
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export default function PromotionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Fetch promotions
  const { data: promotionsData, isLoading } = useQuery({
    queryKey: ['/api/promotions'],
  });

  const promotions = promotionsData?.data || [];



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
      
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete promotion",
        variant: "destructive",
      });
    },
  });



  const handleEdit = (promotion: Promotion) => {
    navigate(`/admin/promotions/edit/${promotion.id}`);
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
        <Button onClick={() => navigate('/admin/promotions/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Promotion
        </Button>

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




      </div>
    </AdminLayout>
  );
}