import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin/layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  PlusCircle, 
  Search, 
  Loader2,
  Factory,
  MoreVertical,
  Edit,
  Trash,
  RefreshCw
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Supplier type definition
type Supplier = {
  id: number;
  name: string;
  email: string;
  phone: string;
  contactName: string; // Changed from contactPerson to match database schema
  isActive: boolean;
  productsCount?: number; // Optional since database doesn't store this directly
  createdAt: string;
};

export default function AdminSuppliers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  // No longer using modal dialog for adding suppliers
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  // Query suppliers from API - set queryKey to include a parameter forcing inactive suppliers to be shown
  const { data: suppliersResponse, isLoading, refetch } = useQuery<{ success: boolean, data: Supplier[], error?: { message: string } }>({
    queryKey: ["/api/suppliers", searchQuery],
    queryFn: async () => {
      // Add explicit query parameter to force showing inactive suppliers for admins
      const response = await fetch(`/api/suppliers?activeOnly=false&q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch suppliers");
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to fetch suppliers");
      }
      
      return result;
    }
  });
  
  // Extract data from standardized response
  const suppliers = suppliersResponse?.data;

  // CRUD operations
  const [, navigate] = useLocation();
  
  const handleAddSupplier = () => {
    navigate("/admin/suppliers/new");
  };

  const handleEditSupplier = (supplier: Supplier) => {
    navigate(`/admin/suppliers/${supplier.id}/edit`);
  };

  const handleDeleteClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDeleteDialog(true);
  };

  const { mutate: deleteSupplier, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/suppliers/${id}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete supplier");
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to delete supplier");
      }
      
      return result;
    },
    onSuccess: () => {
      
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setShowDeleteDialog(false);
      setSelectedSupplier(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete supplier",
        variant: "destructive",
      });
    },
  });
  
  const confirmDelete = () => {
    if (selectedSupplier) {
      deleteSupplier(selectedSupplier.id);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage supplier information and catalogs
          </p>
        </div>
        <Button onClick={handleAddSupplier}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>All Suppliers</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()} 
                title="Refresh suppliers list"
                className="h-8 px-2"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <CardDescription>
            A list of all suppliers and their contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <div className="flex justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : suppliers && suppliers.length > 0 ? (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Factory className="h-4 w-4 mr-2 text-pink-500" />
                        {supplier.name}
                      </div>
                    </TableCell>
                    <TableCell>{supplier.contactName}</TableCell>
                    <TableCell>{supplier.email}</TableCell>
                    <TableCell>{supplier.phone}</TableCell>
                    <TableCell>{supplier.productsCount}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          supplier.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {supplier.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <div 
                              className="flex items-center cursor-pointer"
                              onClick={() => handleEditSupplier(supplier)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <div 
                              className="flex items-center cursor-pointer text-red-600"
                              onClick={() => handleDeleteClick(supplier)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Factory className="h-10 w-10 text-gray-400" />
                      <div className="text-lg font-medium">No suppliers found</div>
                      <div className="text-sm text-muted-foreground">
                        Add a new supplier to get started
                      </div>
                      <Button 
                        className="mt-2" 
                        variant="outline"
                        onClick={handleAddSupplier}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Supplier
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Supplier dialogs have been moved to dedicated pages */}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this supplier? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedSupplier && (
              <p className="font-medium">
                Deleting: {selectedSupplier.name}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}