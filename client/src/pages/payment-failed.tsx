/**
 * Payment Failed Page
 * Handles YoCo card payment failures and provides options for retry
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, CreditCard, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function PaymentFailedPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const orderId = searchParams.get('orderId');
  const checkoutId = searchParams.get('checkoutId');
  const error = searchParams.get('error') || 'Payment failed to process';

  // CRITICAL: For card payment failures, no order exists (which is correct!)
  // Only try to fetch order data if orderId exists (EFT payments)
  const { data: order, isLoading } = useQuery({
    queryKey: ['/api/orders', orderId],
    enabled: !!orderId, // Only fetch if orderId exists (EFT case)
  });

  // Fetch EFT payment setting to conditionally show EFT option
  const { data: eftSetting } = useQuery({
    queryKey: ['/api/admin/settings/eft_payments_enabled'],
  });

  if (!orderId && !checkoutId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-800">Payment Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600">
              No order information was found. Please return to your cart and try again.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href="/cart">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Cart
                </Link>
              </Button>
              <Button asChild>
                <Link href="/">Return to Shop</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-800">Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>

          {order && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Order Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-medium">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">R {order.totalAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium capitalize">{order.status}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">What would you like to do?</h3>
            
            <div className="grid gap-3">
              {/* For card payment failures, show option to retry or go back to cart */}
              {checkoutId && (
                <>
                  <Button asChild className="w-full" size="lg">
                    <Link href="/cart">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Try Card Payment Again
                    </Link>
                  </Button>
                  
                  {/* Only show EFT option if enabled by admin */}
                  {eftSetting?.data?.settingValue === 'true' && (
                    <Button asChild variant="outline" className="w-full" size="lg">
                      <Link href="/checkout">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Use Bank Transfer Instead
                      </Link>
                    </Button>
                  )}
                </>
              )}
              
              {/* For EFT payment failures where order exists */}
              {order && order.paymentStatus !== 'payment_received' && (
                <>
                  <Button asChild className="w-full" size="lg">
                    <Link href={`/order/${order.orderNumber}`}>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Try Card Payment Again
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="w-full" size="lg">
                    <Link href={`/payment-confirmation?orderNumber=${order.orderNumber}`}>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Use Bank Transfer Instead
                    </Link>
                  </Button>
                </>
              )}
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/orders">
                  View My Orders
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

          <div className="border-t pt-6">
            <h4 className="font-medium text-gray-900 mb-2">Need Help?</h4>
            <p className="text-sm text-gray-600 mb-3">
              If you're experiencing issues with payment, please contact our support team:
            </p>
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Email:</span>{' '}
                <a href="mailto:sales@teemeyou.shop" className="text-pink-600 hover:underline">
                  sales@teemeyou.shop
                </a>
              </p>
              <p>
                <span className="font-medium">Phone:</span>{' '}
                <a href="tel:+27123456789" className="text-pink-600 hover:underline">
                  +27 12 345 6789
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}