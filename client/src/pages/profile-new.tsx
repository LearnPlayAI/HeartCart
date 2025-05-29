import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDateFormat } from '@/hooks/use-date-format';
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
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  UserIcon,
  Package, 
  LogOut, 
  Eye, 
  UserCircle, 
  ShoppingBag, 
  Settings 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Profile schema for form validation
const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const ProfilePage: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { formatShortDate } = useDateFormat();
  const [activeTab, setActiveTab] = useState('orders');
  
  // Get user profile if logged in
  const { 
    data: user, 
    isLoading: isLoadingUser, 
    isError: isErrorUser, 
    refetch: refetchUser 
  } = useQuery<UserType>({
    queryKey: ['/api/user'],
  });
  
  // Get orders if logged in
  const { 
    data: orders, 
    isLoading: isLoadingOrders 
  } = useQuery({
    queryKey: ['/api/orders'],
    enabled: !!user,
  });
  
  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      address: '',
      city: '',
      postalCode: '',
    },
  });
  
  // Update form values when user data is loaded
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        address: user.address || '',
        city: user.city || '',
        postalCode: user.postalCode || '',
      });
    }
  }, [user, profileForm]);
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      if (!user || !user.id) {
        throw new Error('User not found');
      }
      await apiRequest('PUT', `/api/users/${user.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
        duration: 3000,
      });
      refetchUser();
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: error instanceof Error ? error.message : "There was an error updating your profile. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    },
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/logout', {});
    },
    onSuccess: () => {
      toast({
        title: "Logout successful",
        description: "You have been logged out successfully.",
        duration: 3000,
      });
      // Navigate using router instead of forcing page reload
      navigate('/');
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "There was an error logging out. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    },
  });
  
  // Handle profile form submission
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // If loading user data
  if (isLoadingUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If user is not logged in, redirect to auth page
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
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-64">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center py-4">
                  <div className="w-24 h-24 rounded-full bg-[#FF69B4]/10 flex items-center justify-center mb-3">
                    <UserCircle className="h-16 w-16 text-[#FF69B4]" />
                  </div>
                  <h2 className="text-lg font-bold">{user.fullName || user.username}</h2>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                
                <div className="mt-4">
                  <Button
                    variant={activeTab === 'orders' ? 'default' : 'ghost'}
                    className="w-full justify-start mb-2 text-left"
                    onClick={() => setActiveTab('orders')}
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    My Orders
                  </Button>
                  <Button
                    variant={activeTab === 'profile' ? 'default' : 'ghost'}
                    className="w-full justify-start mb-2 text-left"
                    onClick={() => setActiveTab('profile')}
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile Settings
                  </Button>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4 text-gray-600"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'orders' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="mr-2 h-5 w-5" />
                    My Orders
                  </CardTitle>
                  <CardDescription>
                    View and track your order history.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingOrders ? (
                    <div className="animate-pulse space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded-md"></div>
                      ))}
                    </div>
                  ) : orders && orders.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>#{order.id}</TableCell>
                            <TableCell>
                              {formatShortDate(order.createdAt)}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.status === 'completed' 
                                  ? 'bg-green-100 text-green-700' 
                                  : order.status === 'processing'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-[#FF69B4]"
                                onClick={() => navigate(`/order/${order.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                      <p className="text-gray-500 mb-4">
                        You haven't placed any orders yet. Start shopping to place your first order!
                      </p>
                      <Button asChild>
                        <a href="/">Shop Now</a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5" />
                    Profile Settings
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and shipping details.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
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
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="you@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+27 12 345 6789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <Input placeholder="123 Main St" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="Cape Town" {...field} />
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
                                <Input placeholder="8001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="bg-[#FF69B4] hover:bg-[#FF1493] text-white"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </form>
                  </Form>
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