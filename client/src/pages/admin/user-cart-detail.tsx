import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { AdminLayout } from '@/components/admin/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  Package,
  DollarSign,
  Clock,
  ExternalLink,
  Send
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function UserCartDetailPage() {
  const [match, params] = useRoute('/admin/user-carts/:userId');
  const userId = params?.userId ? parseInt(params.userId) : null;
  const queryClient = useQueryClient();

  // Fetch user cart details with fresh data on page access
  const { data: cartData, isLoading, error } = useQuery({
    queryKey: [`/api/admin/user-carts/${userId}`],
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch when component mounts
  });

  // Send cart abandonment email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest('POST', `/api/admin/user-carts/${userId}/send-email`, {});
    },
    onSuccess: (data) => {
      toast({
        title: "Email sent successfully",
        description: `Cart abandonment email sent to ${data.data.recipientEmail}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error sending email",
        description: error.message || "Failed to send cart abandonment email",
        variant: "destructive",
      });
    },
  });

  // The server now returns proper structure with user at top level
  const userData = cartData?.data?.user;
  const cartItems = cartData?.data?.cartItems || [];
  const totalItems = cartData?.data?.totalItems || 0;
  const totalCartValue = cartData?.data?.totalCartValue || 0;
  const oldestItemDate = cartData?.data?.oldestItemDate;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!userId) {
    return (
      <AdminLayout title="User Cart Details" subtitle="View user's abandoned cart">
        <div className="text-center py-8">
          <p className="text-red-600">Invalid user ID</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="User Cart Details" subtitle="View user's abandoned cart">
        <div className="text-center py-8">
          <p className="text-red-600">Error loading cart details. Please try again.</p>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout title="User Cart Details" subtitle="View user's abandoned cart">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!cartData || !cartData.data || (!userData && cartItems.length === 0)) {
    return (
      <AdminLayout title="User Cart Details" subtitle="View user's abandoned cart">
        <div className="text-center py-8">
          <p className="text-muted-foreground">No cart data available</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="User Cart Details" subtitle="View user's abandoned cart">
      <div className="space-y-6">
        {/* Back Button */}
        <div>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to User Carts
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Information */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {userData?.username?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium">
                    {userData?.fullName || userData?.username}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    @{userData?.username}
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${userData?.email}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {userData?.email}
                    </a>
                  </div>

                  {userData?.phoneNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${userData?.phoneNumber}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {userData?.phoneNumber}
                      </a>
                    </div>
                  )}

                  {userData?.lastLogin && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Last login: {formatDate(userData.lastLogin)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Cart Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Items:</span>
                    <span className="text-sm">{totalItems}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cart Value:</span>
                    <span className="text-sm font-bold">
                      {formatCurrency(totalCartValue)}
                    </span>
                  </div>
                  {oldestItemDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Oldest Item:</span>
                      <span className="text-sm">
                        {formatDate(oldestItemDate.toString())}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Contact Actions */}
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={() => sendEmailMutation.mutate(userId!)}
                    disabled={sendEmailMutation.isPending || !userId}
                  >
                    {sendEmailMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Cart Abandonment Email
                      </>
                    )}
                  </Button>
                  
                  {userData?.phoneNumber && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(`https://wa.me/${userData?.phoneNumber?.replace(/\D/g, '')}?text=Hi ${userData?.fullName || userData?.username}! We noticed you have some items in your TeeMeYou cart. Would you like help completing your order?`, '_blank')}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Cart Items ({cartData?.data?.cartItems?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cartData?.data?.cartItems?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No items in cart</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartData?.data?.cartItems?.map((item) => (
                      <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.product.imageUrl ? (
                            <img 
                              src={item.product.imageUrl} 
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{item.product.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                SKU: {item.product.slug}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm">Quantity: {item.quantity}</span>
                                <span className="text-sm">•</span>
                                <span className="text-sm">
                                  {formatCurrency(Number(item.itemPrice))} each
                                </span>
                              </div>
                              <Badge variant="secondary" className="mt-2">
                                {item.daysSinceAdded} days ago
                              </Badge>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-semibold">
                                {formatCurrency(item.itemTotal)}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => window.open(`/product/${item.product.slug}`, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View Product
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground mt-2">
                            Added on: {formatDate(item.createdAt.toString())}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}