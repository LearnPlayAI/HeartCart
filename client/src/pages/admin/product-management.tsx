/**
 * Product Management Page
 * 
 * Main admin interface for managing product drafts and 
 * creating/editing products through the new wizard interface.
 */

import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { 
  PlusCircle, 
  FileEdit, 
  Trash2, 
  Eye, 
  Loader2, 
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  FilterX,
  RefreshCw,
  AlertCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";

import { AdminLayout } from "@/components/admin/layout";
import { ProductWizard } from "@/components/admin/product-wizard/ProductWizard";
import { DraftProvider, useDraftContext as useDraft } from "@/components/admin/product-management/DraftContext";

function EmptyState({ onCreateDraft }: { onCreateDraft: () => void }) {
  return (
    <Card className="w-full border-dashed bg-muted/30">
      <CardContent className="flex flex-col items-center justify-center p-10 text-center">
        <div className="rounded-full bg-primary/10 p-6 mb-6 shadow-sm">
          <PlusCircle className="h-16 w-16 text-primary" />
        </div>
        <CardTitle className="text-2xl mb-3 text-primary">No Product Drafts</CardTitle>
        <CardDescription className="mb-8 max-w-md text-base">
          You don't have any product drafts yet. Create a new draft to start
          adding products to your store. Each draft can be edited and published when ready.
        </CardDescription>
        <div className="space-y-4 w-full max-w-xs">
          <Button 
            size="lg" 
            onClick={onCreateDraft} 
            className="w-full py-6 text-lg font-medium shadow-md hover:shadow-lg transition-all"
          >
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Product
          </Button>
          <div className="text-xs text-muted-foreground px-4">
            You can create multiple drafts and publish them when ready
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductDraftList() {
  const [location, navigate] = useLocation();
  const [match, params] = useRoute("/admin/product-management/:id");
  const [confirmDiscard, setConfirmDiscard] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterText, setFilterText] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  
  // Get categories for filter
  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('/api/categories');
      return response.success ? response.data : [];
    }
  });
  
  const {
    drafts,
    isLoading,
    isCreating,
    selectedDraftId,
    createDraft,
    loadDraft,
    discardDraft,
    refreshDrafts,
  } = useDraft();
  
  // Filter and sort drafts
  const filteredDrafts = useMemo(() => {
    if (!drafts?.length) return [];
    
    // First apply text filter
    let filtered = drafts;
    if (filterText) {
      const searchLower = filterText.toLowerCase();
      filtered = drafts.filter(draft => 
        (draft.name?.toLowerCase().includes(searchLower)) || 
        (draft.sku?.toLowerCase().includes(searchLower)) ||
        (draft.category?.name?.toLowerCase().includes(searchLower))
      );
    }
    
    // Then apply category filter
    if (filterCategory) {
      filtered = filtered.filter(draft => draft.categoryId === filterCategory);
    }
    
    // Then sort
    return [...filtered].sort((a, b) => {
      // Handle undefined values
      const aValue = a[sortBy as keyof typeof a];
      const bValue = b[sortBy as keyof typeof b];
      
      // Handle nullish values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortOrder === "asc" ? -1 : 1;
      if (bValue == null) return sortOrder === "asc" ? 1 : -1;
      
      // Date comparison
      if (sortBy === "updatedAt" || sortBy === "createdAt") {
        const aDate = new Date(aValue as string);
        const bDate = new Date(bValue as string);
        return sortOrder === "asc" 
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }
      
      // String comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // Number comparison
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
  }, [drafts, filterText, filterCategory, sortBy, sortOrder]);
  
  // Handler to toggle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      // Set new sort column with default desc order
      setSortBy(column);
      setSortOrder("desc");
    }
  };
  
  // Handler to clear filters
  const handleClearFilters = () => {
    setFilterText("");
    setFilterCategory(null);
    setSortBy("updatedAt");
    setSortOrder("desc");
  };
  
  // Handler to create a new draft
  const handleCreateDraft = async () => {
    const draftId = await createDraft();
    if (draftId) {
      navigate(`/admin/product-management/${draftId}`);
    }
  };
  
  // Handler to load a draft
  const handleLoadDraft = (id: number) => {
    loadDraft(id);
    navigate(`/admin/product-management/${id}`);
  };
  
  // Handler to discard a draft
  const handleConfirmDiscard = async () => {
    if (confirmDiscard) {
      const success = await discardDraft(confirmDiscard);
      if (success && selectedDraftId === confirmDiscard) {
        navigate("/admin/product-management");
      }
      setConfirmDiscard(null);
    }
  };
  
  // If we're in editing mode, return null (ProductManagementContainer will handle it)
  if (match && params.id) {
    return null;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Product Management</h2>
          <p className="text-muted-foreground">
            Create and manage products for your store
          </p>
        </div>
        <Button onClick={handleCreateDraft} disabled={isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Product
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="drafts">
        <TabsList className="bg-background border-b border-b-muted">
          <TabsTrigger value="drafts" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Drafts</TabsTrigger>
          <TabsTrigger value="published" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Published Products</TabsTrigger>
        </TabsList>
        <TabsContent value="drafts" className="pt-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : drafts.length === 0 ? (
            <EmptyState onCreateDraft={handleCreateDraft} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Product Drafts</CardTitle>
                <CardDescription>
                  Continue working on your saved product drafts
                </CardDescription>
                
                {/* Filter Controls */}
                <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mt-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by name or SKU..."
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="w-full md:w-64">
                    <Select 
                      value={filterCategory?.toString() || ""} 
                      onValueChange={(value) => setFilterCategory(value ? parseInt(value) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleClearFilters}
                    size="icon"
                    className="w-full md:w-auto"
                  >
                    <FilterX className="h-4 w-4" />
                    <span className="ml-2 md:hidden">Clear Filters</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={refreshDrafts}
                    size="icon"
                    className="w-full md:w-auto"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="ml-2 md:hidden">Refresh</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center">
                            Product Name
                            {sortBy === "name" && (
                              sortOrder === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSort("categoryId")}
                        >
                          <div className="flex items-center">
                            Category
                            {sortBy === "categoryId" && (
                              sortOrder === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSort("updatedAt")}
                        >
                          <div className="flex items-center">
                            Last Updated
                            {sortBy === "updatedAt" && (
                              sortOrder === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDrafts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                            No drafts found matching your filters
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDrafts.map((draft) => (
                          <TableRow key={draft.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleLoadDraft(draft.id)}>
                            <TableCell className="font-medium">
                              {draft.name || "Untitled Product"}
                            </TableCell>
                            <TableCell>
                              {draft.category?.name || "Uncategorized"}
                            </TableCell>
                            <TableCell>
                              {draft.updatedAt ? (
                                <div title={new Date(draft.updatedAt).toLocaleString()}>
                                  {formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })}
                                </div>
                              ) : "Just created"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={draft.publishedProductId ? 'bg-green-100 text-green-800' : ''}>
                                {draft.publishedProductId ? 'Published' : 'Draft'}
                              </Badge>
                            </TableCell>
                            <TableCell className="space-x-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleLoadDraft(draft.id)}
                                title="Edit Draft"
                              >
                                <FileEdit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmDiscard(draft.id)}
                                title="Discard Draft"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {filteredDrafts.length} of {drafts.length} drafts
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="published" className="pt-4">
          <Card className="border-none shadow-none">
            <CardHeader>
              <CardTitle>Published Products</CardTitle>
              <CardDescription>
                View and manage your published products
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground text-center max-w-md mb-6">
                The published products list is being migrated to the new system.
                Please use the Products page in the meantime.
              </p>
              <Button variant="outline" asChild>
                <Link href="/admin/products">Go to Products</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Discard Confirmation Dialog */}
      <Dialog open={!!confirmDiscard} onOpenChange={() => setConfirmDiscard(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Confirm Draft Deletion
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to permanently delete this draft? 
              This action <span className="font-semibold">cannot be undone</span> and all 
              data in this draft will be lost.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-destructive/10 rounded-md p-3 my-3 border border-destructive/20">
            <p className="text-sm text-destructive">
              {drafts.find(d => d.id === confirmDiscard)?.name || "Untitled Product"}
            </p>
          </div>
          
          <DialogFooter className="sm:justify-between mt-2">
            <Button 
              variant="outline" 
              onClick={() => setConfirmDiscard(null)}
              className="sm:mr-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDiscard}
            >
              Yes, Delete Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductDraftEditor() {
  const [match, params] = useRoute("/admin/product-management/:id");
  const [location, navigate] = useLocation();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const {
    currentDraft,
    selectedDraftId,
    loadDraft,
    publishDraft,
    discardDraft,
  } = useDraft();
  
  // Load the draft if we have an ID from the route but no selectedDraftId
  useEffect(() => {
    async function loadDraftData() {
      if (match && params.id && (!selectedDraftId || selectedDraftId !== parseInt(params.id))) {
        setIsLoading(true);
        try {
          await loadDraft(parseInt(params.id));
        } catch (error) {
          console.error("Error loading draft:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }
    
    loadDraftData();
  }, [match, params, selectedDraftId, loadDraft]);
  
  // Handler to publish a draft
  const handlePublish = async () => {
    if (!currentDraft || !currentDraft.id) return;
    
    setIsPublishing(true);
    const success = await publishDraft(currentDraft.id);
    setIsPublishing(false);
    
    if (success) {
      navigate("/admin/product-management");
    }
  };
  
  // Handler to discard a draft
  const handleDiscard = async () => {
    if (!currentDraft || !currentDraft.id) return;
    
    setIsDiscarding(true);
    const success = await discardDraft(currentDraft.id);
    setIsDiscarding(false);
    
    if (success) {
      navigate("/admin/product-management");
    }
  };
  
  // If we're not in editing mode or don't have a draft, return null
  if (!match || !params.id) {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading draft...</span>
      </div>
    );
  }
  
  if (!currentDraft) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/product-management")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Drafts
          </Button>
        </div>
        
        <Card className="text-center p-8">
          <CardTitle className="mb-2">Draft Not Found</CardTitle>
          <CardDescription className="mb-6">
            The requested draft could not be found. It may have been deleted or doesn't exist.
          </CardDescription>
          <Button onClick={() => navigate("/admin/product-management")}>
            Return to Product Management
          </Button>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/product-management")}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Drafts
        </Button>
        <Separator orientation="vertical" className="h-8 mx-2" />
        <h2 className="text-2xl font-semibold">Product Editor</h2>
        <div className="ml-auto flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={handleDiscard}
            disabled={isDiscarding || isPublishing}
          >
            {isDiscarding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handlePublish}
            disabled={isPublishing || isDiscarding}
          >
            {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Publish Product
          </Button>
        </div>
      </div>
      
      <ProductWizard
        draft={currentDraft}
        onPublish={handlePublish}
        onDiscard={handleDiscard}
        isPublishing={isPublishing}
        isDiscarding={isDiscarding}
      />
    </div>
  );
}

// Main container component - conditionally renders list or editor
function ProductManagementContainer() {
  const [match, params] = useRoute("/admin/product-management/:id");
  
  return (
    <AdminLayout>
      {match && params.id ? <ProductDraftEditor /> : <ProductDraftList />}
    </AdminLayout>
  );
}

// Exported page component wrapped with DraftProvider context
export default function ProductManagementPage() {
  return (
    <DraftProvider>
      <ProductManagementContainer />
    </DraftProvider>
  );
}