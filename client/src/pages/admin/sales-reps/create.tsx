import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, User } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout";

export default function CreateSalesRepPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newRep, setNewRep] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    repCode: '',
    commissionRate: 3,
    notes: '',
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    branchCode: ''
  });

  // Create sales rep mutation
  const createRepMutation = useMutation({
    mutationFn: (repData: any) => apiRequest('POST', '/api/admin/sales-reps', repData),
    onSuccess: () => {
      // Invalidate all sales rep related caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps/overview'] });
      
      toast({
        title: "Success",
        description: "Sales representative created successfully",
      });
      setLocation('/admin/sales-reps');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sales rep",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRep.firstName || !newRep.lastName || !newRep.email || !newRep.repCode) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    createRepMutation.mutate(newRep);
  };

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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Add New Sales Rep</h1>
            <p className="text-muted-foreground">Create a new sales representative account with commission tracking</p>
          </div>
        </div>

        {/* Create Form */}
        <Card className="border-t-4 border-t-pink-500">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100 border-b">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Plus className="w-5 h-5 text-pink-500" />
              Sales Representative Details
            </CardTitle>
            <CardDescription>
              Enter the information for the new sales representative
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
                    value={newRep.firstName}
                    onChange={(e) => setNewRep({...newRep, firstName: e.target.value})}
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
                    value={newRep.lastName}
                    onChange={(e) => setNewRep({...newRep, lastName: e.target.value})}
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
                  value={newRep.email}
                  onChange={(e) => setNewRep({...newRep, email: e.target.value})}
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
                    value={newRep.phoneNumber}
                    onChange={(e) => setNewRep({...newRep, phoneNumber: e.target.value})}
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
                    value={newRep.repCode}
                    onChange={(e) => setNewRep({...newRep, repCode: e.target.value.toUpperCase()})}
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
                  step="1"
                  value={newRep.commissionRate}
                  onChange={(e) => setNewRep({...newRep, commissionRate: parseInt(e.target.value) || 0})}
                  className="focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Enter commission rate (e.g. 5 for 5%)"
                />
                <p className="text-xs text-gray-500">Enter whole numbers only (e.g., 5 = 5%, 10 = 10%)</p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  value={newRep.notes}
                  onChange={(e) => setNewRep({...newRep, notes: e.target.value})}
                  className="focus:ring-pink-500 focus:border-pink-500 min-h-[80px]"
                  placeholder="Optional notes about this sales rep"
                />
              </div>

              {/* Banking Details Section */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Banking Details (Optional)</h3>
                <p className="text-sm text-gray-600">Add banking details for bank transfer payments. This can be added later if needed.</p>
                
                <div className="space-y-4">
                  {/* Bank Name */}
                  <div className="space-y-2">
                    <Label htmlFor="bankName" className="text-sm font-medium">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={newRep.bankName}
                      onChange={(e) => setNewRep({...newRep, bankName: e.target.value})}
                      className="focus:ring-pink-500 focus:border-pink-500"
                      placeholder="e.g. FNB, Capitec, Standard Bank"
                    />
                  </div>

                  {/* Account Holder Name */}
                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName" className="text-sm font-medium">Account Holder Name</Label>
                    <Input
                      id="accountHolderName"
                      value={newRep.accountHolderName}
                      onChange={(e) => setNewRep({...newRep, accountHolderName: e.target.value})}
                      className="focus:ring-pink-500 focus:border-pink-500"
                      placeholder="Full name as it appears on the account"
                    />
                  </div>

                  {/* Account Number and Branch Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber" className="text-sm font-medium">Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={newRep.accountNumber}
                        onChange={(e) => setNewRep({...newRep, accountNumber: e.target.value})}
                        className="focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Account number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="branchCode" className="text-sm font-medium">Branch Code</Label>
                      <Input
                        id="branchCode"
                        value={newRep.branchCode}
                        onChange={(e) => setNewRep({...newRep, branchCode: e.target.value})}
                        className="focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Branch code (optional)"
                      />
                    </div>
                  </div>
                </div>
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
                  disabled={createRepMutation.isPending}
                  className="bg-pink-500 hover:bg-pink-600 text-white sm:w-auto"
                >
                  {createRepMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Sales Rep
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