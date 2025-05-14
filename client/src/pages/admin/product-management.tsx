/**
 * Product Management Page
 * 
 * Main admin interface for managing product drafts and 
 * creating/editing products through the new wizard interface.
 */

import React, { useState, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { PlusCircle, FileEdit, Trash2, Eye, Loader2, ArrowLeft } from "lucide-react";

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

import { AdminLayout } from "@/components/admin/layout";
import { ProductWizard } from "@/components/admin/product-wizard/ProductWizard";
import { DraftProvider, useDraftContext as useDraft } from "@/components/admin/product-management/DraftContext";

function EmptyState({ onCreateDraft }: { onCreateDraft: () => void }) {
  return (
    <Card className="w-full border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-10 text-center">
        <div className="rounded-full bg-primary/10 p-6 mb-4">
          <PlusCircle className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-xl mb-2">No Product Drafts</CardTitle>
        <CardDescription className="mb-6 max-w-md">
          You don't have any product drafts yet. Create a new draft to start
          adding products to your store.
        </CardDescription>
        <Button size="lg" onClick={onCreateDraft}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Product
        </Button>
      </CardContent>
    </Card>
  );
}

function ProductDraftList() {
  const [location, navigate] = useLocation();
  const [match, params] = useRoute("/admin/product-management/:id");
  const [confirmDiscard, setConfirmDiscard] = useState<number | null>(null);
  
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
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drafts.map((draft) => (
                      <TableRow key={draft.id}>
                        <TableCell className="font-medium">
                          {draft.name || "Untitled Product"}
                        </TableCell>
                        <TableCell>
                          {draft.category?.name || "Uncategorized"}
                        </TableCell>
                        <TableCell>
                          {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString() : "Just created"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Draft</Badge>
                        </TableCell>
                        <TableCell className="space-x-2">
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
                    ))}
                  </TableBody>
                </Table>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Draft</DialogTitle>
            <DialogDescription>
              Are you sure you want to discard this draft? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDiscard(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDiscard}
            >
              Discard Draft
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