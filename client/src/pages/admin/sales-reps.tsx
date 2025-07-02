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
import { Users, DollarSign, TrendingUp, Plus, Edit2, Eye, Calendar, Share2, Copy, MessageCircle } from "lucide-react";
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
  totalPaid?: number;
  amountOwed?: number;
}

interface Commission {
  id: number;
  orderId: number;
  userId: number;
  commissionAmount: number;
  orderAmount: number;
  commissionRate: number;
  totalProfitAmount?: number; // Enhanced tracking
  totalCustomerPaidAmount?: number; // Enhanced tracking
  totalCostAmount?: number; // Enhanced tracking
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState<SalesRep | null>(null);
  const [selectedRepCommissions, setSelectedRepCommissions] = useState<Commission[]>([]);
  const [selectedRepPayments, setSelectedRepPayments] = useState<Payment[]>([]);
  const [showCommissions, setShowCommissions] = useState(false);
  const [newRep, setNewRep] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    repCode: '',
    commissionRate: 3,
    notes: ''
  });
  const [newPayment, setNewPayment] = useState({
    amount: '',
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    notes: ''
  });

  const [editRep, setEditRep] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    repCode: string;
    commissionRate: number;
    notes: string;
    isActive: boolean;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    repCode: '',
    commissionRate: 3,
    notes: '',
    isActive: true
  });

  const { toast } = useToast();

  // Generate registration URL for a rep
  const generateRegistrationUrl = (repCode: string) => {
    const baseUrl = 'https://teemeyou.shop';
    return `${baseUrl}/auth?tab=register&repCode=${encodeURIComponent(repCode)}`;
  };

  // Share registration URL via WhatsApp
  const shareToWhatsApp = (rep: SalesRep) => {
    const registrationUrl = generateRegistrationUrl(rep.repCode);
    const message = `🎯 Join TeeMeYou with my sales rep code!
    
👋 Hi! I'm ${rep.firstName} ${rep.lastName}, your TeeMeYou sales representative.

📝 Use this special link to register and I'll be your dedicated contact:
${registrationUrl}

✅ Your rep code "${rep.repCode}" will be automatically filled in
💰 Get the best deals and personalized service
📞 Direct support from me for all your orders

Register now and start shopping! 🛍️`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Copy registration URL to clipboard
  const copyRegistrationUrl = async (rep: SalesRep) => {
    const registrationUrl = generateRegistrationUrl(rep.repCode);
    try {
      await navigator.clipboard.writeText(registrationUrl);
      toast({
        title: "URL Copied!",
        description: `Registration URL for ${rep.firstName} ${rep.lastName} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy URL to clipboard",
        variant: "destructive"
      });
    }
  };
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
    mutationFn: (repData: any) => apiRequest('POST', '/api/admin/sales-reps', repData),
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
      apiRequest('PUT', `/api/admin/sales-reps/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      setIsEditDialogOpen(false);
      setSelectedRep(null);
      toast({
        title: "Success",
        description: "Sales rep updated successfully"
      });
    },
    onError: (error: any) => {
      console.error('Update rep error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update sales rep",
        variant: "destructive"
      });
    }
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: ({ repId, paymentData }: { repId: number, paymentData: any }) =>
      apiRequest('POST', `/api/admin/sales-reps/${repId}/payments`, paymentData),
    onSuccess: () => {
      // Invalidate all related queries to force fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/sales-reps/${selectedRep?.id}/commissions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/sales-reps/${selectedRep?.id}/payments`] });
      
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
      
      // Reload data to update UI with fresh information
      if (selectedRep) {
        loadRepCommissions(selectedRep.id);
        loadRepPayments(selectedRep.id);
      }
      if (selectedRep && showCommissions) {
        loadRepCommissions(selectedRep.id);
        loadRepPayments(selectedRep.id);
      }
    }
  });

  const loadRepCommissions = async (repId: number) => {
    try {
      // Force fresh data by clearing cache first
      queryClient.removeQueries({ queryKey: [`/api/admin/sales-reps/${repId}/commissions`] });
      
      const response = await fetch(`/api/admin/sales-reps/${repId}/commissions`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      console.log('Commission response:', data);
      // The response structure includes pagination and commissions array
      setSelectedRepCommissions(data.data?.commissions || []);
    } catch (error) {
      console.error('Error loading commissions:', error);
      toast({
        title: "Error",
        description: "Failed to load commissions",
        variant: "destructive"
      });
    }
  };

  const loadRepPayments = async (repId: number) => {
    try {
      // Force fresh data by clearing cache first
      queryClient.removeQueries({ queryKey: [`/api/admin/sales-reps/${repId}/payments`] });
      
      const response = await fetch(`/api/admin/sales-reps/${repId}/payments`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      console.log('Payments response:', data);
      setSelectedRepPayments(data.data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive"
      });
    }
  };

  const handleViewCommissions = async (rep: SalesRep) => {
    // Clear all related cache first
    queryClient.removeQueries({ queryKey: ['/api/admin/sales-reps'] });
    queryClient.removeQueries({ queryKey: [`/api/admin/sales-reps/${rep.id}/commissions`] });
    queryClient.removeQueries({ queryKey: [`/api/admin/sales-reps/${rep.id}/payments`] });
    
    setSelectedRep(rep);
    setShowCommissions(true);
    await loadRepCommissions(rep.id);
    await loadRepPayments(rep.id);
  };

  const handleRecordPayment = () => {
    if (!selectedRep) return;
    
    // Calculate outstanding amount from unpaid commissions
    const unpaidCommissions = selectedRepCommissions.filter(c => c.status === 'earned');
    const amountOwed = unpaidCommissions.reduce((sum, comm) => sum + Number(comm.commissionAmount), 0);
    
    // Check if there's no outstanding amount
    if (amountOwed <= 0) {
      toast({
        title: "No Outstanding Amount",
        description: `${selectedRep.firstName} ${selectedRep.lastName} has no outstanding commissions to pay. All earnings have been paid.`,
        variant: "default"
      });
      return;
    }
    
    // Auto-generate reference number in format {repCode}-{##}-{ddmmyy}
    const today = new Date();
    const ddmmyy = today.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit' 
    }).replace(/\//g, '');
    
    // Since this is frontend-generated, we'll use 01 as placeholder sequential number
    // The backend will generate the correct sequential number when the payment is created
    const autoReferenceNumber = `${selectedRep.repCode}-01-${ddmmyy}`;
    
    // Pre-fill the payment form with the calculated amount owed and auto-generated reference
    setNewPayment({
      amount: amountOwed.toFixed(2),
      paymentMethod: 'credit',
      referenceNumber: autoReferenceNumber,
      notes: ''
    });
    
    setIsPaymentDialogOpen(true);
  };

  const handleCreatePayment = () => {
    if (!selectedRep) return;
    
    const paymentData = {
      ...newPayment,
      amount: parseFloat(newPayment.amount)
    };

    createPaymentMutation.mutate({ repId: selectedRep.id, paymentData });
  };

  const handleEditRep = (rep: SalesRep) => {
    setSelectedRep(rep);
    setEditRep({
      firstName: rep.firstName,
      lastName: rep.lastName,
      email: rep.email,
      phoneNumber: rep.phoneNumber,
      repCode: rep.repCode,
      commissionRate: parseFloat(rep.commissionRate.toString()),
      notes: rep.notes || '',
      isActive: rep.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateRep = () => {
    if (!selectedRep) return;
    
    console.log('Updating rep with data:', {
      id: selectedRep.id,
      data: editRep
    });
    
    updateRepMutation.mutate({
      id: selectedRep.id,
      data: editRep
    });
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
        <Button onClick={() => setIsCreateDialogOpen(true)}>
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
                    <div className="flex space-x-1">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => shareToWhatsApp(rep)}
                        title="Share registration URL to WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyRegistrationUrl(rep)}
                        title="Copy registration URL to clipboard"
                      >
                        <Copy className="w-4 h-4" />
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
                <Button onClick={() => handleRecordPayment()}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer Paid</TableHead>
                    <TableHead>Cost Amount</TableHead>
                    <TableHead>Profit Amount</TableHead>
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
                      <TableCell>{formatCurrency(commission.totalCustomerPaidAmount || commission.orderAmount)}</TableCell>
                      <TableCell>{formatCurrency(commission.totalCostAmount || 0)}</TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {formatCurrency(commission.totalProfitAmount || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatCurrency(commission.commissionAmount)}
                        </span>
                      </TableCell>
                      <TableCell>{commission.commissionRate * 100}%</TableCell>
                      <TableCell>
                        {commission.status === 'paid' ? (
                          <Badge className="bg-green-600 text-white hover:bg-green-700">
                            Paid
                          </Badge>
                        ) : commission.status === 'earned' ? (
                          <Badge className="bg-pink-500 text-white hover:bg-pink-600">
                            earned
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            {commission.status}
                          </Badge>
                        )}
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

      {/* Edit Rep Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sales Rep</DialogTitle>
            <DialogDescription>
              Update sales representative information
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={editRep.firstName}
                  onChange={(e) => setEditRep({...editRep, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  value={editRep.lastName}
                  onChange={(e) => setEditRep({...editRep, lastName: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={editRep.email}
                onChange={(e) => setEditRep({...editRep, email: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPhoneNumber">Phone Number</Label>
                <Input
                  id="editPhoneNumber"
                  value={editRep.phoneNumber}
                  onChange={(e) => setEditRep({...editRep, phoneNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRepCode">Rep Code</Label>
                <Input
                  id="editRepCode"
                  value={editRep.repCode}
                  onChange={(e) => setEditRep({...editRep, repCode: e.target.value.toUpperCase()})}
                  placeholder="e.g. REP001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editCommissionRate">Commission Rate (%)</Label>
                <Input
                  id="editCommissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editRep.commissionRate}
                  onChange={(e) => setEditRep({...editRep, commissionRate: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editIsActive">Status</Label>
                <select
                  id="editIsActive"
                  className="w-full p-2 border rounded-md"
                  value={editRep.isActive.toString()}
                  onChange={(e) => setEditRep({...editRep, isActive: e.target.value === 'true'})}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                value={editRep.notes}
                onChange={(e) => setEditRep({...editRep, notes: e.target.value})}
                placeholder="Optional notes about this sales rep"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateRep}
              disabled={updateRepMutation.isPending}
            >
              {updateRepMutation.isPending ? "Updating..." : "Update Rep"}
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
                <option value="credit">Store Credit</option>
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