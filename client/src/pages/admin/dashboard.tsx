import { AdminLayout } from "@/components/admin/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShoppingCart, Users, BarChart, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useDateFormat } from "@/hooks/use-date-format";

/**
 * Admin Dashboard Overview Cards
 */
function DashboardCards() {
  // Fetch order stats
  const { data: orderStats, isLoading: isLoadingOrders } = useQuery<{
    total: number;
    pending: number;
    completed: number;
    revenue: number;
  }>({
    queryKey: ["/api/admin/stats/orders"],
    queryFn: async () => {
      // Use dummy data for now, will be replaced with actual API call
      return {
        total: 126,
        pending: 8,
        completed: 118,
        revenue: 43280.50
      };
    },
  });

  // Fetch customer stats
  const { data: customerStats, isLoading: isLoadingCustomers } = useQuery<{
    total: number;
    newThisMonth: number;
  }>({
    queryKey: ["/api/admin/stats/customers"],
    queryFn: async () => {
      // Use dummy data for now, will be replaced with actual API call
      return {
        total: 853,
        newThisMonth: 48
      };
    },
  });

  // Fetch product stats
  const { data: productStats, isLoading: isLoadingProducts } = useQuery<{
    total: number;
    availableToOrder: number;
  }>({
    queryKey: ["/api/admin/stats/products"],
    queryFn: async () => {
      // Use dummy data for now, will be replaced with actual API call
      return {
        total: 208,
        availableToOrder: 208
      };
    },
  });

  if (isLoadingOrders || isLoadingCustomers || isLoadingProducts) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardTitle>
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold h-7 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="text-xs text-muted-foreground h-3 bg-gray-200 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Revenue",
      value: formatCurrency(orderStats?.revenue || 0),
      description: `From ${orderStats?.total || 0} orders`,
      icon: DollarSign,
      iconColor: "text-green-500",
      iconBg: "bg-green-100",
    },
    {
      title: "Orders",
      value: orderStats?.total || 0,
      description: `${orderStats?.pending || 0} pending orders`,
      icon: ShoppingCart,
      iconColor: "text-pink-500",
      iconBg: "bg-pink-100",
    },
    {
      title: "Customers",
      value: customerStats?.total || 0,
      description: `${customerStats?.newThisMonth || 0} new this month`,
      icon: Users,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-100",
    },
    {
      title: "Products",
      value: productStats?.total || 0,
      description: `${productStats?.availableToOrder || 0} available to order`,
      icon: BarChart,
      iconColor: "text-purple-500",
      iconBg: "bg-purple-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-full ${card.iconBg}`}>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
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
  const { data: recentOrders, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/orders/recent"],
    queryFn: async () => {
      // Use dummy data for now, will be replaced with actual API call
      return [
        {
          id: 8743,
          customer: "John Doe",
          status: "Processing",
          total: 238.50,
          date: "2025-05-05T14:23:00Z",
        },
        {
          id: 8742,
          customer: "Alice Smith",
          status: "Shipped",
          total: 129.99,
          date: "2025-05-05T11:45:00Z",
        },
        {
          id: 8741,
          customer: "Bob Johnson",
          status: "Delivered",
          total: 547.20,
          date: "2025-05-04T16:30:00Z",
        },
        {
          id: 8740,
          customer: "Emma Wilson",
          status: "Delivered",
          total: 89.99,
          date: "2025-05-04T10:15:00Z",
        },
        {
          id: 8739,
          customer: "Michael Brown",
          status: "Delivered",
          total: 325.75,
          date: "2025-05-03T15:40:00Z",
        },
      ];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="px-4 py-3 font-medium bg-muted/50">
          <div className="grid grid-cols-5 gap-4">
            <div>Order ID</div>
            <div>Customer</div>
            <div>Status</div>
            <div>Date</div>
            <div className="text-right">Amount</div>
          </div>
        </div>
        <div className="divide-y">
          {recentOrders?.map((order) => (
            <div key={order.id} className="px-4 py-3">
              <div className="grid grid-cols-5 gap-4">
                <div className="font-medium">#{order.id}</div>
                <div>{order.customer}</div>
                <div>
                  <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${order.status === 'Processing' ? 'bg-blue-100 text-blue-800' : 
                      order.status === 'Shipped' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'}
                  `}>
                    {order.status}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {new Date(order.date).toLocaleDateString()}
                </div>
                <div className="text-right font-medium">
                  {formatCurrency(order.total)}
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
  const { data: topProducts, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/products/top"],
    queryFn: async () => {
      // Use dummy data for now, will be replaced with actual API call
      return [
        {
          name: "Samsung Galaxy S21",
          category: "Electronics",
          sales: 48,
          revenue: 38352.00,
        },
        {
          name: "Wireless Earbuds",
          category: "Electronics",
          sales: 64,
          revenue: 5116.80,
        },
        {
          name: "Casual Denim Jacket",
          category: "Fashion",
          sales: 37,
          revenue: 2589.63,
        },
        {
          name: "Ceramic Coffee Mug",
          category: "Home & Kitchen",
          sales: 89,
          revenue: 1424.00,
        },
        {
          name: "Fitness Tracker Watch",
          category: "Electronics",
          sales: 32,
          revenue: 3839.68,
        },
      ];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="px-4 py-3 font-medium bg-muted/50">
          <div className="grid grid-cols-4 gap-4">
            <div>Product</div>
            <div>Category</div>
            <div className="text-right">Units Sold</div>
            <div className="text-right">Revenue</div>
          </div>
        </div>
        <div className="divide-y">
          {topProducts?.map((product, index) => (
            <div key={index} className="px-4 py-3">
              <div className="grid grid-cols-4 gap-4">
                <div className="font-medium">{product.name}</div>
                <div>{product.category}</div>
                <div className="text-right">{product.sales}</div>
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
      <div className="flex flex-col space-y-6">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your store's performance and recent activity
          </p>
        </div>

        {/* Stats Overview Cards */}
        <DashboardCards />
        
        {/* Recent Orders & Top Products */}
        <Tabs defaultValue="recent-orders" className="mt-6">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="recent-orders">Recent Orders</TabsTrigger>
            <TabsTrigger value="top-products">Top Products</TabsTrigger>
          </TabsList>
          <TabsContent value="recent-orders" className="mt-6">
            <RecentOrders />
          </TabsContent>
          <TabsContent value="top-products" className="mt-6">
            <TopProducts />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}