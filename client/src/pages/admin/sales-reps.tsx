import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, DollarSign, TrendingUp, Plus, Edit2, Eye, Calendar } from "lucide-react";
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

export default function SalesRepsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCommissionsDialog, setShowCommissionsDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedRep, setSelectedRep] = useState<SalesRep | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [selectedRepPayments, setSelectedRepPayments] = useState<Payment[]>([]);
  const [showCommissions, setShowCommissions] = useState(false);
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
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Extract the actual data array from the API response
  console.log('Sales reps response:', salesRepsResponse);
  const salesReps = Array.isArray(salesRepsResponse?.data) ? salesRepsResponse.data : 
                    Array.isArray(salesRepsResponse) ? salesRepsResponse : [];
  console.log('Processed sales reps:', salesReps);

  // Create sales rep mutation
  const createRepMutation = useMutation({
    mutationFn: (repData: any) => apiRequest('/api/admin/sales-reps', {
      method: 'POST',
      body: JSON.stringify(repData)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      setIsCreateDialogOpen(false);
      setNewRep({
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
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sales rep",
        variant: "destructive"
      });
    }
  });

  // Update sales rep mutation
  const updateRepMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => 
      apiRequest(`/api/admin/sales-reps/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      setIsEditDialogOpen(false);
      setSelectedRep(null);
      toast({
        title: "Success",
        description: "Sales rep updated successfully"
      });
    }
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: ({ repId, paymentData }: { repId: number, paymentData: any }) =>
      apiRequest(`/api/admin/sales-reps/${repId}/payments`, {
        method: 'POST',
        body: JSON.stringify(paymentData)
      }),
    onSuccess: () => {
      setIsPaymentDialogOpen(false);
      setNewPayment({
        amount: '',
        paymentMethod: 'bank_transfer',
        referenceNumber: '',
        notes: ''
      });
      toast({
        title: "Success",
        description: "Payment recorded successfully"
      });
      // Refresh commissions if showing them
      if (selectedRep && showCommissions) {
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
      const payments = await apiRequest(`/api/admin/sales-reps/${repId}/payments`);
      setSelectedRepPayments(payments || []);
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
    setShowCommissions(true);
    await loadRepCommissions(rep.id);
    await loadRepPayments(rep.id);
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
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
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
              Across all reps
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCommissions}</div>
            <p className="text-xs text-muted-foreground">
              Orders processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Commission</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
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
      </div>

      {/* Sales Reps Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Representatives</CardTitle>
          <CardDescription>
            Manage your sales team and track their performance
          </CardDescription>
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
                        onClick={() => {
                          setSelectedRep(rep);
                          setShowEditDialog(true);
                        }}
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
      {showCommissions && selectedRep && (
        <Dialog open={showCommissions} onOpenChange={setShowCommissions}>
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
                <Button onClick={() => setIsPaymentDialogOpen(true)}>
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
                  {selectedRepCommissions.map((commission) => (
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

              {selectedRepPayments.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold">Payment History</h3>
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
                      {selectedRepPayments.map((payment) => (
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
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Rep Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Sales Rep</DialogTitle>
            <DialogDescription>
              Create a new sales representative account
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={newRep.firstName}
                  onChange={(e) => setNewRep({...newRep, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={newRep.lastName}
                  onChange={(e) => setNewRep({...newRep, lastName: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newRep.email}
                onChange={(e) => setNewRep({...newRep, email: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={newRep.phoneNumber}
                  onChange={(e) => setNewRep({...newRep, phoneNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repCode">Rep Code</Label>
                <Input
                  id="repCode"
                  value={newRep.repCode}
                  onChange={(e) => setNewRep({...newRep, repCode: e.target.value.toUpperCase()})}
                  placeholder="e.g. REP001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commissionRate">Commission Rate (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={newRep.commissionRate}
                onChange={(e) => setNewRep({...newRep, commissionRate: parseFloat(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newRep.notes}
                onChange={(e) => setNewRep({...newRep, notes: e.target.value})}
                placeholder="Optional notes about this sales rep"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createRepMutation.mutate(newRep)}
              disabled={createRepMutation.isPending}
            >
              {createRepMutation.isPending ? "Creating..." : "Create Rep"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a commission payment for {selectedRep?.firstName} {selectedRep?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <select
                id="paymentMethod"
                className="w-full p-2 border rounded-md"
                value={newPayment.paymentMethod}
                onChange={(e) => setNewPayment({...newPayment, paymentMethod: e.target.value})}
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                value={newPayment.referenceNumber}
                onChange={(e) => setNewPayment({...newPayment, referenceNumber: e.target.value})}
                placeholder="Transaction reference (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notes</Label>
              <Textarea
                id="paymentNotes"
                value={newPayment.notes}
                onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                placeholder="Payment details or notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePayment}
              disabled={createPaymentMutation.isPending || !newPayment.amount}
            >
              {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminLayout>
  );
}