import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, DollarSign, TrendingUp, Plus, Edit2, Eye, Calendar, Share2, Copy, MessageCircle, UserCog } from "lucide-react";
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

export default function SalesRepsPage() {
  const [, setLocation] = useLocation();

  // Fetch sales reps
  const { data: salesRepsResponse, isLoading } = useQuery({
    queryKey: ['/api/admin/sales-reps']
  });

  const salesReps = Array.isArray(salesRepsResponse?.data) ? salesRepsResponse.data : 
                    Array.isArray(salesRepsResponse) ? salesRepsResponse : [];

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
      // Success feedback could be added here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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

  // Calculate total earnings across all reps
  const totalEarnings = salesReps.reduce((sum: number, rep: SalesRep) => sum + (rep.totalEarnings || 0), 0);
  const totalCommissions = salesReps.reduce((sum: number, rep: SalesRep) => sum + (rep.commissionCount || 0), 0);
  const activeRepsCount = salesReps.filter((rep: SalesRep) => rep.isActive).length;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sales Representatives</h1>
            <p className="text-muted-foreground">
              Manage your sales team and track commission performance
            </p>
          </div>
          <Button 
            onClick={() => setLocation('/admin/sales-reps/create')}
            className="bg-pink-500 hover:bg-pink-600 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Sales Rep
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-t-4 border-t-pink-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Reps</CardTitle>
              <Users className="h-4 w-4 text-pink-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeRepsCount}</div>
              <p className="text-xs text-muted-foreground">
                of {salesReps.length} total
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCommissions}</div>
              <p className="text-xs text-muted-foreground">
                commission entries
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
              <p className="text-xs text-muted-foreground">
                across all reps
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Commission Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesReps.length > 0 
                  ? (salesReps.reduce((sum: number, rep: SalesRep) => sum + rep.commissionRate, 0) / salesReps.length).toFixed(1)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                average rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sales Reps Table */}
        <Card className="border-t-4 border-t-gray-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              Sales Representatives
            </CardTitle>
            <CardDescription>
              Manage your sales team members and their performance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {salesReps.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No Sales Representatives</p>
                <p className="mb-4">Start building your sales team by adding your first rep.</p>
                <Button 
                  onClick={() => setLocation('/admin/sales-reps/create')}
                  className="bg-pink-500 hover:bg-pink-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Sales Rep
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rep Details</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesReps.map((rep: SalesRep) => (
                      <TableRow key={rep.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rep.firstName} {rep.lastName}</div>
                            <div className="text-sm text-gray-500 font-mono">
                              {rep.repCode} • {rep.commissionRate}% rate
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{rep.email}</div>
                            <div className="text-sm text-gray-500">
                              {rep.phoneNumber || 'No phone'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium">
                              {formatCurrency(rep.totalEarnings || 0)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {rep.commissionCount || 0} commissions
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={rep.isActive ? "default" : "secondary"}>
                              {rep.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              Since {formatDate(rep.createdAt)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {/* Edit Rep */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLocation(`/admin/sales-reps/${rep.id}/edit`)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>

                            {/* View Commissions */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLocation(`/admin/sales-reps/${rep.id}/commissions`)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>

                            {/* Record Payment */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLocation(`/admin/sales-reps/${rep.id}/record-payment`)}
                              className="h-8 w-8 p-0"
                            >
                              <DollarSign className="w-3 h-3" />
                            </Button>

                            {/* Manage Users */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLocation(`/admin/sales-reps/${rep.id}/manage-users`)}
                              className="h-8 w-8 p-0"
                            >
                              <UserCog className="w-3 h-3" />
                            </Button>

                            {/* Share Registration URL */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => shareToWhatsApp(rep)}
                              className="h-8 w-8 p-0"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </Button>

                            {/* Copy Registration URL */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyRegistrationUrl(rep)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}