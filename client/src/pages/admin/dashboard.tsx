import { AdminLayout } from "@/components/admin/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Loader2, 
  ShoppingCart, 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  Truck,
  BarChart3,
  Eye,
  Calendar
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useDateFormat } from "@/hooks/use-date-format";

// Define interfaces for our data
interface Order {
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
  customerNotes?: string;
  adminNotes?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  eftPop?: string;
  orderItems: any[];
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

interface Product {
  id: number;
  name: string;
  isActive: boolean;
  stockLevel: number;
  regularPrice: number;
  onSale: boolean;
  salePrice?: number;
  createdAt: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  role: string;
}

/**
 * Financial Statistics Component
 */
function FinancialStats() {
  const { data: response, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["/api/admin/orders"],
  });

  if (isLoadingOrders) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const orders = response?.data || [];
  if (!Array.isArray(orders) || orders.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(0)}</div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">No orders yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payments Received</CardTitle>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(0)}</div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">No confirmed payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payments Pending</CardTitle>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(0)}</div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">No pending payments</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate financial statistics
  const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
  const paymentsReceived = orders
    .filter((order: any) => order.status === "confirmed")
    .reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
  const paymentsPending = orders
    .filter((order: any) => order.status === "pending")
    .reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">All-time revenue from {orders.length} orders</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Payments Received</CardTitle>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(paymentsReceived)}</div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Confirmed payments ({orders.filter(o => o.status === "confirmed").length} orders)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Payments Pending</CardTitle>
          <div className="text-2xl font-bold text-yellow-600">{formatCurrency(paymentsPending)}</div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Awaiting payment ({orders.filter(o => o.status === "pending").length} orders)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Order Status Overview Component
 */
function OrderStatusOverview() {
  const { data: response, isLoading } = useQuery({
    queryKey: ["/api/admin/orders"],
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-8"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const orders = response?.data || [];
  if (!Array.isArray(orders)) return null;

  const stats = {
    total: orders.length,
    pending: orders.filter((order: any) => order.status === "pending").length,
    confirmed: orders.filter((order: any) => order.status === "confirmed").length,
    processing: orders.filter((order: any) => order.status === "processing").length,
    shipped: orders.filter((order: any) => order.status === "shipped").length,
    delivered: orders.filter((order: any) => order.status === "delivered").length,
  };

  const statusCards = [
    {
      label: "Total Orders",
      value: stats.total,
      icon: ShoppingCart,
      color: "text-gray-600",
      bgColor: "bg-gray-100"
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100"
    },
    {
      label: "Confirmed",
      value: stats.confirmed,
      icon: CheckCircle,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      label: "Processing",
      value: stats.processing,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      label: "Shipped",
      value: stats.shipped,
      icon: Truck,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      label: "Delivered",
      value: stats.delivered,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-6">
      {statusCards.map((card, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className={`p-1 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Business Overview Component
 */
function BusinessOverview() {
  const { data: ordersResponse, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["/api/admin/orders"],
  });

  const { data: productsResponse, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["/api/admin/products"],
  });

  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  if (isLoadingOrders || isLoadingProducts || isLoadingUsers) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const orders = ordersResponse?.data || [];
  const products = productsResponse?.data || [];
  const users = usersResponse?.data || [];

  if (!Array.isArray(orders) || !Array.isArray(products) || !Array.isArray(users)) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-muted-foreground">No Data</div>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate current month stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthOrders = orders.filter((order: any) => {
    const orderDate = new Date(order.createdAt);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  });

  const thisMonthUsers = users.filter((user: any) => {
    const userDate = new Date(user.createdAt);
    return userDate.getMonth() === currentMonth && userDate.getFullYear() === currentYear;
  });

  const activeProducts = products.filter((product: any) => product.isActive);
  const lowStockProducts = products.filter((product: any) => product.stockLevel <= 10);

  const businessCards = [
    {
      title: "Total Customers",
      value: users?.length || 0,
      description: `${thisMonthUsers.length} new this month`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Active Products",
      value: activeProducts.length,
      description: `${products?.length || 0} total products`,
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Monthly Orders",
      value: thisMonthOrders.length,
      description: `${orders?.length || 0} total orders`,
      icon: BarChart3,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "Low Stock Items",
      value: lowStockProducts.length,
      description: "Products with ≤10 units",
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100"
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {businessCards.map((card, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Recent Orders Component
 */
function RecentOrders() {
  const { formatShortDate } = useDateFormat();
  const { data: response, isLoading } = useQuery({
    queryKey: ["/api/admin/orders"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const orders = response?.data || [];
  if (!Array.isArray(orders) || orders.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No recent orders found</p>
      </div>
    );
  }

  // Get the 5 most recent orders
  const recentOrders = orders
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getStatusBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'shipped':
        return 'bg-orange-100 text-orange-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="px-4 py-3 font-medium bg-muted/50">
          <div className="grid grid-cols-5 gap-4">
            <div>Order Number</div>
            <div>Customer</div>
            <div>Status</div>
            <div>Date</div>
            <div className="text-right">Amount</div>
          </div>
        </div>
        <div className="divide-y">
          {recentOrders.map((order) => (
            <div key={order.id} className="px-4 py-3">
              <div className="grid grid-cols-5 gap-4">
                <div className="font-medium">{order.orderNumber}</div>
                <div>{order.customerName}</div>
                <div>
                  <Badge className={`${getStatusBadgeStyle(order.status)} border-0`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  {formatShortDate(order.createdAt)}
                </div>
                <div className="text-right font-medium">
                  {formatCurrency(order.totalAmount)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Top Products Component
 */
function TopProducts() {
  const { data: orders, isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  if (isLoadingOrders || isLoadingProducts) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!orders || !products || orders.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No order data available to calculate top products</p>
      </div>
    );
  }

  // Calculate product sales from order items
  const productSales = new Map<number, { name: string; quantity: number; revenue: number }>();
  
  orders.forEach(order => {
    order.orderItems.forEach((item: any) => {
      const productId = item.productId;
      const existing = productSales.get(productId);
      
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice;
      } else {
        productSales.set(productId, {
          name: item.productName || 'Unknown Product',
          quantity: item.quantity,
          revenue: item.totalPrice
        });
      }
    });
  });

  // Convert to array and sort by revenue
  const topProducts = Array.from(productSales.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  if (topProducts.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No product sales data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="px-4 py-3 font-medium bg-muted/50">
          <div className="grid grid-cols-3 gap-4">
            <div>Product</div>
            <div className="text-right">Units Sold</div>
            <div className="text-right">Revenue</div>
          </div>
        </div>
        <div className="divide-y">
          {topProducts.map((product, index) => (
            <div key={index} className="px-4 py-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="font-medium">{product.name}</div>
                <div className="text-right">{product.quantity}</div>
                <div className="text-right font-medium">
                  {formatCurrency(product.revenue)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Admin Dashboard Page
 */
export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="flex flex-col space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time overview of your store's performance and key metrics
          </p>
        </div>

        {/* Financial Statistics */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Financial Overview</h2>
          <FinancialStats />
        </div>

        {/* Order Status Overview */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Order Status Breakdown</h2>
          <OrderStatusOverview />
        </div>

        {/* Business Overview */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Business Metrics</h2>
          <BusinessOverview />
        </div>
        
        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <Tabs defaultValue="recent-orders" className="w-full">
            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="recent-orders">Recent Orders</TabsTrigger>
              <TabsTrigger value="top-products">Top Products</TabsTrigger>
            </TabsList>
            <TabsContent value="recent-orders" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Latest Orders</CardTitle>
                  <CardDescription>
                    Most recent customer orders and their status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentOrders />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="top-products" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Best Selling Products</CardTitle>
                  <CardDescription>
                    Products ranked by revenue generated
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TopProducts />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminLayout>
  );
}