import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Users,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminLayout } from '@/components/admin/layout';

// Types
interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  isActive: boolean;
  role: string;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  regularUsers: number;
  recentRegistrations: number;
}

export default function UserAdminPageFixed() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for pagination and filtering - using exact approach as product management
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(''); // Single state like product management
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const itemsPerPage = 20;
  const offset = (currentPage - 1) * itemsPerPage;
  
  // State for dialogs
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // State for user creation toggle
  const [userCreationEnabled, setUserCreationEnabled] = useState(true);

  // Fetch user stats
  const { data: statsData } = useQuery<{ success: boolean; data: UserStats }>({
    queryKey: ['/api/admin/users/stats'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/admin/users/stats');
    }
  });

  const stats = statsData?.success ? statsData.data : null;

  // Fetch user creation setting
  const { data: userCreationSettingData } = useQuery({
    queryKey: ['/api/admin/settings/userCreationEnabled'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/admin/settings/userCreationEnabled');
    }
  });

  // Update user creation enabled state when data is fetched
  useEffect(() => {
    if (userCreationSettingData?.success) {
      setUserCreationEnabled(userCreationSettingData.data.settingValue === 'true');
    }
  }, [userCreationSettingData]);

  // Mutation for updating user creation setting
  const updateUserCreationSettingMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest('PATCH', '/api/admin/settings/userCreationEnabled', {
        value: enabled.toString()
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/userCreationEnabled'] });
    },
    onError: (error, variables) => {
      toast({
        title: "Error",
        description: "Failed to update user creation setting",
        variant: "destructive"
      });
      // Revert the toggle state on error
      setUserCreationEnabled(!variables);
    }
  });

  // Fetch users with server-side pagination - using exact approach as product management
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/users', { 
      limit: itemsPerPage, 
      offset, 
      search: searchQuery,
      role: roleFilter || undefined,
      status: statusFilter || undefined
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      });
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      if (roleFilter) {
        params.append('role', roleFilter);
      }
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      const response = await apiRequest('GET', `/api/admin/users?${params.toString()}`);
      return response.json();
    }
  });

  const users = usersData?.success ? usersData.data.users : [];
  const pagination = usersData?.success ? usersData.meta : null;

  // Calculate pagination info
  const totalPages = Math.ceil((pagination?.total || 0) / itemsPerPage);
  const totalUsers = pagination?.total || 0;

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('DELETE', `/api/admin/users/${userId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/stats'] });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to delete user', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${userId}`, { role });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user role');
      }
      return response.json();
    },
    onSuccess: () => {
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/stats'] });
    },
    onError: () => {
      toast({ title: 'Failed to update user role', variant: 'destructive' });
    },
  });

  // Update user status mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${userId}`, { isActive });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user status');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({ 
        title: variables.isActive ? 'User reactivated' : 'User deactivated',
        description: variables.isActive ? 'The user can now log in again.' : 'The user can no longer log in.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/stats'] });
    },
    onError: () => {
      toast({ title: 'Failed to update user status', variant: 'destructive' });
    },
  });



  const handleFilterChange = (type: string, value: string) => {
    if (type === 'role') {
      setRoleFilter(value === 'all' ? '' : value);
    } else if (type === 'status') {
      setStatusFilter(value === 'all' ? '' : value);
    }
    setCurrentPage(1);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const handleRoleChange = (userId: number, newRole: string) => {
    updateUserRoleMutation.mutate({ userId, role: newRole });
  };

  const handleStatusChange = (userId: number, isActive: boolean) => {
    updateUserStatusMutation.mutate({ userId, isActive });
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString || dateString === '') {
        return 'N/A';
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      // Format as actual date for admin tracking
      return date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const UserStatsCards = () => (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <UserCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats?.activeUsers || 0}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
          <UserX className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats?.inactiveUsers || 0}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
          <Shield className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats?.adminUsers || 0}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
          <User className="h-4 w-4 text-gray-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-600">{stats?.regularUsers || 0}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Registrations</CardTitle>
          <Users className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{stats?.recentRegistrations || 0}</div>
        </CardContent>
      </Card>
    </div>
  );

  const UserTableView = () => (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <Select value={roleFilter || 'all'} onValueChange={(value) => handleFilterChange('role', value)}>
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-muted-foreground">{user.fullName || 'No name'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{user.email}</div>
                          {user.phoneNumber && (
                            <div className="text-muted-foreground">{user.phoneNumber}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewUser(user)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'user' : 'admin')}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                            </DropdownMenuItem>
                            {!user.isActive && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(user.id, true)}
                                className="text-green-600"
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Reactivate User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {offset + 1} to {Math.min(offset + itemsPerPage, totalUsers)} of {totalUsers} users
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="user-creation-toggle" className="text-sm font-medium">
              Allow User Creation
            </Label>
            <Switch
              id="user-creation-toggle"
              checked={userCreationEnabled}
              onCheckedChange={(checked) => {
                setUserCreationEnabled(checked);
                updateUserCreationSettingMutation.mutate(checked);
              }}
              disabled={updateUserCreationSettingMutation.isPending}
            />
          </div>
        </div>

        <UserStatsCards />
        <UserTableView />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete user "{selectedUser?.username}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteUser}
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View User Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Username</label>
                    <p className="text-sm text-muted-foreground">{selectedUser.username}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <p className="text-sm text-muted-foreground">{selectedUser.fullName || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <p className="text-sm text-muted-foreground">{selectedUser.phoneNumber || 'Not provided'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.address ? 
                      `${selectedUser.address}, ${selectedUser.city || ''}, ${selectedUser.province || ''} ${selectedUser.postalCode || ''}`.trim() 
                      : 'Not provided'
                    }
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Role</label>
                    <p className="text-sm text-muted-foreground">{selectedUser.role}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm text-muted-foreground">{selectedUser.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Created</label>
                    <p className="text-sm text-muted-foreground">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Login</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}