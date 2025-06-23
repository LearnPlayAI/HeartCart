import { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { format } from 'date-fns';
import { 
  Clock, 
  Package, 
  CreditCard, 
  Truck, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User,
  Shield,
  ShoppingCart,
  DollarSign,
  PackageCheck,
  Send,
  MapPin,
  Star,
  Ban,
  FileText,
  Zap,
  Calendar,
  Target,
  Settings,
  UserCheck,
  Factory,
  Route,
  Home,
  RefreshCw,
  Edit3,
  Clipboard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Customer payment status text mapping
const getCustomerPaymentStatusText = (status: string) => {
  switch (status.toLowerCase()) {
    case 'payment_received':
      return 'Paid';
    case 'paid':
      return 'Paid';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

// Badge color mapping for order status - matches order detail page styling
const getOrderStatusBadgeColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'processing':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'shipped':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'delivered':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Badge color mapping for payment status - matches order detail page styling
const getPaymentStatusBadgeColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'payment_received':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

interface OrderStatusHistoryEntry {
  id: number;
  orderId: number;
  status: string;
  paymentStatus?: string;
  previousStatus?: string;
  previousPaymentStatus?: string;
  changedBy: string;
  changedByUserId?: number;
  eventType: string;
  notes?: string;
  trackingNumber?: string;
  createdAt: string;
}

interface OrderStatusTimelineProps {
  orderId: number;
  currentStatus: string;
  currentPaymentStatus: string;
}

const getStatusIcon = (eventType: string, status: string) => {
  switch (eventType) {
    case 'order_placed':
      return <ShoppingCart className="w-5 h-5" />;
    case 'payment_received':
      return <DollarSign className="w-5 h-5" />;
    case 'status_change':
      if (status === 'confirmed') return <UserCheck className="w-5 h-5" />;
      if (status === 'processing') return <Factory className="w-5 h-5" />;
      if (status === 'shipped') return <Route className="w-5 h-5" />;
      if (status === 'delivered') return <Home className="w-5 h-5" />;
      if (status === 'cancelled') return <XCircle className="w-5 h-5" />;
      return <Settings className="w-5 h-5" />;
    case 'shipped':
      return <Route className="w-5 h-5" />;
    case 'delivered':
      return <Home className="w-5 h-5" />;
    case 'cancelled':
      return <XCircle className="w-5 h-5" />;
    case 'notes_added':
      return <Edit3 className="w-5 h-5" />;
    case 'tracking_updated':
      return <RefreshCw className="w-5 h-5" />;
    case 'payment_status_change':
      return <CreditCard className="w-5 h-5" />;
    case 'admin_update':
      return <Shield className="w-5 h-5" />;
    case 'system_update':
      return <Settings className="w-5 h-5" />;
    default:
      return <Clipboard className="w-5 h-5" />;
  }
};

const getTimelineEntryColor = (entry: OrderStatusHistoryEntry) => {
  // Determine the status to use for coloring - prioritize the new status from the entry
  let statusForColor = entry.status;
  
  // For order_placed events, use pending color
  if (entry.eventType === 'order_placed') {
    statusForColor = 'pending';
  }
  
  // For payment events, use emerald color regardless of status
  if (entry.eventType === 'payment_received' || entry.paymentStatus) {
    return 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25';
  }
  
  // Use the status from the entry to determine color
  switch (statusForColor?.toLowerCase()) {
    case 'pending':
      return 'bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/25';
    case 'confirmed':
      return 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25';
    case 'processing':
      return 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25';
    case 'shipped':
      return 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25';
    case 'delivered':
      return 'bg-gradient-to-r from-green-500 to-green-600 shadow-lg shadow-green-500/25';
    case 'cancelled':
    case 'canceled':
      return 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/25';
    default:
      return 'bg-gradient-to-r from-slate-500 to-slate-600 shadow-lg shadow-slate-500/25';
  }
};

const formatStatusText = (entry: OrderStatusHistoryEntry) => {
  switch (entry.eventType) {
    case 'order_placed':
      return 'Order placed successfully';
    case 'payment_received':
      return 'Payment confirmed by admin';
    case 'status_change':
      if (entry.status === 'processing') return 'Order is being processed';
      if (entry.status === 'shipped') return 'Order has been shipped';
      if (entry.status === 'delivered') return 'Order delivered successfully';
      if (entry.status === 'cancelled') return 'Order cancelled';
      return `Status changed to ${entry.status}`;
    case 'shipped':
      return 'Order shipped';
    case 'delivered':
      return 'Order delivered';
    default:
      return `Status updated to ${entry.status}`;
  }
};

const formatSASTTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    // The timestamps from the database are already in SAST timezone (UTC+2)
    // No need to add additional offset as the server stores them in SAST
    
    return {
      date: format(date, 'dd MMM yyyy'),
      time: format(date, 'HH:mm'),
      full: format(date, 'dd MMM yyyy HH:mm')
    };
  } catch (error) {
    console.error('Error formatting date:', error);
    return {
      date: 'Invalid Date',
      time: '--:--',
      full: 'Invalid Date'
    };
  }
};

export default function OrderStatusTimeline({ orderId, currentStatus, currentPaymentStatus }: OrderStatusTimelineProps) {
  const { data: statusHistory, isLoading } = useQuery({
    queryKey: ['/api/orders', orderId, 'status-history'],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/status-history`);
      if (!response.ok) {
        throw new Error('Failed to fetch order status history');
      }
      return response.json();
    },
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data for long
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when reconnecting to network
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Order Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const history: OrderStatusHistoryEntry[] = statusHistory?.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Order Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No timeline events recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {history.map((entry, index) => {
              const isLast = index === history.length - 1;
              const sastTime = formatSASTTime(entry.createdAt);
              
              return (
                <div 
                  key={entry.id} 
                  className="relative animate-in fade-in-50 slide-in-from-left-2 duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Timeline connector */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full ${getTimelineEntryColor(entry)} flex items-center justify-center text-white transition-all duration-300 hover:scale-110 hover:rotate-3`}>
                        {getStatusIcon(entry.eventType, entry.status)}
                      </div>
                      {!isLast && (
                        <div className="absolute top-12 left-1/2 w-0.5 h-8 bg-gradient-to-b from-border to-transparent transform -translate-x-1/2" />
                      )}
                    </div>

                    {/* Event content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">
                            {formatStatusText(entry)}
                          </h4>
                          
                          {/* Status badges */}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getOrderStatusBadgeColor(entry.status)}`}
                            >
                              {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                            </Badge>
                            {entry.paymentStatus && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getPaymentStatusBadgeColor(entry.paymentStatus)}`}
                              >
                                Payment: {getCustomerPaymentStatusText(entry.paymentStatus)}
                              </Badge>
                            )}
                          </div>

                          {/* Changed by info */}
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            {entry.changedBy === 'admin' ? (
                              <Shield className="w-3 h-3" />
                            ) : (
                              <User className="w-3 h-3" />
                            )}
                            <span>
                              Changed by {entry.changedBy}
                              {entry.changedBy === 'customer' && ' (you)'}
                            </span>
                          </div>

                          {/* Notes */}
                          {entry.notes && (
                            <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                              {entry.notes}
                            </p>
                          )}

                          {/* Tracking number */}
                          {entry.trackingNumber && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                Tracking: {entry.trackingNumber}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                          <div className="font-medium">{sastTime.time}</div>
                          <div>{sastTime.date}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}