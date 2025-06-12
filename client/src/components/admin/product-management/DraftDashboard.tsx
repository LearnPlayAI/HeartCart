import React, { useState, useMemo, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import { 
  Plus, Search, MoreVertical, Edit, Trash2, Copy, ExternalLink, 
  Check, X, Clock, Loader2, Filter, SortAsc, SortDesc, 
  FileQuestion, ShoppingCart, FileCheck, Eye, AlertCircle, Package, GitMerge,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ChevronUp, ChevronDown, ArrowUpDown
} from 'lucide-react';

// Constants
const DRAFTS_PER_PAGE = 20;

// Utility function for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Types
interface ProductDraft {
  id: number;
  name: string;
  slug: string;
  wizardStep: string;
  categoryId: number | null;
  images: any[];
  imageUrls?: string[];
  mainImageIndex?: number;
  createdAt: string;
  lastModified: string; // Date in ISO format string
  updatedAt: string;
  isPublished: boolean;
  publishedProductId: number | null;
  categoryName?: string; // From join
  parentCategoryName?: string; // From enrichment
  childCategoryName?: string; // From enrichment
  sku?: string;
  completedSteps: string[];
  draftStatus: 'draft' | 'in_review' | 'ready_to_publish' | 'published' | 'rejected';
  costPrice?: number;
  regularPrice?: number;
  salePrice?: number;
}

export const DraftDashboard: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDraftName, setNewDraftName] = useState('');
  
  // Category filters
  const [selectedParentCategory, setSelectedParentCategory] = useState<string>('');
  const [selectedChildCategory, setSelectedChildCategory] = useState<string>('');
  const [maxTmyFilter, setMaxTmyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sorting state
  const [sortField, setSortField] = useState<string>('lastModified');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Sortable header component
  const SortableHeader = ({ field, children, className = "" }: { 
    field: string; 
    children: React.ReactNode; 
    className?: string;
  }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/50 select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortOrder === 'asc' ? 
            <ChevronUp className="h-4 w-4 text-primary" /> : 
            <ChevronDown className="h-4 w-4 text-primary" />
        ) : (
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </TableHead>
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Duplicate detection
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);

  const [newDraftLoading, setNewDraftLoading] = useState(false);

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedParentCategory, selectedChildCategory]);
  
  // Fetch categories for filtering
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      return response.json();
    }
  });

  // Fetch product drafts with search functionality and pagination
  const { data: draftsData, isLoading: isDraftsLoading, error: draftsError } = useQuery({
    queryKey: ['/api/product-drafts', debouncedSearchQuery, currentPage, selectedParentCategory, selectedChildCategory, maxTmyFilter, statusFilter, sortField, sortOrder],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (debouncedSearchQuery) {
        searchParams.append('search', debouncedSearchQuery);
      }
      if (selectedParentCategory && selectedParentCategory !== '') {
        searchParams.append('parentCategoryId', selectedParentCategory);
      }
      if (selectedChildCategory && selectedChildCategory !== '' && selectedChildCategory !== 'all') {
        searchParams.append('childCategoryId', selectedChildCategory);
      }
      if (maxTmyFilter && maxTmyFilter.trim() !== '') {
        searchParams.append('minTmyPercent', maxTmyFilter);
      }
      if (statusFilter && statusFilter !== 'all') {
        searchParams.append('statusFilter', statusFilter);
      }
      if (sortField) {
        searchParams.append('sortField', sortField);
      }
      if (sortOrder) {
        searchParams.append('sortOrder', sortOrder);
      }
      searchParams.append('limit', itemsPerPage.toString());
      searchParams.append('offset', ((currentPage - 1) * itemsPerPage).toString());
      const url = `/api/product-drafts?${searchParams.toString()}`;
      const response = await apiRequest('GET', url);
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
  

  const drafts = draftsData?.success ? (draftsData.data?.drafts || draftsData.data || []) : [];
  const categories = categoriesData?.success ? categoriesData.data : [];

  // Organize categories into parent/child relationships
  const categoriesWithParents = useMemo(() => {
    const categoryMap = new Map(categories.map((cat: any) => [cat.id, cat]));
    return categories.map((category: any) => ({
      ...category,
      parent: category.parentId ? categoryMap.get(category.parentId) : null
    }));
  }, [categories]);

  // Process categories into parent and child relationships
  const parentCategories = useMemo(() => {
    return categories.filter((cat: any) => cat.parentId === null || cat.parentId === undefined);
  }, [categories]);

  const childCategories = useMemo(() => {
    if (!selectedParentCategory) return [];
    const parentId = parseInt(selectedParentCategory);
    return categories.filter((cat: any) => cat.parentId === parentId);
  }, [categories, selectedParentCategory]);

  // Transform drafts to include category names with parent/child structure
  const enrichedDrafts = useMemo(() => {
    return drafts.map((draft: any) => {
      const category = categoriesWithParents.find((cat: any) => cat.id === draft.categoryId);
      return {
        ...draft,
        categoryName: category?.name || 'Uncategorized',
        parentCategoryName: category?.parent?.name || 'No Parent',
        childCategoryName: category?.name || 'Uncategorized'
      };
    });
  }, [drafts, categoriesWithParents]);

  // Handle parent category change
  const handleParentCategoryChange = (value: string) => {
    setSelectedParentCategory(value);
    setSelectedChildCategory('all'); // Reset child category when parent changes
  };

  // Filter drafts with category filtering
  const filteredDrafts = useMemo(() => {
    let filtered = enrichedDrafts;

    // Apply category filtering
    if (selectedParentCategory && selectedParentCategory !== 'all') {
      const parentId = parseInt(selectedParentCategory);
      
      if (selectedChildCategory && selectedChildCategory !== 'all') {
        // Filter by specific child category
        const childId = parseInt(selectedChildCategory);
        filtered = filtered.filter((draft: ProductDraft) => draft.categoryId === childId);
      } else {
        // Filter by parent category - include all products under this parent and its children
        const parentAndChildIds = [parentId];
        const childCats = categories.filter((cat: any) => cat.parentId === parentId);
        parentAndChildIds.push(...childCats.map((cat: any) => cat.id));
        
        filtered = filtered.filter((draft: ProductDraft) => 
          draft.categoryId && parentAndChildIds.includes(draft.categoryId)
        );
      }
    }

    // Apply TMY filter if specified
    if (maxTmyFilter && !isNaN(parseFloat(maxTmyFilter))) {
      const maxTmyValue = parseFloat(maxTmyFilter);
      filtered = filtered.filter((draft: ProductDraft) => {
        const costPrice = draft.costPrice || 0;
        const regularPrice = draft.regularPrice || 0;
        const salePrice = draft.salePrice || regularPrice;
        // Use sale price for TMY markup calculation (actual profit margin)
        const tmyMarkup = costPrice > 0 && salePrice > 0 ? ((salePrice - costPrice) / costPrice * 100) : 0;
        return tmyMarkup <= maxTmyValue;
      });
    }

    return filtered;
  }, [enrichedDrafts, selectedParentCategory, selectedChildCategory, categories, maxTmyFilter]);

  // Use server-side pagination data
  const totalFilteredDrafts = draftsData?.data?.total || 0;
  const totalPages = Math.ceil(totalFilteredDrafts / DRAFTS_PER_PAGE);
  const paginatedDrafts = filteredDrafts;

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedParentCategory, selectedChildCategory, maxTmyFilter]);

  // Helper function to calculate name similarity
  const calculateSimilarity = (name1: string, name2: string): number => {
    const str1 = name1.toLowerCase().trim();
    const str2 = name2.toLowerCase().trim();
    
    if (str1 === str2) return 1; // Exact match
    
    // Simple similarity based on word overlap
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);
    
    return commonWords.length / totalWords;
  };

  // Fetch all duplicates from server
  const { data: duplicatesData, refetch: refetchDuplicates } = useQuery({
    queryKey: ['/api/product-drafts-duplicates'],
    enabled: false, // Don't auto-fetch, only when requested
  });

  // Detect duplicates using server-side search
  const detectDuplicates = async () => {
    try {
      const result = await refetchDuplicates();
      if (result.data?.success) {
        setDuplicateGroups(result.data.data.groups || []);
        setShowDuplicates(true);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch duplicate products',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch duplicate products',
        variant: 'destructive',
      });
    }
  };

  // Delete product draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      const response = await apiRequest('DELETE', `/api/product-drafts/${draftId}`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Product draft deleted successfully',
        });
        // Refresh both main drafts list and duplicates
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
        refetchDuplicates();
      } else {
        toast({
          title: 'Error',
          description: data.error?.message || 'Failed to delete product draft',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'Failed to delete product draft',
        variant: 'destructive',
      });
    }
  });

  // Handle delete draft
  const handleDeleteDraft = (draftId: number) => {
    deleteDraftMutation.mutate(draftId);
  };
  
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
        
        {/* Category Filters */}
        <Select value={selectedParentCategory} onValueChange={handleParentCategoryChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Parent Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Parent Categories</SelectItem>
            {parentCategories.map((category: any) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select 
          value={selectedChildCategory} 
          onValueChange={setSelectedChildCategory}
          disabled={!selectedParentCategory || childCategories.length === 0}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Child Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Child Categories</SelectItem>
            {childCategories.map((category: any) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="ready_to_publish">Ready to Publish</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {/* Min. TMY % Filter */}
        <div className="relative">
          <Input
            placeholder="Min. TMY %"
            className="w-[120px]"
            value={maxTmyFilter}
            onChange={(e) => setMaxTmyFilter(e.target.value)}
            type="number"
            min="0"
            max="100"
            step="0.1"
          />
        </div>
      </div>
      
      <Card>
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Product Drafts</CardTitle>
              <CardDescription>
                {totalFilteredDrafts} {totalFilteredDrafts === 1 ? 'draft' : 'drafts'} found
              </CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              {/* Top Pagination Controls */}
              {totalFilteredDrafts > itemsPerPage && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1));
                      setTimeout(() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }, 50);
                    }}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                      setTimeout(() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }, 50);
                    }}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={detectDuplicates}
                className="flex items-center gap-2"
              >
                <GitMerge className="h-4 w-4" />
                Find Duplicates
              </Button>
            </div>
          </div>
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
                    <SortableHeader field="sku">SKU</SortableHeader>
                    <SortableHeader field="name">Product</SortableHeader>
                    <SortableHeader field="parentCategory">Parent Cat</SortableHeader>
                    <SortableHeader field="childCategory">Child Cat</SortableHeader>
                    <SortableHeader field="regularPrice" className="text-right">Prices</SortableHeader>
                    <SortableHeader field="tmyPercentage" className="text-right">Percentages</SortableHeader>
                    <SortableHeader field="draftStatus">Status</SortableHeader>
                    <SortableHeader field="lastModified">Last Updated</SortableHeader>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDrafts.map((draft: ProductDraft) => (
                    <TableRow key={draft.id}>
                      <TableCell>
                        <span className="font-mono text-sm">{draft.sku || '-'}</span>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {draft.imageUrls && draft.imageUrls.length > 0 ? (
                            <img 
                              src={draft.imageUrls[draft.mainImageIndex || 0]} 
                              alt={draft.name}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{draft.name}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {draft.slug}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {draft.parentCategoryName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {draft.childCategoryName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1 text-sm">
                          <div className="font-mono text-xs text-muted-foreground">
                            Cost: {formatCurrency(draft.costPrice || 0)}
                          </div>
                          <div className="font-mono text-sm font-medium">
                            Regular: {formatCurrency(draft.regularPrice || 0)}
                          </div>
                          {draft.salePrice && (() => {
                            const costPrice = draft.costPrice || 0;
                            const regularPrice = draft.regularPrice || 0;
                            const tmyMarkup = costPrice > 0 ? ((regularPrice - costPrice) / costPrice * 100) : 0;
                            
                            let saleColorClass = 'text-red-600'; // Default red for ≤20%
                            if (tmyMarkup > 30) {
                              saleColorClass = 'text-green-600';
                            } else if (tmyMarkup > 20) {
                              saleColorClass = 'text-yellow-600';
                            }
                            
                            return (
                              <div className={`font-mono text-sm font-semibold ${saleColorClass}`}>
                                Sale: {formatCurrency(draft.salePrice)}
                              </div>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1 text-sm">
                          {(() => {
                            const costPrice = typeof draft.costPrice === 'string' ? parseFloat(draft.costPrice) : (draft.costPrice || 0);
                            const regularPrice = typeof draft.regularPrice === 'string' ? parseFloat(draft.regularPrice) : (draft.regularPrice || 0);
                            const salePrice = draft.salePrice ? (typeof draft.salePrice === 'string' ? parseFloat(draft.salePrice) : draft.salePrice) : null;
                            
                            // TMY profit margin should be based on sale price vs cost price (actual profit TeeMeYou makes)
                            const effectivePrice = salePrice || regularPrice;
                            const tmyMarkup = costPrice > 0 && effectivePrice > 0 ? ((effectivePrice - costPrice) / costPrice * 100) : 0;
                            const customerDiscount = salePrice && regularPrice > 0 && salePrice < regularPrice ? ((regularPrice - salePrice) / regularPrice * 100) : 0;
                            
                            return (
                              <>
                                <div className="flex items-center justify-end gap-1">
                                  {tmyMarkup > 0 ? (
                                    <TrendingUp className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3 text-red-600" />
                                  )}
                                  <span className={`font-semibold text-xs ${
                                    tmyMarkup <= 20 ? 'text-red-600' : 
                                    tmyMarkup <= 30 ? 'text-yellow-600' : 'text-green-600'
                                  }`}>
                                    TMY: {tmyMarkup.toFixed(1)}%
                                  </span>
                                </div>
                                {customerDiscount > 0 && (
                                  <div className="flex justify-end">
                                    <Badge className="font-mono text-xs bg-pink-500 hover:bg-pink-600 text-white">
                                      {customerDiscount.toFixed(1)}%
                                    </Badge>
                                  </div>
                                )}
                              </>
                            );
                          })()}
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
        
        {/* Pagination Controls */}
        {totalFilteredDrafts > itemsPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalFilteredDrafts)} of {totalFilteredDrafts} drafts
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 50);
                }}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 50);
                }}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
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

      {/* Duplicate Detection Dialog */}
      <Dialog open={showDuplicates} onOpenChange={setShowDuplicates}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duplicate & Similar Products Detected</DialogTitle>
            <DialogDescription>
              Found {duplicateGroups.length} group(s) of products with similar or identical names but different SKUs.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {duplicateGroups.map((group: any, groupIndex: number) => (
              <div 
                key={groupIndex} 
                className={`border rounded-lg p-4 ${
                  group.type === 'exact' ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={group.type === 'exact' ? 'destructive' : 'secondary'}>
                    {group.type === 'exact' ? 'Exact Match' : 'Similar Names'}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {group.products.length} products in this group
                  </span>
                </div>
                
                <div className="grid gap-3">
                  {group.products.map((product: ProductDraft) => (
                    <div 
                      key={product.id} 
                      className="flex items-center justify-between p-3 bg-white rounded border"
                    >
                      <div className="flex items-center gap-3">
                        {product.images && product.images.length > 0 ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-gray-600">
                            SKU: {product.slug || 'No SKU'} | Draft ID: {product.id}
                          </p>
                          <p className="text-xs text-gray-500">
                            Status: {product.draftStatus} | Step: {getStepDisplayName(product.wizardStep)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/admin/product-wizard/${product.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {duplicateGroups.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No duplicate or similar products found.</p>
                <p className="text-sm">All product names appear to be unique.</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicates(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default DraftDashboard;