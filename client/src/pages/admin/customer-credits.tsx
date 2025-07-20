import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Search, Plus, Eye, DollarSign, Users, Activity, TrendingUp, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Form schemas
const addCreditSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
});

type AddCreditForm = z.infer<typeof addCreditSchema>;

// Credit Overview Cards Component
function CreditOverviewCards() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["/api/credits/admin/overview"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = overview?.data || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Credits Issued</p>
              <p className="text-2xl font-bold text-pink-600">
                R{stats.totalCreditsIssued?.toFixed(2) || '0.00'}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-pink-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Credits Used</p>
              <p className="text-2xl font-bold text-green-600">
                R{stats.totalCreditsUsed?.toFixed(2) || '0.00'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Outstanding Credits</p>
              <p className="text-2xl font-bold text-orange-600">
                R{stats.totalOutstandingCredits?.toFixed(2) || '0.00'}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Customers with Credits</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.totalCustomersWithCredits || 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Add Credits Modal Component
function AddCreditsModal({ customerId, customerName, onSuccess }: { customerId: number, customerName: string, onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddCreditForm>({
    resolver: zodResolver(addCreditSchema),
    defaultValues: {
      amount: 0,
      description: "",
    },
  });

  const addCreditMutation = useMutation({
    mutationFn: async (data: AddCreditForm) => {
      return apiRequest(`/api/credits/admin/${customerId}/adjust`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credits/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/admin/overview"] });
      toast({
        title: "Success",
        description: "Credits added successfully",
      });
      setOpen(false);
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add credits",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddCreditForm) => {
    addCreditMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Credits
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Credits to {customerName}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Amount (R)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Reason for adding credits..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addCreditMutation.isPending}>
                {addCreditMutation.isPending ? "Adding..." : "Add Credits"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Customer Transactions Modal Component
function CustomerTransactionsModal({ customerId, customerName }: { customerId: number, customerName: string }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: transactionsResponse, isLoading } = useQuery({
    queryKey: ["/api/credits/admin/transactions", customerId, page],
    queryFn: () => apiRequest(`/api/credits/admin/transactions?userId=${customerId}&page=${page}&limit=${limit}`),
    enabled: open,
  });

  const transactions = transactionsResponse?.data || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          View Transactions
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Credit Transactions - {customerName}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction: any) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.transactionType === 'earned' ? 'default' : 'secondary'}>
                        {transaction.transactionType}
                      </Badge>
                    </TableCell>
                    <TableCell className={transaction.transactionType === 'earned' ? 'text-green-600' : 'text-red-600'}>
                      {transaction.transactionType === 'earned' ? '+' : '-'}R{parseFloat(transaction.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      {transaction.order?.orderNumber || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {transactions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No transactions found for this customer.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Credit Reminder Modal Component
function CreditReminderModal({ customerId, customerName, customerEmail, availableCredit }: { 
  customerId: number; 
  customerName: string; 
  customerEmail: string; 
  availableCredit: number; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/credits/admin/send-reminder", {
        method: "POST",
        body: JSON.stringify({ userId: customerId }),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Reminder Email Sent",
        description: `Credit reminder email sent successfully to ${customerEmail}`,
      });
      setIsOpen(false);
      // Refresh any relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/credits/admin/customers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Email Failed",
        description: error.error || "Failed to send reminder email",
        variant: "destructive",
      });
    },
  });

  const handleSendReminder = () => {
    setIsLoading(true);
    sendReminderMutation.mutate();
    setIsLoading(false);
  };

  // Don't show reminder button if customer has no available credit
  if (availableCredit <= 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="h-3 w-3 mr-1" />
          Remind
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Credit Reminder Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
            <div className="flex items-center space-x-2 mb-2">
              <Mail className="h-5 w-5 text-pink-600" />
              <h3 className="font-medium text-pink-900">Email Details</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Customer:</strong> {customerName}</p>
              <p><strong>Email:</strong> {customerEmail}</p>
              <p><strong>Available Credit:</strong> <span className="text-pink-600 font-semibold">R{availableCredit.toFixed(2)}</span></p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Email Content Preview:</h4>
            <p className="text-sm text-gray-600">
              The customer will receive a beautifully styled email reminding them of their available store credit 
              and encouraging them to shop on the website. The email includes their credit balance and a call-to-action 
              button to visit the store.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendReminder} 
              disabled={isLoading || sendReminderMutation.isPending}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {isLoading || sendReminderMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3 mr-2" />
                  Send Reminder Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Customer Credits Page Component
export default function CustomerCreditsPage() {
  const [search, setSearch] = useState("");
  const [hasCredits, setHasCredits] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data: customersResponse, isLoading, refetch } = useQuery({
    queryKey: ["/api/credits/admin/customers", page, search, hasCredits],
    queryFn: () => apiRequest(`/api/credits/admin/customers?page=${page}&limit=${limit}&search=${search}&hasCredits=${hasCredits}`),
    staleTime: 0,
  });

  const customers = customersResponse?.data || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customer Credits</h1>
            <p className="text-gray-600">
              Manage customer credit balances and transaction history
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <CreditOverviewCards />

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Credit Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search customers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={hasCredits ? "true" : "false"} onValueChange={(value) => setHasCredits(value === "true")}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by credits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">All Customers</SelectItem>
                  <SelectItem value="true">With Credits Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer Table */}
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Credits</TableHead>
                    <TableHead>Available Credits</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer: any) => (
                    <TableRow key={customer.userId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.fullName || customer.username}</p>
                          <p className="text-sm text-gray-500">@{customer.username}</p>
                        </div>
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          R{parseFloat(customer.totalCreditAmount).toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.hasCredits ? "default" : "secondary"}>
                          R{parseFloat(customer.availableCreditAmount).toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {customer.transactionCount} transactions
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {customer.lastActivity ? format(new Date(customer.lastActivity), "dd/MM/yyyy") : "Never"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <AddCreditsModal
                            customerId={customer.userId}
                            customerName={customer.fullName || customer.username}
                            onSuccess={() => refetch()}
                          />
                          <CustomerTransactionsModal
                            customerId={customer.userId}
                            customerName={customer.fullName || customer.username}
                          />
                          <CreditReminderModal
                            customerId={customer.userId}
                            customerName={customer.fullName || customer.username}
                            customerEmail={customer.email}
                            availableCredit={parseFloat(customer.availableCreditAmount)}
                          />
                          <CreditReminderModal
                            customerId={customer.userId}
                            customerName={customer.fullName || customer.username}
                            customerEmail={customer.email}
                            availableCredit={parseFloat(customer.availableCreditAmount)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {customers.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                No customers found matching your criteria.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}