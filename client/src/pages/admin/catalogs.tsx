import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin/layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useDateFormat } from "@/hooks/use-date-format";
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
  Edit,
  Trash,
  ShoppingBag,
  Calendar,
  RefreshCw,
  Clock,
  Eye,
  ToggleLeft,
  ToggleRight,
  Filter,
  Grid3X3,
  List,
  Package,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Catalog {
  id: number;
  name: string;
  description: string | null;
  supplierId: number;
  supplierName: string;
  isActive: boolean;
  defaultMarkupPercentage: number | null;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  productsCount: number;
}

export default function CatalogsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const { data: catalogsResponse, isLoading, refetch } = useQuery<{ success: boolean, data: Catalog[], error?: { message: string } }>({
    queryKey: ["/api/catalogs", searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/catalogs?activeOnly=false&q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch catalogs");
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to fetch catalogs");
      }
      
      return result;
    }
  });
  
  // Extract data from standardized response
  const catalogs = catalogsResponse?.data;

  const toggleStatusMutation = useMutation({
    mutationFn: (catalog: Catalog) =>
      apiRequest(`/api/catalogs/${catalog.id}/toggle-status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !catalog.isActive }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === "/api/catalogs";
        },
      });
      refetch();
      toast({
        title: "Success",
        description: "Catalog status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update catalog status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (catalogId: number) =>
      apiRequest(`/api/catalogs/${catalogId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === "/api/catalogs";
        },
      });
      refetch();
      setShowDeleteDialog(false);
      setSelectedCatalog(null);
      toast({
        title: "Success",
        description: "Catalog deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete catalog",
        variant: "destructive",
      });
    },
  });

  const { formatShortDate } = useDateFormat();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime()) || date.getFullYear() === 1970) {
      return "Not set";
    }
    return formatShortDate(date);
  };

  const handleAddCatalog = () => {
    navigate("/admin/catalogs/add");
  };

  const handleEditCatalog = (catalog: Catalog) => {
    navigate(`/admin/catalogs/${catalog.id}/edit`);
  };

  const handleToggleStatus = (catalog: Catalog) => {
    toggleStatusMutation.mutate(catalog);
  };

  const handleDeleteClick = (catalog: Catalog) => {
    setSelectedCatalog(catalog);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedCatalog) {
      deleteMutation.mutate(selectedCatalog.id);
    }
  };

  // Filter catalogs based on status
  const filteredCatalogs = catalogs?.filter((catalog) => {
    if (filterStatus === "active") return catalog.isActive;
    if (filterStatus === "inactive") return !catalog.isActive;
    return true;
  });

  const CatalogCard = ({ catalog }: { catalog: Catalog }) => (
    <Card className="group hover:shadow-md transition-all duration-200 border-l-4 border-l-pink-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-pink-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{catalog.name}</CardTitle>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <Factory className="h-4 w-4 mr-1" />
                {catalog.supplierName || "No supplier"}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit className="h-4 w-4" />
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
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditCatalog(catalog)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Catalog
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleStatus(catalog)}>
                {catalog.isActive ? (
                  <>
                    <ToggleLeft className="mr-2 h-4 w-4 text-amber-500" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleRight className="mr-2 h-4 w-4 text-green-500" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDeleteClick(catalog)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {catalog.description && (
          <CardDescription className="text-sm mt-2">
            {catalog.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center">
              <Package className="h-4 w-4 mr-2 text-gray-500" />
              <span className="font-medium">{catalog.productsCount}</span>
              <span className="text-gray-500 ml-1">products</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-gray-600">{formatDate(catalog.startDate)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-end">
              <Badge
                variant={catalog.isActive ? "default" : "secondary"}
                className={
                  catalog.isActive
                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                }
              >
                {catalog.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center justify-end">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-gray-600 text-xs">
                {catalog.endDate ? formatDate(catalog.endDate) : "Ongoing"}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/catalogs/${catalog.id}/products`)}
            className="flex-1"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Manage Products
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditCatalog(catalog)}
            className="px-3"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const CatalogListItem = ({ catalog }: { catalog: Catalog }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="p-2 bg-pink-100 rounded-lg shrink-0">
              <BookOpen className="h-4 w-4 text-pink-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{catalog.name}</h3>
                <Badge
                  variant={catalog.isActive ? "default" : "secondary"}
                  className={`shrink-0 text-xs ${
                    catalog.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {catalog.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center text-sm text-gray-600 gap-4">
                <span className="flex items-center">
                  <Factory className="h-3 w-3 mr-1" />
                  {catalog.supplierName || "No supplier"}
                </span>
                <span className="flex items-center">
                  <Package className="h-3 w-3 mr-1" />
                  {catalog.productsCount} products
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/catalogs/${catalog.id}/products`)}
              className="hidden sm:flex"
            >
              <ShoppingBag className="h-4 w-4 mr-1" />
              Manage
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
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
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditCatalog(catalog)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Catalog
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleStatus(catalog)}>
                  {catalog.isActive ? (
                    <>
                      <ToggleLeft className="mr-2 h-4 w-4 text-amber-500" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleRight className="mr-2 h-4 w-4 text-green-500" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDeleteClick(catalog)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Catalogs</h1>
            <p className="text-muted-foreground">
              Manage product catalogs from your suppliers
            </p>
          </div>
          <Button onClick={handleAddCatalog} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Catalog
          </Button>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search catalogs..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter and View Controls */}
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      {filterStatus === "all" ? "All" : filterStatus === "active" ? "Active" : "Inactive"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                      All Catalogs
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus("active")}>
                      Active Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus("inactive")}>
                      Inactive Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <div>
          {isLoading ? (
            <Card>
              <CardContent className="flex justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-pink-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading catalogs...</p>
                </div>
              </CardContent>
            </Card>
          ) : !filteredCatalogs || filteredCatalogs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No catalogs found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? "No catalogs match your search criteria." 
                    : "Get started by adding your first catalog."
                  }
                </p>
                {!searchQuery && (
                  <Button onClick={handleAddCatalog}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Your First Catalog
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCatalogs.map((catalog) => (
                <CatalogCard key={catalog.id} catalog={catalog} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCatalogs.map((catalog) => (
                <CatalogListItem key={catalog.id} catalog={catalog} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Catalog</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCatalog?.name}"? This action cannot be undone
              and will permanently remove the catalog and all its associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Catalog"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}