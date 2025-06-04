import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Heart, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Eye,
  Download,
  Calendar,
  Filter,
  Star,
  ShoppingCart
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface FavouritesAnalytics {
  totalFavourites: number;
  totalUsers: number;
  avgFavouritesPerUser: number;
  favoritesGrowthRate: number;
  topFavouritedProducts: Array<{
    id: number;
    name: string;
    favouriteCount: number;
    imageUrl: string;
    price: string;
  }>;
  favouritesByCategory: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  dailyFavourites: Array<{
    date: string;
    newFavourites: number;
    removedFavourites: number;
    netFavourites: number;
  }>;
  userEngagement: Array<{
    segment: string;
    userCount: number;
    avgFavourites: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function FavouritesAnalytics() {
  const [dateRange, setDateRange] = useState(30);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch favourites analytics data using actual API
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/analytics/favourites', dateRange],
    queryFn: () => apiRequest(`/api/analytics/favourites?days=${dateRange}`),
  });

  // Fetch popular products
  const { data: popularProducts } = useQuery({
    queryKey: ['/api/favourites/popular'],
    queryFn: () => apiRequest('/api/favourites/popular?limit=10'),
  });

  // Fetch interaction analytics
  const { data: interactionAnalytics } = useQuery({
    queryKey: ['/api/analytics/interactions', dateRange],
    queryFn: () => apiRequest(`/api/analytics/interactions?days=${dateRange}`),
  });

  const handleExportReport = async () => {
    try {
      const response = await fetch(`/api/analytics/favourites/export?days=${dateRange}&format=csv`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `favourites-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const analyticsData = analytics?.data || {
    totalFavourites: 0,
    totalUsers: 0,
    avgFavouritesPerUser: 0,
    favoritesGrowthRate: 0
  };

  const products = popularProducts?.data || [];
  const interactions = interactionAnalytics?.data?.interactionsByType || [];

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Favourites Analytics</h1>
          <p className="text-muted-foreground">Track user engagement and favourite product insights</p>
        </div>
        <Button onClick={handleExportReport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select 
              value={dateRange.toString()}
              onValueChange={(value) => setDateRange(parseInt(value))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Favourites</CardTitle>
            <Heart className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalFavourites.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analyticsData.favoritesGrowthRate >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {Math.abs(analyticsData.favoritesGrowthRate || 0)}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Users with favourites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per User</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analyticsData.avgFavouritesPerUser || 0).toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Favourites per active user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interaction Types</CardTitle>
            <Eye className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interactions.length}</div>
            <p className="text-xs text-muted-foreground">
              Different interaction types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interaction Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>User Interactions</CardTitle>
                <CardDescription>Distribution of user interaction types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={interactions}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ interactionType, count }) => `${interactionType}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {interactions.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Popular Products Quick View */}
            <Card>
              <CardHeader>
                <CardTitle>Top Favourited Products</CardTitle>
                <CardDescription>Most popular products by favourites</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {products.slice(0, 5).map((product, index) => (
                    <div key={product.id || index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <div>
                          <p className="text-sm font-medium">{product.name || `Product ${product.id}`}</p>
                          <p className="text-xs text-gray-500">R{product.price || '0.00'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3 text-pink-500" />
                        <span className="text-sm font-bold">{product.favouriteCount || product.viewCount || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Most Favourited Products</CardTitle>
              <CardDescription>Complete list of top performing products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products.map((product, index) => (
                  <div key={product.id || index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <img 
                        src={product.imageUrl || '/api/placeholder/60/60'} 
                        alt={product.name || 'Product'}
                        className="w-12 h-12 rounded object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/api/placeholder/60/60';
                        }}
                      />
                      <div>
                        <p className="font-medium">{product.name || `Product ${product.id}`}</p>
                        <p className="text-sm text-gray-500">R{product.price || '0.00'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <Heart className="h-4 w-4 text-pink-500" />
                        <span className="font-bold">{product.favouriteCount || product.viewCount || 0}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {product.favouriteCount ? 'favourites' : 'views'}
                      </p>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No product data available for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interaction Analytics</CardTitle>
              <CardDescription>User engagement patterns and behaviour</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={interactions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="interactionType" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}