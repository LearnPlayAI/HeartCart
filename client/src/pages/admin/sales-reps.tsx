import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  // Fetch sales reps overview with server-side calculations
  const { data: overviewResponse, isLoading } = useQuery({
    queryKey: ['/api/admin/sales-reps/overview']
  });

  const salesReps = Array.isArray(overviewResponse?.data?.salesReps) ? overviewResponse.data.salesReps : [];
  const statistics = overviewResponse?.data?.statistics || {
    totalEarnings: 0,
    totalCommissions: 0,
    avgCommissionRate: 0,
    activeRepsCount: 0,
    totalReps: 0,
    totalOutstandingPayments: 0
  };

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-t-4 border-t-pink-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Reps</CardTitle>
              <Users className="h-4 w-4 text-pink-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.activeRepsCount}</div>
              <p className="text-xs text-muted-foreground">
                of {statistics.totalReps} total
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalCommissions}</div>
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
              <div className="text-2xl font-bold">{formatCurrency(statistics.totalEarnings)}</div>
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
                {statistics.avgCommissionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                average rate
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics.totalOutstandingPayments)}</div>
              <p className="text-xs text-muted-foreground">
                amount owed
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {salesReps.map((rep: SalesRep) => (
                  <Card key={rep.id} className="border-l-4 border-l-pink-500 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {rep.firstName} {rep.lastName}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant={rep.isActive ? "default" : "secondary"}
                              className={rep.isActive ? "bg-green-100 text-green-800" : ""}
                            >
                              {rep.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-sm font-mono text-pink-600 font-medium">
                              {rep.repCode}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {rep.commissionRate}% rate
                          </div>
                          <div className="text-xs text-gray-500">
                            Since {formatDate(rep.createdAt)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-4">
                      {/* Contact Information */}
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-500">Email:</span>
                          <div className="font-medium text-gray-900">{rep.email}</div>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Phone:</span>
                          <div className="font-medium text-gray-900">
                            {rep.phoneNumber || 'No phone number'}
                          </div>
                        </div>
                      </div>

                      {/* Performance Stats */}
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Earnings</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(rep.totalEarnings || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Commissions</span>
                          <span className="font-medium text-gray-900">
                            {rep.commissionCount || 0}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/admin/sales-reps/${rep.id}/edit`)}
                          className="flex flex-col items-center gap-1 h-auto py-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="text-xs">Edit</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/admin/sales-reps/${rep.id}/commissions`)}
                          className="flex flex-col items-center gap-1 h-auto py-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-xs">View</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/admin/sales-reps/${rep.id}/record-payment`)}
                          className="flex flex-col items-center gap-1 h-auto py-2"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span className="text-xs">Pay</span>
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/admin/sales-reps/${rep.id}/manage-users`)}
                          className="flex flex-col items-center gap-1 h-auto py-2"
                        >
                          <UserCog className="w-4 h-4" />
                          <span className="text-xs">Users</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => shareToWhatsApp(rep)}
                          className="flex flex-col items-center gap-1 h-auto py-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs">Share</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyRegistrationUrl(rep)}
                          className="flex flex-col items-center gap-1 h-auto py-2"
                        >
                          <Copy className="w-4 h-4" />
                          <span className="text-xs">Copy</span>
                        </Button>
                      </div>

                      {/* Notes if available */}
                      {rep.notes && (
                        <div className="pt-2 border-t border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">Notes:</div>
                          <div className="text-sm text-gray-700 italic">
                            {rep.notes.length > 100 ? `${rep.notes.substring(0, 100)}...` : rep.notes}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}