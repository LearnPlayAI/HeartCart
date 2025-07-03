import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, DollarSign, Save, Calculator, Info } from "lucide-react";
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
  bankName: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  branchCode: string | null;
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

export default function RecordPaymentPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const repId = parseInt(params.id || '0');

  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'Store Credit', // Default to Store Credit as per requirement
    referenceNumber: '',
    notes: ''
  });

  // Fetch sales rep data
  const { data: salesRepsResponse, isLoading: repsLoading } = useQuery({
    queryKey: ['/api/admin/sales-reps'],
    refetchOnWindowFocus: true
  });

  const salesReps = Array.isArray(salesRepsResponse?.data) ? salesRepsResponse.data : 
                    Array.isArray(salesRepsResponse) ? salesRepsResponse : [];
  const selectedRep = salesReps.find((rep: SalesRep) => rep.id === repId);

  // Fetch commissions for payment
  const { data: commissionsForPaymentResponse, isLoading: commissionsLoading } = useQuery({
    queryKey: [`/api/admin/sales-reps/${repId}/commissions-for-payment`],
    enabled: !!repId
  });

  const commissionsForPayment = commissionsForPaymentResponse?.data || {};
  const { commissions = [], totalAmountOwed = 0, orderNumbers = [] } = commissionsForPayment;

  // Fetch auto-generated reference number from backend
  const { data: referenceResponse } = useQuery({
    queryKey: [`/api/admin/sales-reps/${repId}/payment-reference`],
    enabled: !!repId && !!selectedRep && !paymentData.referenceNumber
  });

  // Auto-populate form data when rep data and reference are loaded
  useEffect(() => {
    if (selectedRep && referenceResponse?.data?.referenceNumber && !paymentData.referenceNumber) {
      setPaymentData(prev => ({
        ...prev,
        referenceNumber: referenceResponse.data.referenceNumber,
        notes: orderNumbers.length > 0 ? `Commission payment for orders: ${orderNumbers.join(', ')}` : ''
      }));
    }
  }, [selectedRep, referenceResponse, totalAmountOwed, orderNumbers]);

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', `/api/admin/sales-reps/${repId}/payments`, data),
    onSuccess: () => {
      // Invalidate all sales rep related caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps/overview'] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/sales-reps/${repId}/commissions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/sales-reps/${repId}/payments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/sales-reps/${repId}/summary`] });
      
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      setLocation(`/admin/sales-reps/${repId}/commissions`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalAmountOwed || totalAmountOwed <= 0) {
      toast({
        title: "Validation Error",
        description: "No outstanding commissions to pay",
        variant: "destructive"
      });
      return;
    }
    if (!paymentData.paymentMethod) {
      toast({
        title: "Validation Error",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }
    
    // Submit with auto-calculated amount instead of user-entered amount
    const submitData = {
      ...paymentData,
      amount: totalAmountOwed // Use API-calculated amount
    };
    recordPaymentMutation.mutate(submitData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  if (repsLoading || commissionsLoading) {
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
      <div className="max-w-2xl mx-auto space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/admin/sales-reps/${repId}/commissions`)}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Record Payment</h1>
            <p className="text-muted-foreground">
              Record commission payment for {selectedRep.firstName} {selectedRep.lastName}
            </p>
          </div>
        </div>

        {/* Payment Summary */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Calculator className="w-5 h-5 text-blue-500" />
              Payment Summary
            </CardTitle>
            <CardDescription>
              Current commission status for {selectedRep.repCode}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium">Total Amount Owed</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalAmountOwed)}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Unpaid Commissions</p>
                <p className="text-2xl font-bold text-blue-700">{commissions.length}</p>
              </div>
            </div>
            
            {orderNumbers.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Orders included:</p>
                    <p className="text-sm text-gray-600">{orderNumbers.join(', ')}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card className="border-t-4 border-t-pink-500">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100 border-b">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <DollarSign className="w-5 h-5 text-pink-500" />
              Payment Details
            </CardTitle>
            <CardDescription>
              Enter the commission payment information
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Payment Method - Select first to calculate amount */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod" className="text-sm font-medium">
                  Payment Method <span className="text-red-500">*</span>
                </Label>
                <Select value={paymentData.paymentMethod} onValueChange={(value) => setPaymentData({...paymentData, paymentMethod: value})}>
                  <SelectTrigger className="focus:ring-pink-500 focus:border-pink-500">
                    <SelectValue placeholder="Select payment method to calculate amount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Store Credit">Store Credit (100% of commissions)</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer (50% of commissions)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Amount - Calculated based on payment method */}
              {paymentData.paymentMethod && (
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium">
                    Payment Amount <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="text"
                      value={formatCurrency(
                        paymentData.paymentMethod === 'Bank Transfer' 
                          ? totalAmountOwed * 0.5 
                          : totalAmountOwed
                      )}
                      readOnly
                      className="bg-gray-50 border-gray-300 text-gray-700 cursor-not-allowed"
                      placeholder="Auto-calculated based on payment method"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <Calculator className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-600">
                      {paymentData.paymentMethod === 'Bank Transfer' 
                        ? `Bank Transfer: 50% of ${formatCurrency(totalAmountOwed)} = ${formatCurrency(totalAmountOwed * 0.5)}`
                        : `Store Credit: 100% of ${formatCurrency(totalAmountOwed)} = ${formatCurrency(totalAmountOwed)}`
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Banking Details - Show when Bank Transfer is selected */}
              {paymentData.paymentMethod === 'Bank Transfer' && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Banking Details Required</h4>
                    {selectedRep.bankName && selectedRep.accountNumber && selectedRep.accountHolderName ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-700">Bank Name:</p>
                            <p className="text-gray-600">{selectedRep.bankName}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Account Holder:</p>
                            <p className="text-gray-600">{selectedRep.accountHolderName}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Account Number:</p>
                            <p className="text-gray-600">{selectedRep.accountNumber}</p>
                          </div>
                          {selectedRep.branchCode && (
                            <div>
                              <p className="font-medium text-gray-700">Branch Code:</p>
                              <p className="text-gray-600">{selectedRep.branchCode}</p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-green-600 mt-2">✓ Banking details are available for this payment method</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-yellow-700 text-sm">
                          This sales rep doesn't have complete banking details on file. 
                          Bank transfer payments require: Bank Name, Account Number, and Account Holder Name.
                        </p>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => setLocation(`/admin/sales-reps/${repId}/edit`)}
                          className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                        >
                          Update Banking Details
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reference Number */}
              <div className="space-y-2">
                <Label htmlFor="referenceNumber" className="text-sm font-medium">Reference Number</Label>
                <Input
                  id="referenceNumber"
                  value={paymentData.referenceNumber}
                  onChange={(e) => setPaymentData({...paymentData, referenceNumber: e.target.value})}
                  className="focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Auto-generated reference number"
                />
                <p className="text-xs text-gray-500">Auto-generated based on rep code and date</p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Payment Notes</Label>
                <Textarea
                  id="notes"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                  className="focus:ring-pink-500 focus:border-pink-500 min-h-[80px]"
                  placeholder="Optional notes about this payment"
                />
                <p className="text-xs text-gray-500">Include order numbers or other relevant details</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/admin/sales-reps/${repId}/commissions`)}
                  className="sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    recordPaymentMutation.isPending ||
                    !paymentData.paymentMethod ||
                    (paymentData.paymentMethod === 'Bank Transfer' && 
                     (!selectedRep.bankName || !selectedRep.accountNumber || !selectedRep.accountHolderName))
                  }
                  className="bg-pink-500 hover:bg-pink-600 text-white sm:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {recordPaymentMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Recording...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Record Payment
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}