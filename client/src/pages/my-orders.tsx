import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { formatCurrency } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Package, 
  Search,
  Filter,
  Calendar,
  CreditCard,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Eye,
  Package2
} from 'lucide-react';

// Interfaces matching our database schema
interface UserType {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  role: string;
}

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
  eftPop: string | null;
}

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

// Status color and icon mappings
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

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'processing':
      return <Package className="h-4 w-4" />;
    case 'shipped':
      return <Truck className="h-4 w-4" />;
    case 'delivered':
      return <CheckCircle className="h-4 w-4" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Package2 className="h-4 w-4" />;
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const MyOrdersPage: React.FC = () => {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch user data
  const { data: userResponse } = useQuery<{success: boolean; data: UserType}>({
    queryKey: ['/api/user'],
  });

  const user = userResponse?.success ? userResponse.data : null;

  // Fetch orders data
  const { 
    data: ordersResponse, 
    isLoading: isLoadingOrders,
    isError: isErrorOrders 
  } = useQuery<{success: boolean; data: OrderType[]}>({
    queryKey: ['/api/orders'],
    enabled: !!user,
  });

  const orders = ordersResponse?.success ? ordersResponse.data : [];

  // Redirect if not logged in
  useEffect(() => {
    if (!user && userResponse) {
      navigate('/auth');
    }
  }, [user, userResponse, navigate]);

  // Filter and sort orders
  const filteredOrders = React.useMemo(() => {
    let filtered = orders.filter(order => {
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.status.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter;
      
      // Date range filtering
      const orderDate = new Date(order.createdAt);
      const matchesDateRange = (() => {
        if (!dateFrom && !dateTo) return true;
        
        if (dateFrom && !dateTo) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0); // Start of the day
          return orderDate >= fromDate;
        }
        
        if (!dateFrom && dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999); // End of the day
          return orderDate <= toDate;
        }
        
        if (dateFrom && dateTo) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0); // Start of the day
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999); // End of the day
          return orderDate >= fromDate && orderDate <= toDate;
        }
        
        return true;
      })();
      
      return matchesSearch && matchesStatus && matchesDateRange;
    });

    // Sort orders
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount-high':
          return b.totalAmount - a.totalAmount;
        case 'amount-low':
          return a.totalAmount - b.totalAmount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [orders, searchTerm, statusFilter, sortBy, dateFrom, dateTo]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your orders.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Orders - TEE ME YOU</title>
        <meta name="description" content="View and track your order history at TEE ME YOU." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">

        {/* Order Summary */}
        {filteredOrders.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{filteredOrders.length}</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0))}
                  </div>
                  <div className="text-sm text-gray-600">Total Spent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredOrders.filter(order => order.status === 'delivered').length}
                  </div>
                  <div className="text-sm text-gray-600">Delivered</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {filteredOrders.filter(order => ['pending', 'processing', 'shipped'].includes(order.status)).length}
                  </div>
                  <div className="text-sm text-gray-600">In Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Filter className="h-5 w-5 mr-2" />
              Filter Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="relative md:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Date From */}
              <div>
                <Input
                  type="date"
                  placeholder="From date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Date To */}
              <div>
                <Input
                  type="date"
                  placeholder="To date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="amount-high">Highest Amount</SelectItem>
                  <SelectItem value="amount-low">Lowest Amount</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSortBy('newest');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
            
            {/* Quick Date Range Buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                  setDateFrom(sevenDaysAgo.toISOString().split('T')[0]);
                  setDateTo(today.toISOString().split('T')[0]);
                }}
              >
                Last 7 Days
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                  setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
                  setDateTo(today.toISOString().split('T')[0]);
                }}
              >
                Last 30 Days
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                  setDateFrom(ninetyDaysAgo.toISOString().split('T')[0]);
                  setDateTo(today.toISOString().split('T')[0]);
                }}
              >
                Last 3 Months
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
                  setDateFrom(oneYearAgo.toISOString().split('T')[0]);
                  setDateTo(today.toISOString().split('T')[0]);
                }}
              >
                Last Year
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {isLoadingOrders ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="flex justify-between">
                      <div className="h-6 bg-gray-200 rounded w-32"></div>
                      <div className="h-6 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-64"></div>
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isErrorOrders ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-red-600">Error loading orders. Please try again.</p>
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No orders match your filters' : 'No orders yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Start shopping to see your orders here!'
                }
              </p>
              <Button onClick={() => navigate('/products')} className="bg-[#FF69B4] hover:bg-[#FF1493]">
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    {/* Order Info */}
                    <div className="flex-1 mb-4 lg:mb-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">Order #{order.orderNumber}</h3>
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(order.status)} flex items-center gap-1`}
                        >
                          {getStatusIcon(order.status)}
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Ordered: {formatDate(order.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4" />
                          <span>Payment: {order.paymentMethod}</span>
                        </div>
                        {order.trackingNumber && (
                          <div className="flex items-center gap-1">
                            <Truck className="h-4 w-4" />
                            <span>Tracking: {order.trackingNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="flex flex-col lg:items-end lg:text-right">
                      <div className="text-2xl font-bold text-gray-900 mb-2">
                        {formatCurrency(order.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        <div>Subtotal: {formatCurrency(order.subtotalAmount)}</div>
                        <div>Shipping: {formatCurrency(order.shippingCost)}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/order/${order.id}`)}
                          className="bg-[#ff68b4] text-[#ffffff] border-[#ff68b4] hover:bg-[#ff1493] hover:text-[#ffffff]"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      <strong>Shipping to:</strong> {order.shippingAddress}, {order.shippingCity}, {order.shippingPostalCode}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}


      </div>
    </>
  );
};

export default MyOrdersPage;