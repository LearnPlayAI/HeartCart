import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Edit2, User, Save } from "lucide-react";
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

export default function EditSalesRepPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const repId = parseInt(params.id || '0');

  const [editRep, setEditRep] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    repCode: '',
    commissionRate: 3,
    notes: '',
    isActive: true
  });

  // Fetch sales rep data
  const { data: salesRepsResponse, isLoading } = useQuery({
    queryKey: ['/api/admin/sales-reps'],
    refetchOnWindowFocus: true
  });

  const salesReps = Array.isArray(salesRepsResponse?.data) ? salesRepsResponse.data : 
                    Array.isArray(salesRepsResponse) ? salesRepsResponse : [];
  const selectedRep = salesReps.find((rep: SalesRep) => rep.id === repId);

  // Populate form when rep data is loaded
  useEffect(() => {
    if (selectedRep) {
      setEditRep({
        firstName: selectedRep.firstName,
        lastName: selectedRep.lastName,
        email: selectedRep.email,
        phoneNumber: selectedRep.phoneNumber || '',
        repCode: selectedRep.repCode,
        commissionRate: parseFloat(selectedRep.commissionRate.toString()),
        notes: selectedRep.notes || '',
        isActive: selectedRep.isActive
      });
    }
  }, [selectedRep]);

  // Update sales rep mutation
  const updateRepMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PUT', `/api/admin/sales-reps/${repId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      toast({
        title: "Success",
        description: "Sales representative updated successfully",
      });
      setLocation('/admin/sales-reps');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sales rep",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRep.firstName || !editRep.lastName || !editRep.email || !editRep.repCode) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    updateRepMutation.mutate(editRep);
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
            onClick={() => setLocation('/admin/sales-reps')}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Edit Sales Rep</h1>
            <p className="text-muted-foreground">Update {selectedRep.firstName} {selectedRep.lastName}'s information</p>
          </div>
        </div>

        {/* Edit Form */}
        <Card className="border-t-4 border-t-pink-500">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100 border-b">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Edit2 className="w-5 h-5 text-pink-500" />
              Sales Representative Details
            </CardTitle>
            <CardDescription>
              Update the information for this sales representative
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={editRep.firstName}
                    onChange={(e) => setEditRep({...editRep, firstName: e.target.value})}
                    className="focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={editRep.lastName}
                    onChange={(e) => setEditRep({...editRep, lastName: e.target.value})}
                    className="focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={editRep.email}
                  onChange={(e) => setEditRep({...editRep, email: e.target.value})}
                  className="focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Enter email address"
                />
              </div>

              {/* Phone and Rep Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={editRep.phoneNumber}
                    onChange={(e) => setEditRep({...editRep, phoneNumber: e.target.value})}
                    className="focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repCode" className="text-sm font-medium">
                    Rep Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="repCode"
                    value={editRep.repCode}
                    onChange={(e) => setEditRep({...editRep, repCode: e.target.value.toUpperCase()})}
                    className="focus:ring-pink-500 focus:border-pink-500"
                    placeholder="e.g. REP001"
                  />
                </div>
              </div>

              {/* Commission Rate */}
              <div className="space-y-2">
                <Label htmlFor="commissionRate" className="text-sm font-medium">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editRep.commissionRate}
                  onChange={(e) => setEditRep({...editRep, commissionRate: parseFloat(e.target.value)})}
                  className="focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Enter commission rate"
                />
                <p className="text-xs text-gray-500">The percentage of profit this rep will earn on sales</p>
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={editRep.isActive}
                  onCheckedChange={(checked) => setEditRep({...editRep, isActive: checked})}
                />
                <Label htmlFor="isActive" className="text-sm font-medium">
                  Active Status
                </Label>
                <span className="text-xs text-gray-500">
                  ({editRep.isActive ? 'Active' : 'Inactive'})
                </span>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  value={editRep.notes}
                  onChange={(e) => setEditRep({...editRep, notes: e.target.value})}
                  className="focus:ring-pink-500 focus:border-pink-500 min-h-[80px]"
                  placeholder="Optional notes about this sales rep"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/admin/sales-reps')}
                  className="sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateRepMutation.isPending}
                  className="bg-pink-500 hover:bg-pink-600 text-white sm:w-auto"
                >
                  {updateRepMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Sales Rep
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