import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import { 
  Plus, Search, MoreVertical, Edit, Trash2, Copy, ExternalLink, 
  Check, X, Clock, Loader2, Filter, SortAsc, SortDesc, 
  FileQuestion, ShoppingCart, FileCheck, Eye, AlertCircle
} from 'lucide-react';

// Types
interface ProductDraft {
  id: number;
  name: string;
  slug: string;
  wizardStep: string;
  categoryId: number | null;
  images: any[];
  createdAt: string;
  lastModified: string; // Date in ISO format string
  updatedAt: string;
  isPublished: boolean;
  publishedProductId: number | null;
  categoryName?: string; // From join
  completedSteps: string[];
  draftStatus: 'draft' | 'in_review' | 'ready_to_publish' | 'published' | 'rejected';
}

export const DraftDashboard: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDraftName, setNewDraftName] = useState('');

  const [newDraftLoading, setNewDraftLoading] = useState(false);
  
  // Fetch product drafts
  const { data: draftsData, isLoading: isDraftsLoading, error: draftsError } = useQuery({
    queryKey: ['/api/product-drafts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/product-drafts');
      return response.json();
    }
  });
  
  // Create draft mutation
  const createDraftMutation = useMutation({
    mutationFn: async (draftName: string) => {
      const response = await apiRequest('POST', '/api/product-drafts', {
        name: draftName,
        slug: draftName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        
        setIsCreateDialogOpen(false);
        setNewDraftName('');
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
        
        // Navigate to the wizard for the new draft
        setLocation(`/admin/product-wizard/${data.data.id}`);
      } else {
        toast({
          title: 'Creation Failed',
          description: data.error?.message || 'Failed to create the product draft.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('Create draft error:', error);
      toast({
        title: 'Creation Failed',
        description: 'An error occurred while creating the product draft.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setNewDraftLoading(false);
    }
  });
  

  
  // Handle create draft
  const handleCreateDraft = () => {
    if (!newDraftName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a name for the product draft.',
        variant: 'destructive',
      });
      return;
    }
    
    setNewDraftLoading(true);
    createDraftMutation.mutate(newDraftName);
  };
  

  
  // Filter drafts based on search query and exclude published products
  const filteredDrafts = draftsData?.data?.filter((draft: ProductDraft) => {
    // Exclude published products from the drafts view
    if (draft.draftStatus === 'published') {
      return false;
    }
    
    // Apply search filter if query exists
    if (searchQuery) {
      return draft.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    return true;
  }) || [];
  
  // Get wizard step display name
  const getStepDisplayName = (stepKey: string) => {
    const stepMap: Record<string, string> = {
      'basic-info': 'Basic Info',
      'images': 'Images',
      'pricing': 'Pricing',
      'attributes': 'Attributes',
      'promotions': 'Promotions',
      'seo': 'SEO',
      'review': 'Review'
    };
    return stepMap[stepKey] || stepKey;
  };
  
  // Format date relative to now
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Not available';
      
      // Log the date string to debug
      console.log('Formatting date:', dateString);
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Not available';
      }
      
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      console.error('Error formatting date:', e, dateString);
      return 'Not available';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Drafts</h2>
          <p className="text-muted-foreground">
            Create, manage, and publish your product drafts
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" />
          <span>Create New Draft</span>
        </Button>
      </div>
      
      <Separator />
      
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search drafts..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <Card>
        <CardHeader className="p-4">
          <CardTitle>All Product Drafts</CardTitle>
          <CardDescription>
            {filteredDrafts.length} {filteredDrafts.length === 1 ? 'draft' : 'drafts'} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isDraftsLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : draftsError ? (
            <div className="p-6 text-center">
              <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Failed to load drafts</h3>
              <p className="text-muted-foreground">
                There was an error loading your product drafts. Please try again.
              </p>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] })}
              >
                Retry
              </Button>
            </div>
          ) : filteredDrafts.length === 0 ? (
            <div className="p-6 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No drafts found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? `No product drafts match "${searchQuery}"`
                  : "You haven't created any product drafts yet."}
              </p>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrafts.map((draft: ProductDraft) => (
                    <TableRow key={draft.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{draft.name}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {draft.slug}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {draft.draftStatus === 'published' ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 gap-1">
                            <Check className="h-3 w-3" />
                            Published
                          </Badge>
                        ) : draft.draftStatus === 'ready_to_publish' ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 gap-1">
                            <FileCheck className="h-3 w-3" />
                            Ready to Publish
                          </Badge>
                        ) : draft.draftStatus === 'in_review' ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 gap-1">
                            <Eye className="h-3 w-3" />
                            In Review
                          </Badge>
                        ) : draft.draftStatus === 'rejected' ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Rejected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 gap-1">
                            <Clock className="h-3 w-3" />
                            Draft
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(draft.lastModified)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {draft.completedSteps ? 
                            `${draft.completedSteps.length} of 7 steps completed` : 
                            getStepDisplayName(draft.wizardStep)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link to={`/admin/product-wizard/${draft.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Draft
                              </Link>
                            </DropdownMenuItem>
                            {draft.isPublished && draft.publishedProductId && (
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/products/${draft.publishedProductId}`}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Published
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Create New Draft Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Product Draft</DialogTitle>
            <DialogDescription>
              Enter a name for your new product. You can edit all other details in the product wizard.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Product Name
                </label>
                <Input
                  id="name"
                  placeholder="Enter product name"
                  value={newDraftName}
                  onChange={(e) => setNewDraftName(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  This will also generate a URL-friendly slug for your product
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={newDraftLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateDraft}
              disabled={!newDraftName.trim() || newDraftLoading}
              className="gap-2"
            >
              {newDraftLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create & Open Wizard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      

    </div>
  );
};

export default DraftDashboard;