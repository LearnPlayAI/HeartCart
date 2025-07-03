import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  UserCircle, 
  Package, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  User, 
  Eye, 
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Truck,
  Clock,
  CheckCircle,
  Package2,
  ArrowRight
} from 'lucide-react';

// User interface matching our camelCase schema
interface UserType {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  profilePicture: string | null;
  phoneNumber: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  province: string | null;
  country: string | null;
  isActive: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
}

// Order interface matching our camelCase schema
interface OrderType {
  id: number;
  userId: number;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingMethod: string;
  shippingCost: number;
  paymentMethod: string;
  paymentStatus: string;
  subtotalAmount: number;
  totalAmount: number;
  customerNotes: string | null;
  adminNotes: string | null;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  items?: OrderItemType[];
}

// Order item interface
interface OrderItemType {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  productSku: string;
  productImageUrl: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedAttributes: Record<string, string> | null;
  attributeDisplayText: string | null;
  createdAt: string;
}

// Profile form schema
const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phoneNumber: z.string().min(10, 'Please enter a valid phone number'),
  address: z.string().min(5, 'Please enter your full address'),
  city: z.string().min(2, 'Please enter your city'),
  postalCode: z.string().min(4, 'Please enter a valid postal code'),
  province: z.string().min(2, 'Please select your province'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'shipped':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'delivered':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Status icon mapping
const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'processing':
      return <Package2 className="h-4 w-4" />;
    case 'shipped':
      return <Truck className="h-4 w-4" />;
    case 'delivered':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Package className="h-4 w-4" />;
  }
};

// Format date function
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const ProfilePage: React.FC = () => {
  // Check URL parameters to determine initial tab
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') === 'orders' ? 'orders' : 'profile';
  
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>(initialTab);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data
  const { 
    data: userResponse, 
    isLoading: isLoadingUser, 
    isError: isErrorUser 
  } = useQuery<{success: boolean; data: UserType}>({
    queryKey: ['/api/user'],
  });

  const user = userResponse?.success ? userResponse.data : null;

  // Fetch orders data
  const { 
    data: ordersResponse, 
    isLoading: isLoadingOrders 
  } = useQuery<{success: boolean; data: OrderType[]}>({
    queryKey: ['/api/orders'],
    enabled: !!user,
  });

  const orders = ordersResponse?.success ? ordersResponse.data : [];

  // Profile form setup
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      address: '',
      city: '',
      postalCode: '',
      province: '',
    },
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        address: user.address || '',
        city: user.city || '',
        postalCode: user.postalCode || '',
        province: user.province || '',
      });
    }
  }, [user, profileForm]);

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return apiRequest('PUT', '/api/user', data);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated successfully",
        description: "Your profile information has been saved.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      
      navigate('/');
    } catch (error) {
      toast({
        title: "Error logging out",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle profile form submission
  const onProfileSubmit = (data: ProfileFormValues) => {
    profileMutation.mutate(data);
  };

  // Loading state
  if (isLoadingUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF69B4]"></div>
        </div>
      </div>
    );
  }

  // Error state or not logged in
  if (isErrorUser || !user) {
    navigate('/auth');
    return null;
  }

  return (
    <>
      <Helmet>
        <title>My Account - TEE ME YOU</title>
        <meta name="description" content="Manage your account, view orders, and update your profile at TEE ME YOU." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Account</h1>
          <p className="text-gray-600">Manage your profile and view your orders</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardContent className="p-6">
                {/* User Avatar & Info */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF69B4] to-[#FF1493] flex items-center justify-center mx-auto mb-3">
                    <UserCircle className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg">{user.fullName || user.username}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <Badge variant="secondary" className="mt-2">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>

                <Separator className="mb-6" />

                {/* Navigation */}
                <div className="space-y-2">
                  <Button
                    variant={activeTab === 'profile' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('profile')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </Button>
                  <Button
                    variant={activeTab === 'orders' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('orders')}
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    My Orders
                    {orders.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {orders.length}
                      </Badge>
                    )}
                  </Button>
                </div>

                <Separator className="my-6" />

                {/* Logout Button */}
                <Button 
                  variant="outline" 
                  className="w-full text-gray-600"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5" />
                    Profile Settings
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and shipping details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="0123456789" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="province"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Province</FormLabel>
                              <FormControl>
                                <Input placeholder="Gauteng" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={profileForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main Street" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="Johannesburg" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Postal Code</FormLabel>
                              <FormControl>
                                <Input placeholder="2000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button 
                          type="submit" 
                          disabled={profileMutation.isPending}
                          className="bg-[#FF69B4] hover:bg-[#FF1493]"
                        >
                          {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="mr-2 h-5 w-5" />
                    My Orders
                  </CardTitle>
                  <CardDescription>
                    View and track your order history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingOrders ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-24 bg-gray-100 rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : orders && orders.length > 0 ? (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <Card key={order.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              {/* Order Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-lg">#{order.orderNumber}</h3>
                                  <Badge className={`border ${getStatusColor(order.status)}`}>
                                    {getStatusIcon(order.status)}
                                    <span className="ml-1 capitalize">{order.status}</span>
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    {formatDate(order.createdAt)}
                                  </div>
                                  <div className="flex items-center">
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    {order.paymentMethod}
                                  </div>
                                  <div className="flex items-center">
                                    <Truck className="h-4 w-4 mr-2" />
                                    {order.shippingMethod}
                                  </div>
                                </div>

                                {/* Order Items Preview */}
                                {order.items && order.items.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-sm text-gray-600 mb-2">
                                      {order.items.length} item{order.items.length > 1 ? 's' : ''}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {order.items.slice(0, 3).map((item) => (
                                        <div key={item.id} className="flex items-center bg-gray-50 rounded-md px-2 py-1 text-xs">
                                          <span>{item.productName}</span>
                                          <span className="ml-1 text-gray-500">×{item.quantity}</span>
                                        </div>
                                      ))}
                                      {order.items.length > 3 && (
                                        <div className="bg-gray-50 rounded-md px-2 py-1 text-xs text-gray-500">
                                          +{order.items.length - 3} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Order Total & Actions */}
                              <div className="flex flex-col lg:items-end gap-3">
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">Total</p>
                                  <p className="text-xl font-bold text-[#FF69B4]">
                                    {formatCurrency(order.totalAmount)}
                                  </p>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-[#FF69B4] border-[#FF69B4] hover:bg-[#FF69B4] hover:text-white"
                                  onClick={() => navigate(`/order/${order.id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                  <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Package className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        You haven't placed any orders yet. Start shopping to place your first order!
                      </p>
                      <Button 
                        onClick={() => navigate('/')}
                        className="bg-[#FF69B4] hover:bg-[#FF1493]"
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Start Shopping
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;