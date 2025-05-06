import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin/layout";
import { useQuery } from "@tanstack/react-query";
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
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

// Placeholder catalog type
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
};

export default function AdminCatalogs() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);

  // Query catalogs - This will be replaced with actual API call
  const { data: catalogs, isLoading } = useQuery<Catalog[]>({
    queryKey: ["/api/catalogs", searchQuery],
    queryFn: async () => {
      // This is placeholder data
      return [];
    },
  });

  // Placeholder functions for CRUD operations
  const handleAddCatalog = () => {
    setShowAddDialog(true);
  };

  const handleEditCatalog = (catalog: Catalog) => {
    // Navigate to edit page
    // This will be implemented in the next step
    console.log("Edit catalog:", catalog);
  };

  const handleDeleteClick = (catalog: Catalog) => {
    setSelectedCatalog(catalog);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    // Will be implemented with API call
    toast({
      title: "Catalog deleted",
      description: `${selectedCatalog?.name} has been deleted.`,
    });
    setShowDeleteDialog(false);
    setSelectedCatalog(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
            <CardTitle>All Catalogs</CardTitle>
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
                          <DropdownMenuItem onClick={() => window.location.href = `/admin/catalogs/${catalog.id}`}>
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
                  <TableCell colSpan={7} className="text-center py-10">
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

      {/* Add Catalog Dialog - This will be replaced with a proper form */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Catalog</DialogTitle>
            <DialogDescription>
              Enter the catalog details below to create a new product catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-muted-foreground">
              This is a placeholder dialog. A full catalog form will be implemented in the next step.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAddDialog(false)}>
              Add Catalog
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}