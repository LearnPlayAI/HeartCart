import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  MapPin,
  User,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  Filter,
  RefreshCw,
  DollarSign,
  AlertCircle,
  Package2,
  Grid3X3,
  List,
  FileText,
  Download,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// Types matching the API response structure
interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  productSku?: string;
  productImageUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedAttributes: Record<string, any>;
  attributeDisplayText?: string;
  createdAt: string;
  product?: {
    id: number;
    name: string;
    imageUrl: string;
    price: number;
    salePrice?: number;
  };
}

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
  orderItems: OrderItem[];
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

// Helper functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR'
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusConfig = (status: string) => {
  const configs = {
    pending: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock,
      label: "Pending"
    },
    confirmed: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: CheckCircle,
      label: "Payment Received"
    },
    processing: {
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: Package,
      label: "Processing"
    },
    shipped: {
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: Truck,
      label: "Shipped"
    },
    delivered: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
      label: "Delivered"
    },
    cancelled: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: XCircle,
      label: "Cancelled"
    }
  };
  return configs[status as keyof typeof configs] || configs.pending;
};

const getPaymentStatusConfig = (status: string) => {
  const configs = {
    pending: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock,
      label: "Pending"
    },
    paid: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
      label: "Paid"
    },
    failed: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: XCircle,
      label: "Failed"
    }
  };
  return configs[status as keyof typeof configs] || configs.pending;
};

// Order Statistics Component
function OrderStats({ orders, onFilterChange }: { orders: Order[]; onFilterChange: (filter: string) => void }) {
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    totalPaymentsReceived: orders.filter(o => ['confirmed', 'processing', 'shipped', 'delivered'].includes(o.status)).reduce((sum, o) => sum + o.totalAmount, 0),
    totalPaymentsPending: orders.filter(o => o.status === 'pending').reduce((sum, o) => sum + o.totalAmount, 0),
    pendingPayments: orders.filter(o => o.status === 'pending').length
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Main statistics row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("all")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("pending")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("processing")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.processing}</p>
                <p className="text-xs text-muted-foreground">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("shipped")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.shipped}</p>
                <p className="text-xs text-muted-foreground">Shipped</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("delivered")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.delivered}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("pending")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingPayments}</p>
                <p className="text-xs text-muted-foreground">Pending Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Revenue row - wider and separate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("confirmed")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPaymentsReceived)}</p>
                <p className="text-sm text-muted-foreground">Total Payments Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onFilterChange("pending")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPaymentsPending)}</p>
                <p className="text-sm text-muted-foreground">Total Payments Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Order Card Component
function OrderCard({ order }: { order: Order }) {
  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm text-blue-600">#{order.orderNumber}</h3>
              <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
            </div>
            <div className="flex items-end">
              <Badge className={`${statusConfig.color} border text-xs`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{order.customerName}</p>
              <p className="text-xs text-muted-foreground truncate">{order.customerEmail}</p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Package2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {order.orderItems?.length || 0} item{(order.orderItems?.length || 0) !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{formatCurrency(order.totalAmount)}</p>
              {order.shippingMethod && (
                <p className="text-xs text-muted-foreground capitalize">{order.shippingMethod}</p>
              )}
            </div>
          </div>

          {/* Action Button */}
          <Link href={`/admin/orders/${order.id}`} className="w-full">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}


