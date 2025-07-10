import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { AdminLayout } from '@/components/admin/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { 
  ShoppingBasket, 
  Search, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  Package, 
  Users, 
  TrendingUp,
  Eye
} from 'lucide-react';

export default function UserCartsPage() {
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Fetch cart statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/user-carts/stats'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch cart items with pagination
  const { data: cartsData, isLoading: cartsLoading, error } = useQuery({
    queryKey: ['/api/admin/user-carts', { page: currentPage, search: debouncedSearchTerm }],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewCartDetails = (userId: number) => {
    setLocation(`/admin/user-carts/${userId}`);
  };

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
      month: 'short',
      day: 'numeric'
    });
  };

  if (error) {
    return (
      <AdminLayout title="User Carts" subtitle="View abandoned carts and contact customers">
        <div className="text-center py-8">
          <p className="text-red-600">Error loading user carts. Please try again.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="User Carts" subtitle="View abandoned carts and contact customers">
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Abandoned Carts</CardTitle>
              <ShoppingBasket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalAbandonedCarts || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Unique users with items in cart
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cart Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : formatCurrency(stats?.totalAbandonedValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total value of abandoned items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Cart Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : formatCurrency(stats?.averageCartValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Average value per cart
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.cartsLast24Hours || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                New carts last 24 hours
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1">
                <CardTitle className="text-lg">User Carts</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse and manage abandoned shopping carts
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users or products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {cartsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Cart Value</TableHead>
                        <TableHead>Days Since Added</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartsData?.cartItems?.map((cartItem) => (
                        <TableRow key={`${cartItem.userId}-${cartItem.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {cartItem.user.username?.charAt(0).toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {cartItem.user.fullName || cartItem.user.username}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  @{cartItem.user.username}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3" />
                                <a 
                                  href={`mailto:${cartItem.user.email}`}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  {cartItem.user.email}
                                </a>
                              </div>
                              {cartItem.user.phoneNumber && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-3 w-3" />
                                  <a 
                                    href={`tel:${cartItem.user.phoneNumber}`}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    {cartItem.user.phoneNumber}
                                  </a>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span>{cartItem.quantity}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatCurrency(cartItem.cartTotal)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={cartItem.daysSinceAdded > 7 ? 'destructive' : 'secondary'}>
                              {cartItem.daysSinceAdded} days
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewCartDetails(cartItem.userId)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Cart
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {cartsData && cartsData.totalPages > 1 && (
                  <div className="flex justify-center mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: cartsData.totalPages }).map((_, i) => (
                          <PaginationItem key={i}>
                            <PaginationLink
                              onClick={() => handlePageChange(i + 1)}
                              isActive={currentPage === i + 1}
                            >
                              {i + 1}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => currentPage < cartsData.totalPages && handlePageChange(currentPage + 1)}
                            className={currentPage === cartsData.totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}