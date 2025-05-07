import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin/layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PlusCircle,
  Search,
  Loader2,
  BookOpen,
  Factory,
  MoreVertical,
  Edit,
  Trash,
  ShoppingBag,
  Calendar,
  RefreshCw,
  Clock,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { CatalogForm } from "@/components/admin/catalog-form";

// Catalog type
type Catalog = {
  id: number;
  name: string;
  description: string;
  supplierId: number;
  supplierName: string;
  isActive: boolean;
  productsCount: number;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  defaultMarkupPercentage?: number; // Added to match schema
};

export default function AdminCatalogs() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  // No longer using modal dialog for adding catalogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);

  // Query catalogs from API
  const { data: catalogs, isLoading, refetch } = useQuery<Catalog[]>({
    queryKey: ["/api/catalogs", searchQuery],
    queryFn: async () => {
      // Add explicit query parameter to force showing inactive catalogs for admins
      const response = await fetch(`/api/catalogs?activeOnly=false&q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch catalogs");
      }
      return response.json();
    }
  });

  // CRUD operations
  const [, navigate] = useLocation();
  
  const handleAddCatalog = () => {
    navigate("/admin/catalogs/new");
  };

  const handleEditCatalog = (catalog: Catalog) => {
    navigate(`/admin/catalogs/${catalog.id}/edit`);
  };

  const handleDeleteClick = (catalog: Catalog) => {
    setSelectedCatalog(catalog);
    setShowDeleteDialog(true);
  };

  const { mutate: deleteCatalog, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/catalogs/${id}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete catalog");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Catalog deleted",
        description: `${selectedCatalog?.name} has been deleted.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/catalogs"] });
      setShowDeleteDialog(false);
      setSelectedCatalog(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete catalog",
        variant: "destructive",
      });
    },
  });
  
  const confirmDelete = () => {
    if (selectedCatalog) {
      deleteCatalog(selectedCatalog.id);
    }
  };

  const formatDate = (dateString: string) => {
    // Check if the dateString is valid and not a 1970 date
    const date = new Date(dateString);
    
    // If date is invalid or close to epoch (1/1/1970), it means the date is likely not set properly
    if (isNaN(date.getTime()) || date.getFullYear() === 1970) {
      return "Not set";
    }
    
    // Format the date properly for display
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catalogs</h1>
          <p className="text-muted-foreground">
            Manage product catalogs from your suppliers
          </p>
        </div>
        <Button onClick={handleAddCatalog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Catalog
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>All Catalogs</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()} 
                title="Refresh catalogs list"
                className="h-8 px-2"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search catalogs..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <CardDescription>
            A list of all product catalogs from your suppliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Manage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <div className="flex justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : catalogs && catalogs.length > 0 ? (
                catalogs.map((catalog) => (
                  <TableRow key={catalog.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-2 text-pink-500" />
                        {catalog.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Factory className="h-4 w-4 mr-2 text-gray-500" />
                        {catalog.supplierName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <ShoppingBag className="h-4 w-4 mr-2 text-gray-500" />
                        {catalog.productsCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        {formatDate(catalog.startDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        {catalog.endDate ? formatDate(catalog.endDate) : "Ongoing"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${
                          catalog.isActive
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }`}
                      >
                        {catalog.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/admin/catalogs/${catalog.id}/products`)}
                        className="flex items-center gap-1"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Manage</span>
                      </Button>
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
                          <DropdownMenuItem onClick={() => navigate(`/admin/catalogs/${catalog.id}/products`)}>
                            <ShoppingBag className="mr-2 h-4 w-4" />
                            Manage Products
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/catalogs/${catalog.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditCatalog(catalog)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteClick(catalog)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <BookOpen className="h-10 w-10 text-gray-400" />
                      <div className="text-lg font-medium">No catalogs found</div>
                      <div className="text-sm text-muted-foreground">
                        Add a new catalog to get started
                      </div>
                      <Button
                        className="mt-2"
                        variant="outline"
                        onClick={handleAddCatalog}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Catalog
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Catalog dialogs have been moved to dedicated pages */}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this catalog? This action cannot be undone and will remove all products associated with this catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedCatalog && (
              <p className="font-medium">
                Deleting: {selectedCatalog.name}
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