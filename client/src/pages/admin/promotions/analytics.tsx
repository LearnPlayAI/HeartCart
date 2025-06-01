import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  DollarSign,
  Eye,
  Download,
  Calendar,
  Filter
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';

interface PromotionAnalytics {
  id: number;
  promotionName: string;
  status: string;
  startDate: string;
  endDate: string;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  conversionRate: number;
  avgOrderValue: number;
  newCustomers: number;
  returningCustomers: number;
  topProducts: Array<{
    id: number;
    name: string;
    sales: number;
    revenue: number;
  }>;
  dailyMetrics: Array<{
    date: string;
    orders: number;
    revenue: number;
    visitors: number;
  }>;
  geographicData: Array<{
    province: string;
    orders: number;
    revenue: number;
  }>;
}

interface AnalyticsFilters {
  promotionId?: number;
  dateRange: {
    from: Date;
    to: Date;
  };
  compareWith?: {
    from: Date;
    to: Date;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function PromotionAnalytics() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date()
    }
  });

  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch promotions for filter dropdown
  const { data: promotions } = useQuery({
    queryKey: ['/api/promotions'],
    select: (data) => data.data || []
  });

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/promotions/analytics', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: filters.dateRange.from.toISOString(),
        to: filters.dateRange.to.toISOString(),
        ...(filters.promotionId && { promotionId: filters.promotionId.toString() }),
        ...(filters.compareWith && {
          compareFrom: filters.compareWith.from.toISOString(),
          compareTo: filters.compareWith.to.toISOString()
        })
      });
      
      const response = await fetch(`/api/promotions/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    }
  });

  const handleExportReport = async () => {
    const params = new URLSearchParams({
      from: filters.dateRange.from.toISOString(),
      to: filters.dateRange.to.toISOString(),
      ...(filters.promotionId && { promotionId: filters.promotionId.toString() }),
      format: 'csv'
    });
    
    const response = await fetch(`/api/promotions/analytics/export?${params}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promotion-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const analyticsData = analytics?.data as PromotionAnalytics[] || [];
  const summary = analytics?.summary || {
    totalPromotions: 0,
    totalRevenue: 0,
    totalOrders: 0,
    avgConversionRate: 0,
    topPerformingPromotion: null
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Promotion Analytics</h1>
          <p className="text-muted-foreground">Track performance and insights for your promotional campaigns</p>
        </div>
        <Button onClick={handleExportReport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Promotion</label>
              <Select
                value={filters.promotionId?.toString() || 'all'}
                onValueChange={(value) => 
                  setFilters(prev => ({
                    ...prev,
                    promotionId: value === 'all' ? undefined : parseInt(value)
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Promotions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Promotions</SelectItem>
                  {promotions?.map((promo: any) => (
                    <SelectItem key={promo.id} value={promo.id.toString()}>
                      {promo.promotionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <DatePickerWithRange
                date={filters.dateRange}
                onDateChange={(range) => 
                  setFilters(prev => ({ ...prev, dateRange: range }))
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Quick Filters</label>
              <Select
                onValueChange={(value) => {
                  const now = new Date();
                  let from: Date;
                  switch (value) {
                    case '7d':
                      from = subDays(now, 7);
                      break;
                    case '30d':
                      from = subDays(now, 30);
                      break;
                    case '90d':
                      from = subDays(now, 90);
                      break;
                    case '6m':
                      from = subMonths(now, 6);
                      break;
                    case '1y':
                      from = subMonths(now, 12);
                      break;
                    default:
                      return;
                  }
                  setFilters(prev => ({
                    ...prev,
                    dateRange: { from, to: now }
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Quick Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="6m">Last 6 months</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{summary.totalRevenue?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +8% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgConversionRate?.toFixed(1) || '0'}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 inline mr-1" />
              -2% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Promotions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalPromotions || '0'}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData[0]?.dailyMetrics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`R${value}`, 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Order Volume */}
            <Card>
              <CardHeader>
                <CardTitle>Order Volume</CardTitle>
                <CardDescription>Daily orders over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData[0]?.dailyMetrics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Promotions */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Promotions</CardTitle>
              <CardDescription>Ranked by revenue generated</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.slice(0, 5).map((promo, index) => (
                  <div key={promo.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div>
                        <h4 className="font-semibold">{promo.promotionName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {promo.totalOrders} orders • {promo.totalProducts} products
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">R{promo.totalRevenue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{promo.conversionRate.toFixed(1)}% conversion</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Rates */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Rates by Promotion</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="promotionName" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, 'Conversion Rate']} />
                    <Bar dataKey="conversionRate" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Average Order Value */}
            <Card>
              <CardHeader>
                <CardTitle>Average Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="promotionName" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`R${value}`, 'AOV']} />
                    <Bar dataKey="avgOrderValue" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* New vs Returning Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Acquisition</CardTitle>
                <CardDescription>New vs returning customers</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'New Customers', value: analyticsData.reduce((sum, p) => sum + p.newCustomers, 0) },
                        { name: 'Returning Customers', value: analyticsData.reduce((sum, p) => sum + p.returningCustomers, 0) }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[0, 1].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Customer Breakdown by Promotion */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Breakdown</CardTitle>
                <CardDescription>By promotion</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="promotionName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="newCustomers" stackId="a" fill="#8884d8" name="New" />
                    <Bar dataKey="returningCustomers" stackId="a" fill="#82ca9d" name="Returning" />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="geography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Performance</CardTitle>
              <CardDescription>Revenue by province</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData[0]?.geographicData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="province" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`R${value}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}