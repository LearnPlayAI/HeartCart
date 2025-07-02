import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Users, Search, UserPlus, UserMinus, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout";

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  role: string;
  createdAt: string;
  repCode: string | null;
}

interface SalesRep {
  id: number;
  repCode: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}

export default function ManageUsersPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const repId = parseInt(params.id || '0');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNewRepId, setSelectedNewRepId] = useState<string>('');

  // Fetch all sales reps
  const { data: salesRepsResponse, isLoading: repsLoading } = useQuery({
    queryKey: ['/api/admin/sales-reps'],
    refetchOnWindowFocus: true
  });

  const salesReps = Array.isArray(salesRepsResponse?.data) ? salesRepsResponse.data : 
                    Array.isArray(salesRepsResponse) ? salesRepsResponse : [];
  const selectedRep = salesReps.find((rep: SalesRep) => rep.id === repId);

  // Fetch assigned users for this rep
  const { data: assignedUsersResponse, isLoading: assignedLoading, refetch: refetchAssigned } = useQuery({
    queryKey: [`/api/admin/sales-reps/${repId}/users`],
    enabled: !!repId
  });

  const assignedUsers = assignedUsersResponse?.data || [];

  // Fetch unassigned users
  const { data: unassignedUsersResponse, isLoading: unassignedLoading, refetch: refetchUnassigned } = useQuery({
    queryKey: ['/api/admin/users/unassigned'],
    refetchOnWindowFocus: true
  });

  const unassignedUsers = unassignedUsersResponse?.data || [];

  // Search users
  const { data: searchUsersResponse, isLoading: searchLoading } = useQuery({
    queryKey: ['/api/admin/users/search', searchTerm],
    queryFn: () => fetch(`/api/admin/users/search?q=${encodeURIComponent(searchTerm)}`, {
      credentials: 'include'
    }).then(res => res.json()),
    enabled: searchTerm.length >= 2
  });

  const searchUsers = searchUsersResponse?.data || [];

  // Assign user mutation
  const assignUserMutation = useMutation({
    mutationFn: ({ userId }: { userId: number }) => 
      apiRequest('POST', `/api/admin/sales-reps/${repId}/assign-user`, { userId }),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/sales-reps/${repId}/users`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/unassigned'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/search'] });
      
      // Force immediate refetch
      refetchAssigned();
      refetchUnassigned();
      
      toast({
        title: "Success",
        description: "User assigned successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign user",
        variant: "destructive"
      });
    }
  });

  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: ({ userId }: { userId: number }) => 
      apiRequest('POST', `/api/admin/sales-reps/${repId}/remove-user`, { userId }),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/sales-reps/${repId}/users`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/unassigned'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/search'] });
      
      // Force immediate refetch
      refetchAssigned();
      refetchUnassigned();
      
      toast({
        title: "Success",
        description: "User removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive"
      });
    }
  });

  // Reassign user mutation
  const reassignUserMutation = useMutation({
    mutationFn: ({ userId, newRepId }: { userId: number, newRepId: number }) => 
      apiRequest('POST', `/api/admin/users/${userId}/reassign`, { newRepId }),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/sales-reps/${repId}/users`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/unassigned'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/search'] });
      
      // Force immediate refetch
      refetchAssigned();
      refetchUnassigned();
      setSelectedNewRepId('');
      
      toast({
        title: "Success",
        description: "User reassigned successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reassign user",
        variant: "destructive"
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleAssignUser = (userId: number) => {
    assignUserMutation.mutate({ userId });
  };

  const handleRemoveUser = (userId: number) => {
    removeUserMutation.mutate({ userId });
  };

  const handleReassignUser = (userId: number) => {
    if (!selectedNewRepId) {
      toast({
        title: "Error",
        description: "Please select a sales rep to reassign to",
        variant: "destructive"
      });
      return;
    }
    reassignUserMutation.mutate({ userId, newRepId: parseInt(selectedNewRepId) });
  };

  if (repsLoading) {
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
              Manage Users - {selectedRep.firstName} {selectedRep.lastName}
            </h1>
            <p className="text-muted-foreground">
              Assign and manage users for sales rep {selectedRep.repCode}
            </p>
          </div>
        </div>

        {/* User Search */}
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Search className="w-5 h-5 text-blue-500" />
              Search & Assign Users
            </CardTitle>
            <CardDescription>
              Search for users to assign to this sales representative
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search users by name, email, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {searchTerm.length >= 2 && (
                <div className="space-y-2">
                  {searchLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : searchUsers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No users found matching your search.</p>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {searchUsers.map((user: User) => (
                          <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">
                                  {user.fullName || user.username}
                                </h4>
                                <p className="text-sm text-gray-600">@{user.username}</p>
                              </div>
                              <Badge variant={user.isActive ? "default" : "secondary"} className="shrink-0">
                                {user.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Email:</span>
                                <p className="text-gray-600 break-all">{user.email}</p>
                              </div>
                              
                              <div>
                                <span className="font-medium text-gray-700">Phone:</span>
                                <p className="text-gray-600">{user.phoneNumber || 'No phone number'}</p>
                              </div>
                              
                              <div>
                                <span className="font-medium text-gray-700">Joined:</span>
                                <p className="text-gray-600">{formatDate(user.createdAt)}</p>
                              </div>
                              
                              {user.repCode && (
                                <div>
                                  <span className="font-medium text-gray-700">Current Rep:</span>
                                  <Badge variant="outline" className="ml-2">
                                    {user.repCode}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-gray-100">
                              <Button
                                size="sm"
                                onClick={() => handleAssignUser(user.id)}
                                disabled={user.repCode === selectedRep.repCode || assignUserMutation.isPending}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                {assignUserMutation.isPending ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    {user.repCode === selectedRep.repCode ? 'Already Assigned' : user.repCode ? 'Reassign to This Rep' : 'Assign to This Rep'}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assigned Users */}
        <Card className="border-t-4 border-t-pink-500">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100 border-b">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Users className="w-5 h-5 text-pink-500" />
              Assigned Users ({assignedUsers.length})
            </CardTitle>
            <CardDescription>
              Users currently assigned to {selectedRep.repCode}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {assignedLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              </div>
            ) : assignedUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No Users Assigned</p>
                <p>Use the search above to find and assign users to this sales rep.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
                {assignedUsers.map((user: User) => (
                  <Card key={user.id} className="border-l-4 border-l-pink-500 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {user.fullName || user.username}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">@{user.username}</span>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            Joined {formatDate(user.createdAt)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-4">
                      {/* Contact Information */}
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-500">Email:</span>
                          <div className="font-medium text-gray-900">{user.email}</div>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Phone:</span>
                          <div className="font-medium text-gray-900">
                            {user.phoneNumber || 'No phone number'}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-3 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <Select value={selectedNewRepId} onValueChange={setSelectedNewRepId}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Reassign to another rep..." />
                            </SelectTrigger>
                            <SelectContent>
                              {salesReps.filter(rep => rep.id !== repId && rep.isActive).map((rep: SalesRep) => (
                                <SelectItem key={rep.id} value={rep.id.toString()}>
                                  {rep.firstName} {rep.lastName} ({rep.repCode})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReassignUser(user.id)}
                            disabled={!selectedNewRepId || reassignUserMutation.isPending}
                            className="px-3"
                          >
                            {reassignUserMutation.isPending ? (
                              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveUser(user.id)}
                          disabled={removeUserMutation.isPending}
                          className="w-full"
                        >
                          {removeUserMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          ) : (
                            <UserMinus className="w-4 h-4 mr-2" />
                          )}
                          Remove from {selectedRep.repCode}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unassigned Users */}
        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <UserPlus className="w-5 h-5 text-green-500" />
              Unassigned Users ({unassignedUsers.length})
            </CardTitle>
            <CardDescription>
              Users without a sales representative assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {unassignedLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              </div>
            ) : unassignedUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No Unassigned Users</p>
                <p>All users are currently assigned to sales representatives.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
                {unassignedUsers.map((user: User) => (
                  <Card key={user.id} className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {user.fullName || user.username}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">@{user.username}</span>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            Joined {formatDate(user.createdAt)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-4">
                      {/* Contact Information */}
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-500">Email:</span>
                          <div className="font-medium text-gray-900">{user.email}</div>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Phone:</span>
                          <div className="font-medium text-gray-900">
                            {user.phoneNumber || 'No phone number'}
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="pt-2 border-t border-gray-200">
                        <Button
                          size="sm"
                          onClick={() => handleAssignUser(user.id)}
                          disabled={assignUserMutation.isPending}
                          className="w-full bg-green-500 hover:bg-green-600"
                        >
                          {assignUserMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          ) : (
                            <UserPlus className="w-4 h-4 mr-2" />
                          )}
                          Assign to {selectedRep.repCode}
                        </Button>
                      </div>
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