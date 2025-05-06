import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/layout/admin-layout';
import {
  BarChart3,
  Package,
  ShoppingBag,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';

// Stats cards data
const statsData = [
  {
    title: "Total Sales",
    value: formatCurrency(24567.89),
    description: "7% increase from last month",
    icon: <BarChart3 className="h-8 w-8 text-pink-500" />,
    trend: "up"
  },
  {
    title: "Total Orders",
    value: "156",
    description: "5% increase from last month",
    icon: <ShoppingBag className="h-8 w-8 text-pink-500" />,
    trend: "up"
  },
  {
    title: "Total Products",
    value: "342",
    description: "12 new products this month",
    icon: <Package className="h-8 w-8 text-pink-500" />,
    trend: "up"
  },
  {
    title: "Total Customers",
    value: "1,245",
    description: "9% increase from last month",
    icon: <Users className="h-8 w-8 text-pink-500" />,
    trend: "up"
  }
];

// Recent orders data
const recentOrders = [
  { id: "#ORD-12345", customer: "John Smith", date: "2023-04-20", status: "Delivered", total: 129.99 },
  { id: "#ORD-12346", customer: "Sarah Johnson", date: "2023-04-20", status: "Processing", total: 79.99 },
  { id: "#ORD-12347", customer: "Michael Brown", date: "2023-04-19", status: "Pending", total: 199.99 },
  { id: "#ORD-12348", customer: "Emily Davis", date: "2023-04-19", status: "Delivered", total: 59.99 },
  { id: "#ORD-12349", customer: "Robert Wilson", date: "2023-04-18", status: "Cancelled", total: 149.99 }
];

// Stock alerts
const lowStockItems = [
  { id: 1, name: "Wireless Earbuds", stock: 3, threshold: 5 },
  { id: 2, name: "Phone Case - Pink", stock: 2, threshold: 10 },
  { id: 3, name: "Power Bank 10000mAh", stock: 4, threshold: 8 },
  { id: 4, name: "Smart Watch Band", stock: 1, threshold: 5 }
];

function DashboardPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-5">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsData.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  {stat.trend === 'up' ? 
                    <TrendingUp className="mr-1 h-4 w-4 text-green-500" /> : 
                    <TrendingDown className="mr-1 h-4 w-4 text-red-500" />
                  }
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Recent Orders</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Alerts</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
                <CardDescription>
                  Monthly sales performance
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="mx-auto h-16 w-16 opacity-50" />
                  <p className="mt-2">Sales chart will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                  Recent customer orders and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 text-left">Order ID</th>
                        <th className="py-3 text-left">Customer</th>
                        <th className="py-3 text-left">Date</th>
                        <th className="py-3 text-left">Status</th>
                        <th className="py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order, index) => (
                        <tr 
                          key={index} 
                          className="border-b hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 text-left font-medium">{order.id}</td>
                          <td className="py-3 text-left">{order.customer}</td>
                          <td className="py-3 text-left">{order.date}</td>
                          <td className="py-3 text-left">
                            <div className="flex items-center">
                              {order.status === 'Delivered' && (
                                <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
                              )}
                              {order.status === 'Processing' && (
                                <Clock className="mr-1 h-4 w-4 text-blue-500" />
                              )}
                              {order.status === 'Pending' && (
                                <Clock className="mr-1 h-4 w-4 text-yellow-500" />
                              )}
                              {order.status === 'Cancelled' && (
                                <AlertCircle className="mr-1 h-4 w-4 text-red-500" />
                              )}
                              {order.status}
                            </div>
                          </td>
                          <td className="py-3 text-right">{formatCurrency(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>
                  Products that are running low on inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <AlertCircle className="mr-1 h-3 w-3 text-red-500" />
                          <span>Only {item.stock} left</span>
                        </div>
                      </div>
                      <div className="flex flex-col w-32">
                        <div className="flex justify-between mb-1 text-xs">
                          <span>{item.stock}</span>
                          <span>{item.threshold}</span>
                        </div>
                        <Progress value={(item.stock / item.threshold) * 100} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

export default DashboardPage;