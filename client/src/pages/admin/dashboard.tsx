import { useMemo } from "react";
import { AdminLayout } from "@/components/admin/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  Loader2, 
  ShoppingCart, 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Truck,
  BarChart3,
  Eye,
  Calendar,
  Edit
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
 * Top Products Component - Uses same enrichment logic as pricing page
 */
function TopProducts() {
  const [, setLocation] = useLocation();

  // Handle edit product - EXACT same function as pricing page
  const handleEditProduct = async (productId: number) => {
    try {
      // Set flag to indicate we came from pricing page
      sessionStorage.setItem('cameFromPricing', 'true');
      
      // Call API to create or reuse existing draft
      const response = await fetch(`/api/product-drafts/create-from-published/${productId}`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error("Failed to create product draft");
        return;
      }
      
      // Get the draft data
      const result = await response.json();
      
      if (result.success && result.data) {
        // Navigate to product wizard with the draft ID
        setLocation(`/admin/product-wizard/${result.data.draftId}`);
      } else {
        console.error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error creating product draft:", error);
    }
  };

  // Fetch data with same queries as pricing page
  const { data: productsResponse, isLoading: isProductsLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  const { data: catalogsResponse } = useQuery({
    queryKey: ['/api/catalogs'],
    queryFn: async () => {
      const response = await fetch('/api/catalogs');
      if (!response.ok) throw new Error('Failed to fetch catalogs');
      return response.json();
    }
  });

  const { data: ordersResponse } = useQuery({
    queryKey: ['/api/admin/orders'],
    queryFn: async () => {
      const response = await fetch('/api/admin/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    }
  });

  const products = productsResponse?.data || [];
  const categories = categoriesResponse?.data || [];
  const catalogs = catalogsResponse?.data || [];
  const orders = ordersResponse?.data || [];

  // Calculate derived pricing data - EXACT same logic as pricing page
  const enrichedProducts = useMemo(() => {
    if (!products || products.length === 0) {
      return [];
    }

    return products.map((product: any) => {
      const category = categories.find((cat: any) => cat.id === product.categoryId);
      const catalog = catalogs.find((cat: any) => cat.id === product.catalogId);
      
      // Calculate TMY markup percentage (profit margin between cost and sale price)
      const effectivePrice = product.salePrice || product.price;
      const tmyMarkup = product.costPrice > 0 
        ? ((effectivePrice - product.costPrice) / product.costPrice * 100) 
        : 0;
      
      // Calculate customer discount percentage (discount between regular and sale price)
      const customerDiscount = product.salePrice && product.price > 0
        ? ((product.price - product.salePrice) / product.price * 100)
        : 0;

      return {
        ...product,
        categoryName: category?.name || 'Uncategorized',
        parentCategoryName: category?.parent?.name || 'No Parent',
        childCategoryName: category?.name || 'Uncategorized',
        catalogName: catalog?.name || 'No Catalog',
        tmyMarkup: Number(tmyMarkup.toFixed(2)),
        customerDiscount: Number(customerDiscount.toFixed(2)),
        effectivePrice
      };
    });
  }, [products, categories, catalogs]);

  // Calculate sales data from orders - ONLY PAID ORDERS (exclude pending)
  const salesData = useMemo(() => {
    const productSales: { [key: string]: { quantity: number; revenue: number } } = {};

    // Only include orders that are paid for (exclude pending orders)
    orders
      .filter((order: Order) => order.status !== 'pending')
      .forEach((order: Order) => {
        if (order.orderItems && Array.isArray(order.orderItems)) {
          order.orderItems.forEach((item: any) => {
            const productName = item.productName || item.name || 'Unknown Product';
            const quantity = item.quantity || 0;
            const price = item.price || item.unitPrice || 0;

            if (!productSales[productName]) {
              productSales[productName] = { quantity: 0, revenue: 0 };
            }

            productSales[productName].quantity += quantity;
            productSales[productName].revenue += (quantity * price);
          });
        }
      });

    return productSales;
  }, [orders]);

  // Get top 5 products by sales quantity
  const topProducts = useMemo(() => {
    if (Object.keys(salesData).length === 0 || enrichedProducts.length === 0) {
      // Fallback: show top products by price when no sales data
      return enrichedProducts
        .filter((p: any) => p.isActive !== false) // Show active products or products without isActive field
        .sort((a: any, b: any) => (b.salePrice || b.price || 0) - (a.salePrice || a.price || 0))
        .slice(0, 5);
    }

    // Get products with sales data, sorted by units sold
    const productsWithSales = enrichedProducts
      .filter((product: any) => salesData[product.name])
      .sort((a: any, b: any) => salesData[b.name].quantity - salesData[a.name].quantity)
      .slice(0, 5);
    
    // If no products have sales data, fall back to top products by price
    if (productsWithSales.length === 0) {
      return enrichedProducts
        .filter((p: any) => p.isActive !== false)
        .sort((a: any, b: any) => (b.salePrice || b.price || 0) - (a.salePrice || a.price || 0))
        .slice(0, 5);
    }
    
    return productsWithSales;
  }, [enrichedProducts, salesData]);

  if (isProductsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  if (topProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
        <p className="text-muted-foreground">No products available to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.keys(salesData).length === 0 && (
        <div className="text-sm text-muted-foreground mb-4">
          Products ranked by revenue generated
        </div>
      )}
      
      {/* Desktop Table - Using exact same structure as pricing page */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Units Sold</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">TMY Markup %</TableHead>
              <TableHead className="text-right">Cust Discount %</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topProducts.map((product: any) => {
              const productSales = salesData[product.name] || { quantity: 0, revenue: 0 };
              
              // Calculate revenue: units sold × item sell price
              const unitPrice = product.salePrice || product.price || 0;
              const calculatedRevenue = productSales.quantity * unitPrice;
              
              // Calculate profit: revenue - (items sold × cost price)
              const costPrice = product.costPrice || 0;
              const profit = calculatedRevenue - (productSales.quantity * costPrice);

              return (
                <TableRow key={product.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link 
                          href={`/admin/pricing?search=${encodeURIComponent(product.name)}`}
                          className="font-medium hover:text-blue-600 hover:underline transition-colors truncate block"
                        >
                          {product.name}
                        </Link>
                        <p className="text-sm text-muted-foreground truncate">
                          {product.supplier || 'No supplier'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right font-mono">{productSales.quantity}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(calculatedRevenue)}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={profit > 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(profit)}
                    </span>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {product.tmyMarkup > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-semibold ${
                        product.tmyMarkup > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {product.tmyMarkup}%
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    {product.customerDiscount > 0 ? (
                      <Badge className="font-mono bg-pink-500 hover:bg-pink-600 text-white">
                        {product.customerDiscount}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProduct(product.id)}
                      className="hover:bg-primary hover:text-primary-foreground"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards - Same as pricing page structure */}
      <div className="lg:hidden space-y-4">
        {topProducts.map((product: any) => {
          const productSales = salesData[product.name] || { quantity: 0, revenue: 0 };
          const unitPrice = product.salePrice || product.price || 0;
          const calculatedRevenue = productSales.quantity * unitPrice;
          const costPrice = product.costPrice || 0;
          const profit = calculatedRevenue - (productSales.quantity * costPrice);

          return (
            <Card key={product.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/admin/pricing?search=${encodeURIComponent(product.name)}`}
                      className="font-medium hover:text-blue-600 hover:underline transition-colors block truncate"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">{product.supplier || 'No supplier'}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Units Sold:</span>
                        <div className="font-mono">{productSales.quantity}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Revenue:</span>
                        <div className="font-mono">{formatCurrency(calculatedRevenue)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Profit:</span>
                        <div className={`font-mono ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(profit)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">TMY Markup:</span>
                        <div className={`font-semibold ${product.tmyMarkup > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.tmyMarkup}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      {product.customerDiscount > 0 && (
                        <Badge className="font-mono bg-pink-500 hover:bg-pink-600 text-white">
                          {product.customerDiscount}% Discount
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/admin/products/edit/${product.id}`}
                        className="ml-auto"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
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