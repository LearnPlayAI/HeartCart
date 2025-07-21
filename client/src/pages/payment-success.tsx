/**
 * Payment Success Page
 * Handles successful YoCo card payments and provides order confirmation
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeft, Eye, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function PaymentSuccessPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const orderId = searchParams.get('orderId');
  const checkoutId = searchParams.get('checkoutId');

  // CRITICAL: For card payments, we now have checkoutId, not orderId initially
  // Need to fetch order by checkout ID since order is created after payment
  const { data: order, isLoading } = useQuery({
    queryKey: orderId ? ['/api/orders', orderId] : ['/api/orders/by-checkout', checkoutId],
    enabled: !!(orderId || checkoutId),
  });

  useEffect(() => {
    // If no order ID or checkout ID is provided, redirect to orders page
    if (!orderId && !checkoutId) {
      window.location.href = '/orders';
    }
  }, [orderId, checkoutId]);

  if (!orderId && !checkoutId) {
    return null; // Will redirect above
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">Payment Successful!</CardTitle>
          <p className="text-gray-600 mt-2">
            Your payment has been processed successfully and your order is confirmed.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {order && (
            <>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="font-semibold text-green-900 mb-3">Order Confirmation</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Order Number:</span>
                    <span className="font-medium text-green-900">{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Total Paid:</span>
                    <span className="font-medium text-green-900">R {order.totalAmount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Payment Method:</span>
                    <span className="font-medium text-green-900 capitalize">
                      {order.paymentMethod === 'card' ? 'Credit/Debit Card' : order.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Payment Status:</span>
                    <span className="font-medium text-green-900">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        Paid
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Order Status:</span>
                    <span className="font-medium text-green-900 capitalize">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {order.status}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>Your order is now confirmed and will be processed within 1-2 business days.</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>You'll receive email updates as your order progresses through each stage.</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>Once shipped, you'll receive tracking information to monitor delivery.</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>Delivery typically takes 3-5 business days via PUDO locker collection.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Quick Actions</h3>
                
                <div className="grid gap-3">
                  <Button asChild className="w-full" size="lg">
                    <Link href={`/order/${order.orderNumber}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Order Details
                    </Link>
                  </Button>
                  
                  {order.invoicePath && (
                    <Button asChild variant="outline" className="w-full">
                      <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-2" />
                        Download Invoice
                      </a>
                    </Button>
                  )}
                  
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/orders">
                      View All Orders
                    </Link>
                  </Button>
                  
                  <Button asChild variant="ghost" className="w-full">
                    <Link href="/">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Continue Shopping
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="border-t pt-6">
            <h4 className="font-medium text-gray-900 mb-2">Need Help?</h4>
            <p className="text-sm text-gray-600 mb-3">
              If you have any questions about your order, please contact us:
            </p>
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Email:</span>{' '}
                <a href="mailto:sales@heartcart.shop" className="text-pink-600 hover:underline">
                  sales@heartcart.shop
                </a>
              </p>
              <p>
                <span className="font-medium">Phone:</span>{' '}
                <a href="tel:+27712063084" className="text-pink-600 hover:underline">
                  +27 71 206 3084
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}