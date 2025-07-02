import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, DollarSign, TrendingUp, Users, Calendar } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout";

interface SalesRep {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  repCode: string;
  commissionRate: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  totalEarnings: number;
  commissionCount: number;
}

interface Commission {
  id: number;
  orderId: number;
  userId: number;
  commissionAmount: number;
  orderAmount: number;
  commissionRate: number;
  totalProfitAmount?: number;
  totalCustomerPaidAmount?: number;
  totalCostAmount?: number;
  status: 'earned' | 'paid' | 'cancelled';
  notes: string | null;
  createdAt: string;
}

interface Payment {
  id: number;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  processedBy: number | null;
  createdAt: string;
}

export default function SalesRepCommissionsPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const repId = parseInt(params.id || '0');

  // Fetch sales rep data
  const { data: salesRepsResponse, isLoading: repsLoading } = useQuery({
    queryKey: ['/api/admin/sales-reps'],
    refetchOnWindowFocus: true
  });

  const salesReps = Array.isArray(salesRepsResponse?.data) ? salesRepsResponse.data : 
                    Array.isArray(salesRepsResponse) ? salesRepsResponse : [];
  const selectedRep = salesReps.find((rep: SalesRep) => rep.id === repId);

  // Fetch commissions
  const { data: commissionsResponse, isLoading: commissionsLoading } = useQuery({
    queryKey: [`/api/admin/sales-reps/${repId}/commissions`],
    enabled: !!repId
  });

  const commissions = commissionsResponse?.data?.commissions || [];

  // Fetch payments
  const { data: paymentsResponse, isLoading: paymentsLoading } = useQuery({
    queryKey: [`/api/admin/sales-reps/${repId}/payments`],
    enabled: !!repId
  });

  const { data: summaryResponse, isLoading: summaryLoading } = useQuery({
    queryKey: [`/api/admin/sales-reps/${repId}/summary`],
    enabled: !!repId
  });

  const payments = paymentsResponse?.data || [];
  const summary = summaryResponse?.data || null;

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
      day: 'numeric'
    });
  };

  if (repsLoading || commissionsLoading || paymentsLoading || summaryLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!selectedRep) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto space-y-6 p-4 sm:p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sales Rep Not Found</h1>
            <p className="text-gray-600 mb-4">The sales representative you're looking for doesn't exist.</p>
            <Button onClick={() => setLocation('/admin/sales-reps')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sales Reps
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/admin/sales-reps')}
            className="shrink-0 sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {selectedRep.firstName} {selectedRep.lastName} - Commissions
            </h1>
            <p className="text-muted-foreground">
              Commission history and payment records for {selectedRep.repCode}
            </p>
          </div>
          <Button onClick={() => setLocation(`/admin/sales-reps/${repId}/record-payment`)} className="bg-pink-500 hover:bg-pink-600">
            <DollarSign className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Earned</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.totalEarned || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.totalPaid || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-pink-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Amount Owed</p>
                  <p className="text-2xl font-bold text-pink-600">{formatCurrency(summary?.amountOwed || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Commission Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{Number(selectedRep.commissionRate).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission History */}
        <Card className="border-t-4 border-t-pink-500">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100 border-b">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <TrendingUp className="w-5 h-5 text-pink-500" />
              Commission History
            </CardTitle>
            <CardDescription>
              Detailed breakdown of all commissions earned
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {commissions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No Commissions Yet</p>
                <p>This sales rep hasn't earned any commissions yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 p-4">
                {commissions.map((commission: Commission) => (
                  <Card key={commission.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Date and Order ID */}
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Date</p>
                            <p className="text-sm">{formatDate(commission.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Order ID</p>
                            <p className="text-sm font-medium">#{commission.orderId}</p>
                          </div>
                        </div>

                        {/* Financial Details */}
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Customer Paid</p>
                            <p className="text-sm font-medium">{formatCurrency(Number(commission.totalCustomerPaidAmount || commission.orderAmount))}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Cost Amount</p>
                            <p className="text-sm">{formatCurrency(Number(commission.totalCostAmount || 0))}</p>
                          </div>
                        </div>

                        {/* Profit and Commission */}
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Profit Amount</p>
                            <p className="text-sm font-medium text-green-600">
                              {formatCurrency(Number(commission.totalProfitAmount || 0))}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Commission</p>
                            <p className="text-sm font-medium text-pink-600">
                              {formatCurrency(Number(commission.commissionAmount))}
                            </p>
                          </div>
                        </div>

                        {/* Rate and Status */}
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Rate</p>
                            <p className="text-sm font-medium">{Number(commission.commissionRate).toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Status</p>
                            <div className="mt-1">
                              {commission.status === 'paid' ? (
                                <Badge className="bg-green-600 text-white hover:bg-green-700">
                                  Paid
                                </Badge>
                              ) : commission.status === 'earned' ? (
                                <Badge className="bg-pink-500 text-white hover:bg-pink-600">
                                  Earned
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  {commission.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        {payments.length > 0 && (
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <DollarSign className="w-5 h-5 text-blue-500" />
                Payment History
              </CardTitle>
              <CardDescription>
                Record of all commission payments made
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: Payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.createdAt)}</TableCell>
                        <TableCell className="font-medium text-blue-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell>{payment.referenceNumber || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{payment.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}