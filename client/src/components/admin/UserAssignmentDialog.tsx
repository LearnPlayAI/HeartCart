import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Users, UserPlus, UserMinus, AlertCircle, CheckCircle2 } from "lucide-react";

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

interface UserAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesRep: SalesRep | null;
  allSalesReps: SalesRep[];
}

export function UserAssignmentDialog({ open, onOpenChange, salesRep, allSalesReps }: UserAssignmentDialogProps) {
  const [activeTab, setActiveTab] = useState("assigned");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Get users assigned to this sales rep
  const { data: assignedUsersResponse, isLoading: assignedLoading, refetch: refetchAssigned } = useQuery({
    queryKey: ['/api/admin/sales-reps', salesRep?.id, 'users'],
    queryFn: async () => {
      if (!salesRep) return { success: false, data: [] };
      const response = await apiRequest('GET', `/api/admin/sales-reps/${salesRep.id}/users`);
      return response.json();
    },
    enabled: !!salesRep && open
  });

  // Get unassigned users
  const { data: unassignedUsersResponse, isLoading: unassignedLoading, refetch: refetchUnassigned } = useQuery({
    queryKey: ['/api/admin/users/unassigned'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/users/unassigned');
      return response.json();
    },
    enabled: open && activeTab === "unassigned"
  });

  // Search users
  const { data: searchUsersResponse, isLoading: searchLoading } = useQuery({
    queryKey: ['/api/admin/users/search', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) return { success: false, data: [] };
      const response = await apiRequest('GET', `/api/admin/users/search?q=${encodeURIComponent(debouncedSearchTerm)}`);
      return response.json();
    },
    enabled: open && activeTab === "search" && debouncedSearchTerm.length >= 2
  });

  // Get assignment stats
  const { data: statsResponse } = useQuery({
    queryKey: ['/api/admin/sales-reps', salesRep?.id, 'assignment-stats'],
    queryFn: async () => {
      if (!salesRep) return { success: false, data: null };
      const response = await apiRequest('GET', `/api/admin/sales-reps/${salesRep.id}/assignment-stats`);
      return response.json();
    },
    enabled: !!salesRep && open
  });

  // Assign user to rep mutation
  const assignUserMutation = useMutation({
    mutationFn: async ({ userId, repCode }: { userId: number; repCode: string }) => {
      const response = await apiRequest('PUT', `/api/admin/users/${userId}/rep-assignment`, { repCode });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User assigned successfully",
      });
      // Invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/unassigned'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/search'] });
      refetchAssigned();
      refetchUnassigned();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign user",
        variant: "destructive",
      });
    }
  });

  // Remove user assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('DELETE', `/api/admin/users/${userId}/rep-assignment`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User assignment removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/unassigned'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/search'] });
      refetchAssigned();
      refetchUnassigned();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove assignment",
        variant: "destructive",
      });
    }
  });

  // Reassign user to different rep mutation
  const reassignUserMutation = useMutation({
    mutationFn: async ({ userId, newRepCode }: { userId: number; newRepCode: string }) => {
      const response = await apiRequest('PUT', `/api/admin/users/${userId}/rep-assignment`, { repCode: newRepCode });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User reassigned successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-reps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/unassigned'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/search'] });
      refetchAssigned();
      refetchUnassigned();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reassign user",
        variant: "destructive",
      });
    }
  });

  const assignedUsers = assignedUsersResponse?.success ? assignedUsersResponse.data : [];
  const unassignedUsers = unassignedUsersResponse?.success ? unassignedUsersResponse.data : [];
  const searchUsers = searchUsersResponse?.success ? searchUsersResponse.data : [];
  const stats = statsResponse?.success ? statsResponse.data : null;

  const handleAssignUser = (userId: number) => {
    if (!salesRep) return;
    assignUserMutation.mutate({ userId, repCode: salesRep.repCode });
  };

  const handleRemoveAssignment = (userId: number) => {
    removeAssignmentMutation.mutate(userId);
  };

  const handleReassignUser = (userId: number, newRepCode: string) => {
    if (newRepCode === "REMOVE_ASSIGNMENT") {
      removeAssignmentMutation.mutate(userId);
    } else {
      reassignUserMutation.mutate({ userId, newRepCode });
    }
  };

  const UserRow = ({ user, showAssignButton = false, showRemoveButton = false, showReassignSelect = false }: {
    user: User;
    showAssignButton?: boolean;
    showRemoveButton?: boolean;
    showReassignSelect?: boolean;
  }) => (
    <TableRow key={user.id}>
      <TableCell>
        <div>
          <div className="font-medium">{user.fullName || user.username}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={user.isActive ? "default" : "secondary"}>
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        {user.repCode ? (
          <Badge variant="outline">{user.repCode}</Badge>
        ) : (
          <span className="text-muted-foreground">None</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {showAssignButton && (
            <Button
              size="sm"
              onClick={() => handleAssignUser(user.id)}
              disabled={assignUserMutation.isPending}
              className="h-8"
            >
              <UserPlus className="w-3 h-3 mr-1" />
              Assign
            </Button>
          )}
          {showRemoveButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRemoveAssignment(user.id)}
              disabled={removeAssignmentMutation.isPending}
              className="h-8"
            >
              <UserMinus className="w-3 h-3 mr-1" />
              Remove
            </Button>
          )}
          {showReassignSelect && (
            <Select
              onValueChange={(newRepCode) => handleReassignUser(user.id, newRepCode)}
              disabled={reassignUserMutation.isPending}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Reassign" />
              </SelectTrigger>
              <SelectContent>
                {allSalesReps.filter(rep => rep.repCode !== user.repCode && rep.isActive).map(rep => (
                  <SelectItem key={rep.id} value={rep.repCode}>
                    {rep.repCode}
                  </SelectItem>
                ))}
                <SelectItem value="REMOVE_ASSIGNMENT">Remove</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  if (!salesRep) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Manage User Assignments</DialogTitle>
          <DialogDescription>
            Manage users assigned to {salesRep.firstName} {salesRep.lastName} ({salesRep.repCode})
          </DialogDescription>
        </DialogHeader>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Assigned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAssignedUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeAssignedUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recentAssignments}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assigned">
              <Users className="w-4 h-4 mr-2" />
              Assigned Users ({assignedUsers.length})
            </TabsTrigger>
            <TabsTrigger value="unassigned">
              <UserPlus className="w-4 h-4 mr-2" />
              Unassigned Users
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="w-4 h-4 mr-2" />
              Search Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assigned" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Currently Assigned Users</CardTitle>
                <CardDescription>
                  Users currently assigned to this sales representative
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignedLoading ? (
                  <div className="text-center py-4">Loading assigned users...</div>
                ) : assignedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    No users assigned to this representative
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rep Code</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedUsers.map((user: User) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          showRemoveButton={true}
                          showReassignSelect={true}
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unassigned" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Unassigned Users</CardTitle>
                <CardDescription>
                  Users not currently assigned to any sales representative
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unassignedLoading ? (
                  <div className="text-center py-4">Loading unassigned users...</div>
                ) : unassignedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                    All users are assigned to sales representatives
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rep Code</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unassignedUsers.map((user: User) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          showAssignButton={true}
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Search Users</CardTitle>
                <CardDescription>
                  Search for users by name, email, or username to assign them
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name, email, or username..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {searchLoading ? (
                  <div className="text-center py-4">Searching users...</div>
                ) : searchTerm.length < 2 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Enter at least 2 characters to search for users
                  </div>
                ) : searchUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2" />
                    No users found matching "{searchTerm}"
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Current Rep</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchUsers.map((user: User) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          showAssignButton={!user.repCode || user.repCode !== salesRep.repCode}
                          showReassignSelect={!!user.repCode && user.repCode !== salesRep.repCode}
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}