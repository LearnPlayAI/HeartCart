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
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
      return <Package className="w-4 h-4" />;
    case 'payment_received':
      return <CreditCard className="w-4 h-4" />;
    case 'status_change':
      if (status === 'processing') return <Clock className="w-4 h-4" />;
      if (status === 'shipped') return <Truck className="w-4 h-4" />;
      if (status === 'delivered') return <CheckCircle className="w-4 h-4" />;
      if (status === 'cancelled') return <XCircle className="w-4 h-4" />;
      return <AlertCircle className="w-4 h-4" />;
    case 'shipped':
      return <Truck className="w-4 h-4" />;
    case 'delivered':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getStatusColor = (eventType: string, status: string) => {
  switch (eventType) {
    case 'order_placed':
      return 'bg-blue-500';
    case 'payment_received':
      return 'bg-green-500';
    case 'status_change':
      if (status === 'processing') return 'bg-yellow-500';
      if (status === 'shipped') return 'bg-purple-500';
      if (status === 'delivered') return 'bg-green-600';
      if (status === 'cancelled') return 'bg-red-500';
      return 'bg-gray-500';
    case 'shipped':
      return 'bg-purple-500';
    case 'delivered':
      return 'bg-green-600';
    default:
      return 'bg-gray-500';
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
    }
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
                <div key={entry.id} className="relative">
                  <div className="flex items-start gap-4">
                    {/* Timeline connector */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full ${getStatusColor(entry.eventType, entry.status)} flex items-center justify-center text-white`}>
                        {getStatusIcon(entry.eventType, entry.status)}
                      </div>
                      {!isLast && (
                        <div className="absolute top-10 left-1/2 w-0.5 h-6 bg-border transform -translate-x-1/2" />
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
                            <Badge variant="secondary" className="text-xs">
                              {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                            </Badge>
                            {entry.paymentStatus && (
                              <Badge 
                                variant={entry.paymentStatus === 'paid' ? 'default' : 'outline'} 
                                className="text-xs"
                              >
                                Payment: {entry.paymentStatus}
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