import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import AdminLayout from '@/components/admin/layout';
import { Users, DollarSign, TrendingUp, Plus, Eye, Edit2 } from 'lucide-react';

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

export default function SalesRepsWorkingPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCommissionsDialog, setShowCommissionsDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedRep, setSelectedRep] = useState<SalesRep | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  const [repForm, setRepForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    repCode: '',
    commissionRate: 3,
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    notes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Force clear cache on mount
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ['/api/admin/sales-reps'] });
  }, [queryClient]);

  // Fetch sales reps
  const { data: salesRepsResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/sales-reps'],
    queryFn: async () => {
      console.log('Making fresh API request...');
      const response = await fetch('/api/admin/sales-reps', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      console.log('Direct fetch response:', data);
      return data;
    },
    staleTime: 0,
    gcTime: 0
  });

  const salesReps = salesRepsResponse?.data || [];

  // Mutations
  const createRepMutation = useMutation({
    mutationFn: async (repData: any) => {
      return apiRequest('/api/admin/sales-reps', {
        method: 'POST',
        body: JSON.stringify(repData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      setShowCreateDialog(false);
      setRepForm({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        repCode: '',
        commissionRate: 3,
        notes: ''
      });
      toast({
        title: "Success",
        description: "Sales rep created successfully"
      });
    }
  });

  const updateRepMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/admin/sales-reps/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      setShowEditDialog(false);
      setSelectedRep(null);
      toast({
        title: "Success",
        description: "Sales rep updated successfully"
      });
    }
  });

  const createPaymentMutation = useMutation({
    mutationFn: async ({ repId, paymentData }: { repId: number; paymentData: any }) => {
      return apiRequest(`/api/admin/sales-reps/${repId}/payments`, {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      setShowPaymentDialog(false);
      setPaymentForm({
        amount: 0,
        paymentMethod: 'bank_transfer',
        referenceNumber: '',
        notes: ''
      });
      toast({
        title: "Success",
        description: "Payment recorded successfully"
      });
      // Refresh commissions and payments if showing them
      if (selectedRep && showCommissionsDialog) {
        loadRepCommissions(selectedRep.id);
        loadRepPayments(selectedRep.id);
      }
    }
  });

  const loadRepCommissions = async (repId: number) => {
    try {
      const commissionsData = await apiRequest(`/api/admin/sales-reps/${repId}/commissions`);
      setCommissions(commissionsData.commissions || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load commissions",
        variant: "destructive"
      });
    }
  };

  const loadRepPayments = async (repId: number) => {
    try {
      const paymentsData = await apiRequest(`/api/admin/sales-reps/${repId}/payments`);
      setPayments(paymentsData || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive"
      });
    }
  };

  const handleViewCommissions = async (rep: SalesRep) => {
    setSelectedRep(rep);
    setShowCommissionsDialog(true);
    await loadRepCommissions(rep.id);
    await loadRepPayments(rep.id);
  };

  const handleEditRep = (rep: SalesRep) => {
    setSelectedRep(rep);
    setRepForm({
      firstName: rep.firstName,
      lastName: rep.lastName,
      email: rep.email,
      phoneNumber: rep.phoneNumber || '',
      repCode: rep.repCode,
      commissionRate: rep.commissionRate,
      notes: rep.notes || ''
    });
    setShowEditDialog(true);
  };

  const handleCreatePayment = () => {
    if (!selectedRep) return;
    
    const paymentData = {
      ...paymentForm,
      amount: paymentForm.amount
    };

    createPaymentMutation.mutate({ repId: selectedRep.id, paymentData });
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const reps = salesReps || [];
  const totalReps = reps.length;
  const activeReps = reps.filter((rep: SalesRep) => rep.isActive).length;
  const totalEarnings = reps.reduce((sum: number, rep: SalesRep) => sum + rep.totalEarnings, 0);
  const totalCommissions = reps.reduce((sum: number, rep: SalesRep) => sum + rep.commissionCount, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales Representatives</h1>
            <p className="text-muted-foreground">Manage sales reps and track commission earnings</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Sales Rep
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reps</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReps}</div>
              <p className="text-xs text-muted-foreground">
                {activeReps} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
              <p className="text-xs text-muted-foreground">
                From {totalCommissions} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Commission</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalCommissions > 0 ? formatCurrency(totalEarnings / totalCommissions) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per order
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Reps</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeReps}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((activeReps / Math.max(totalReps, 1)) * 100)}% of total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sales Reps Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Representatives</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Commission Rate</TableHead>
                  <TableHead>Total Earnings</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reps.map((rep: SalesRep) => (
                  <TableRow key={rep.id}>
                    <TableCell className="font-medium">
                      {rep.firstName} {rep.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{rep.repCode}</Badge>
                    </TableCell>
                    <TableCell>{rep.email}</TableCell>
                    <TableCell>{rep.commissionRate}%</TableCell>
                    <TableCell>{formatCurrency(rep.totalEarnings)}</TableCell>
                    <TableCell>{rep.commissionCount}</TableCell>
                    <TableCell>
                      <Badge variant={rep.isActive ? "default" : "secondary"}>
                        {rep.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCommissions(rep)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRep(rep)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Commissions Detail Dialog */}
        {showCommissionsDialog && selectedRep && (
          <Dialog open={showCommissionsDialog} onOpenChange={setShowCommissionsDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedRep.firstName} {selectedRep.lastName} - Commission Details
                </DialogTitle>
                <DialogDescription>
                  Rep Code: {selectedRep.repCode} | Total Earnings: {formatCurrency(selectedRep.totalEarnings)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Commission History</h3>
                  <Button onClick={() => setShowPaymentDialog(true)}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Order Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell>{formatDate(commission.createdAt)}</TableCell>
                        <TableCell>#{commission.orderId}</TableCell>
                        <TableCell>{formatCurrency(commission.orderAmount)}</TableCell>
                        <TableCell>{formatCurrency(commission.commissionAmount)}</TableCell>
                        <TableCell>{commission.commissionRate * 100}%</TableCell>
                        <TableCell>
                          <Badge variant={commission.status === 'earned' ? 'default' : commission.status === 'paid' ? 'secondary' : 'destructive'}>
                            {commission.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Payment History</h3>
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
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.createdAt)}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>{payment.paymentMethod}</TableCell>
                          <TableCell>{payment.referenceNumber || '-'}</TableCell>
                          <TableCell>{payment.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Create Rep Dialog */}
        {showCreateDialog && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Sales Rep</DialogTitle>
                <DialogDescription>
                  Create a new sales representative to track commissions and earnings.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={repForm.firstName}
                      onChange={(e) => setRepForm({ ...repForm, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={repForm.lastName}
                      onChange={(e) => setRepForm({ ...repForm, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={repForm.email}
                    onChange={(e) => setRepForm({ ...repForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={repForm.phoneNumber}
                    onChange={(e) => setRepForm({ ...repForm, phoneNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="repCode">Rep Code</Label>
                  <Input
                    id="repCode"
                    value={repForm.repCode}
                    onChange={(e) => setRepForm({ ...repForm, repCode: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    value={repForm.commissionRate}
                    onChange={(e) => setRepForm({ ...repForm, commissionRate: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={repForm.notes}
                    onChange={(e) => setRepForm({ ...repForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => createRepMutation.mutate(repForm)}>
                  Create Rep
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Rep Dialog */}
        {showEditDialog && selectedRep && (
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Sales Rep</DialogTitle>
                <DialogDescription>
                  Update information for {selectedRep.firstName} {selectedRep.lastName}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={repForm.firstName}
                      onChange={(e) => setRepForm({ ...repForm, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={repForm.lastName}
                      onChange={(e) => setRepForm({ ...repForm, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={repForm.email}
                    onChange={(e) => setRepForm({ ...repForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={repForm.phoneNumber}
                    onChange={(e) => setRepForm({ ...repForm, phoneNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="repCode">Rep Code</Label>
                  <Input
                    id="repCode"
                    value={repForm.repCode}
                    onChange={(e) => setRepForm({ ...repForm, repCode: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    value={repForm.commissionRate}
                    onChange={(e) => setRepForm({ ...repForm, commissionRate: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={repForm.notes}
                    onChange={(e) => setRepForm({ ...repForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => updateRepMutation.mutate({ id: selectedRep.id, data: repForm })}>
                  Update Rep
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Payment Dialog */}
        {showPaymentDialog && selectedRep && (
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>
                  Record a commission payment for {selectedRep.firstName} {selectedRep.lastName}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="amount">Amount (ZAR)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentForm.paymentMethod} onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentMethod: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePayment}>
                  Record Payment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}