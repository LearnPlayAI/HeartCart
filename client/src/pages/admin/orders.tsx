import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useDateFormat } from "@/hooks/use-date-format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, Search, ExternalLink } from "lucide-react";
import { useState } from "react";

// Order status colors
const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  processing: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  shipped: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  delivered: "bg-green-100 text-green-800 hover:bg-green-200",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-200",
};

// Type definition for order with items
interface OrderWithItems {
  id: number;
  userId: number;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  shippingMethod: string;
  paymentMethod: string;
  trackingNumber: string | null;
  createdAt: string;
  items: Array<{
    id: number;
    orderId: number;
    productId: number;
    quantity: number;
    price: number;
    product: {
      id: number;
      name: string;
      image: string | null;
    };
  }>;
  user: {
    id: number;
    username: string;
    email: string;
    fullName: string | null;
  };
}

function OrderDetails({ order }: { order: OrderWithItems }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatShortDate } = useDateFormat();
  
  // Mutation for updating order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update order status');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: "Status updated",
        description: "The order status has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-8">
      {/* Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Order #{order.id}</h3>
          <p className="text-sm text-muted-foreground">
            Placed on {formatShortDate(order.createdAt)} by {order.user.fullName || order.user.username}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            defaultValue={order.status}
            onValueChange={(value) => 
              updateStatusMutation.mutate({ orderId: order.id, status: value })
            }
            disabled={updateStatusMutation.isPending}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {updateStatusMutation.isPending && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
        </div>
      </div>

      {/* Order Details Tabs */}
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="customer">Customer</TabsTrigger>
        </TabsList>
        
        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4 pt-4">
          <div className="rounded-md border">
            <div className="bg-muted/50 px-4 py-2 font-medium">
              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-3">Product</div>
                <div className="text-right">Price</div>
                <div className="text-right">Quantity</div>
                <div className="text-right">Total</div>
              </div>
            </div>
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <div className="grid grid-cols-6 gap-4 items-center">
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="h-full w-full object-cover rounded"
                          />
                        ) : (
                          <div className="text-xs text-muted-foreground">No image</div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: PROD-{item.productId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">{formatCurrency(item.price)}</div>
                    <div className="text-right">{item.quantity}</div>
                    <div className="text-right font-medium">{formatCurrency(item.price * item.quantity)}</div>
                  </div>
                </div>
              ))}
              <div className="px-4 py-3">
                <div className="grid grid-cols-6 gap-4 items-center">
                  <div className="col-span-3"></div>
                  <div className="text-right col-span-2 font-medium">Order Total:</div>
                  <div className="text-right font-bold">{formatCurrency(order.totalAmount)}</div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Shipping Tab */}
        <TabsContent value="shipping" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-2">Shipping Address</h3>
                <p className="whitespace-pre-line text-muted-foreground">
                  {order.shippingAddress || "No shipping address provided"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-2">Shipping Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method:</span>
                    <span>{order.shippingMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tracking:</span>
                    <span>
                      {order.trackingNumber ? (
                        <a 
                          href={`https://example.com/track/${order.trackingNumber}`} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:underline"
                        >
                          {order.trackingNumber}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      ) : (
                        "Not available"
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-4 pt-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-2">Payment Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method:</span>
                  <span>{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{formatShortDate(order.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Customer Tab */}
        <TabsContent value="customer" className="space-y-4 pt-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-2">Customer Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{order.user.fullName || order.user.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <a href={`mailto:${order.user.email}`} className="text-blue-600 hover:underline">
                    {order.user.email}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer ID:</span>
                  <span>{order.user.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Admin Orders Page Component
 */
export default function AdminOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const { formatShortDate } = useDateFormat();

  // Fetch all orders
  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/admin/orders"],
    queryFn: async () => {
      const response = await fetch("/api/admin/orders");
      if (!response.ok) throw new Error("Failed to fetch orders");
      return await response.json();
    },
  });

  // Apply filters
  const filteredOrders = orders?.filter((order) => {
    const matchesSearch = 
      searchTerm === "" || 
      order.id.toString().includes(searchTerm) ||
      (order.user?.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.user?.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders ? filteredOrders.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = filteredOrders ? Math.ceil(filteredOrders.length / itemsPerPage) : 0;

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const openOrderDetails = (order: OrderWithItems) => {
    setSelectedOrder(order);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col space-y-6">
        {/* Header with title */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">
            Manage customer orders and shipments
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order #, customer..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Statuses" />
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
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <div className="bg-muted/50 px-4 py-3 font-medium">
                <div className="grid grid-cols-6 gap-4">
                  <div>Order #</div>
                  <div>Customer</div>
                  <div>Date</div>
                  <div>Status</div>
                  <div className="text-right">Total</div>
                  <div></div>
                </div>
              </div>
              <div className="divide-y">
                {currentItems.length > 0 ? (
                  currentItems.map((order) => (
                    <div key={order.id} className="px-4 py-3">
                      <div className="grid grid-cols-6 gap-4 items-center">
                        <div className="font-medium">#{order.id}</div>
                        <div>{order.user?.username || "Unknown"}</div>
                        <div className="flex items-center text-muted-foreground">
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {formatShortDate(order.createdAt)}
                        </div>
                        <div>
                          <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-right font-medium">
                          {formatCurrency(order.totalAmount)}
                        </div>
                        <div className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openOrderDetails(order)}
                              >
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Order Details</DialogTitle>
                                <DialogDescription>
                                  View and manage order information
                                </DialogDescription>
                              </DialogHeader>
                              <OrderDetails order={order} />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    No orders found matching your filters
                  </div>
                )}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination className="mx-auto mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      onClick={() => currentPage > 1 && paginate(currentPage - 1)}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <PaginationItem key={index + 1}>
                      <PaginationLink
                        isActive={currentPage === index + 1}
                        onClick={() => paginate(index + 1)}
                      >
                        {index + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      onClick={() => currentPage < totalPages && paginate(currentPage + 1)}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}