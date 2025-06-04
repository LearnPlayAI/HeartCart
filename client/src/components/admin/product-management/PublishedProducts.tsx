import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
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
  Package,
  Eye,
  Edit,
  ExternalLink,
  ShoppingCart,
  Filter,
  X,
  GitMerge,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Utility function for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Types
interface PublishedProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  costPrice: number;
  salePrice?: number;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryName?: string;
  createdAt: string;
  publishedAt?: string;
  imageUrl?: string;
  brand?: string;
  sku?: string;
  parentCategoryName?: string;
  childCategoryName?: string;
}

export const PublishedProducts: React.FC = () => {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Category filters
  const [selectedParentCategory, setSelectedParentCategory] = useState<string>('');
  const [selectedChildCategory, setSelectedChildCategory] = useState<string>('');
  const [maxTmyFilter, setMaxTmyFilter] = useState<string>('');
  
  // Duplicate detection state
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  
  // Delete functionality state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<PublishedProduct | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Hooks
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Calculate offset for pagination
  const offset = (currentPage - 1) * itemsPerPage;
  
  // Fetch published products with server-side pagination
  const { data: productsData, isLoading: isProductsLoading, error: productsError } = useQuery({
    queryKey: ['/api/products', 
      itemsPerPage, 
      offset, 
      searchQuery,
      selectedChildCategory && selectedChildCategory !== 'all' ? selectedChildCategory :
      selectedParentCategory && selectedParentCategory !== 'all' ? selectedParentCategory :
      'all',
      maxTmyFilter
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      });
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      if (selectedChildCategory && selectedChildCategory !== 'all') {
        params.append('categoryId', selectedChildCategory);
      } else if (selectedParentCategory && selectedParentCategory !== 'all') {
        params.append('categoryId', selectedParentCategory);
      }
      
      if (maxTmyFilter && maxTmyFilter.trim() !== '') {
        const minTmyThreshold = parseFloat(maxTmyFilter);
        if (!isNaN(minTmyThreshold)) {
          params.append('minTmyPercent', String(minTmyThreshold));
        }
      }
      
      const response = await apiRequest('GET', `/api/products?${params.toString()}`);
      return response.json();
    }
  });

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      return response.json();
    }
  });

  const products = productsData?.success ? productsData.data : [];
  const categories = categoriesData?.success ? categoriesData.data : [];
  const pagination = productsData?.success ? productsData.meta : null;

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await apiRequest('DELETE', `/api/products/${productId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete product');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch the products list
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete product. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle delete product
  const handleDeleteProduct = (product: PublishedProduct) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete.id);
    }
  };

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

  // Transform products to include category names with parent/child structure and apply TMY filter
  const enrichedProducts = useMemo(() => {
    let filtered = products.map((product: any) => {
      const category = categoriesWithParents.find((cat: any) => cat.id === product.categoryId);
      return {
        ...product,
        categoryName: category?.name || 'Uncategorized',
        parentCategoryName: category?.parent?.name || 'No Parent',
        childCategoryName: category?.name || 'Uncategorized'
      };
    });

    // Apply TMY percentage filter if specified
    if (maxTmyFilter && maxTmyFilter.trim() !== '') {
      const minTmyThreshold = parseFloat(maxTmyFilter);
      if (!isNaN(minTmyThreshold)) {
        filtered = filtered.filter((product: any) => {
          const costPrice = typeof product.costPrice === 'string' ? parseFloat(product.costPrice) : (product.costPrice || 0);
          const regularPrice = typeof product.price === 'string' ? parseFloat(product.price) : (product.price || 0);
          const salePrice = product.salePrice ? (typeof product.salePrice === 'string' ? parseFloat(product.salePrice) : product.salePrice) : null;
          
          // Calculate TMY profit margin based on effective selling price vs cost
          const effectivePrice = salePrice || regularPrice;
          const tmyMarkup = costPrice > 0 && effectivePrice > 0 ? ((effectivePrice - costPrice) / costPrice * 100) : 0;
          
          return tmyMarkup >= minTmyThreshold;
        });
      }
    }

    return filtered;
  }, [products, categoriesWithParents, maxTmyFilter]);

  // Handle parent category change
  const handleParentCategoryChange = (value: string) => {
    setSelectedParentCategory(value);
    setSelectedChildCategory('all'); // Reset child category when parent changes
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Handle child category change
  const handleChildCategoryChange = (value: string) => {
    setSelectedChildCategory(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  // Calculate pagination metadata from server response
  const totalProducts = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 0;

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

  // Detect duplicates and similar products
  const detectDuplicates = () => {
    const groups: any[] = [];
    const processed = new Set<number>();

    enrichedProducts.forEach((product: PublishedProduct) => {
      if (processed.has(product.id)) return;

      const similarProducts = enrichedProducts.filter((other: PublishedProduct) => {
        if (other.id === product.id || processed.has(other.id)) return false;
        
        const similarity = calculateSimilarity(product.name, other.name);
        // Different SKU but similar/same name
        return similarity >= 0.6; // 60% similarity threshold
      });

      if (similarProducts.length > 0) {
        const group = [product, ...similarProducts];
        const hasExactMatch = group.some((p1: PublishedProduct) => 
          group.some((p2: PublishedProduct) => 
            p1.id !== p2.id && p1.name.toLowerCase().trim() === p2.name.toLowerCase().trim()
          )
        );

        groups.push({
          type: hasExactMatch ? 'exact' : 'similar',
          products: group
        });

        group.forEach((p: PublishedProduct) => processed.add(p.id));
      }
    });

    setDuplicateGroups(groups);
    setShowDuplicates(true);
  };
  
  // Format date relative to now
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
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
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Published Products</h2>
          <p className="text-muted-foreground">
            Manage your live products and their performance
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
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
              <CardTitle>All Published Products</CardTitle>
              <CardDescription>
                {totalProducts} {totalProducts === 1 ? 'product' : 'products'} found
              </CardDescription>
            </div>
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
        </CardHeader>
        <CardContent className="p-0">
          {isProductsLoading ? (
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
          ) : productsError ? (
            <div className="p-6 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Failed to load products</h3>
              <p className="text-muted-foreground">
                There was an error loading your published products. Please try again.
              </p>
            </div>
          ) : enrichedProducts.length === 0 ? (
            <div className="p-6 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No products found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? `No published products match "${searchQuery}"`
                  : "You haven't published any products yet."}
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
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Parent Cat</TableHead>
                    <TableHead>Child Cat</TableHead>
                    <TableHead className="text-right">Prices</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrichedProducts.map((product: PublishedProduct) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <span className="font-mono text-sm">{product.sku || '-'}</span>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {product.slug}
                            </div>
                            {product.brand && (
                              <div className="text-xs text-muted-foreground">
                                {product.brand}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {product.parentCategoryName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {product.childCategoryName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1 text-sm">
                          <div className="font-mono text-xs text-muted-foreground">
                            Cost: {formatCurrency(product.costPrice || 0)}
                          </div>
                          <div className="font-mono text-sm font-medium">
                            Regular: {formatCurrency(product.price || 0)}
                          </div>
                          {product.salePrice && (() => {
                            const costPrice = product.costPrice || 0;
                            const regularPrice = product.price || 0;
                            const tmyMarkup = costPrice > 0 ? ((regularPrice - costPrice) / costPrice * 100) : 0;
                            
                            let saleColorClass = 'text-red-600'; // Default red for ≤20%
                            if (tmyMarkup > 30) {
                              saleColorClass = 'text-green-600';
                            } else if (tmyMarkup > 20) {
                              saleColorClass = 'text-yellow-600';
                            }
                            
                            return (
                              <div className={`font-mono text-sm font-semibold ${saleColorClass}`}>
                                Sale: {formatCurrency(product.salePrice)}
                              </div>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1 text-sm">
                          {(() => {
                            const costPrice = typeof product.costPrice === 'string' ? parseFloat(product.costPrice) : (product.costPrice || 0);
                            const regularPrice = typeof product.price === 'string' ? parseFloat(product.price) : (product.price || 0);
                            const salePrice = product.salePrice ? (typeof product.salePrice === 'string' ? parseFloat(product.salePrice) : product.salePrice) : null;
                            
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
                        <div className="flex flex-col gap-1">
                          <Badge 
                            variant={product.isActive ? "default" : "secondary"}
                            className="text-xs w-fit"
                          >
                            {product.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {product.isFeatured && (
                            <Badge variant="outline" className="text-xs w-fit">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(product.publishedAt || product.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem 
                              className="gap-2"
                              onClick={() => window.open(`/product/id/${product.id}`, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                              View Product
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2"
                              onClick={async () => {
                                try {
                                  console.log(`Creating draft for product ID: ${product.id}`);
                                  
                                  // Create a draft from the published product for editing
                                  const response = await apiRequest('POST', `/api/product-drafts/create-from-published/${product.id}`);
                                  
                                  if (!response.ok) {
                                    const errorData = await response.json();
                                    console.error('API Error:', errorData);
                                    throw new Error(errorData.error?.message || 'Failed to create draft');
                                  }
                                  
                                  const result = await response.json();
                                  console.log('API Response:', result);
                                  
                                  if (result.success && result.data?.draftId) {
                                    console.log(`Navigating to wizard with draft ID: ${result.data.draftId}`);
                                    // Navigate to wizard with the draft ID using router
                                    navigate(`/admin/product-wizard/${result.data.draftId}`);
                                  } else {
                                    throw new Error('Invalid response: missing draft ID');
                                  }
                                } catch (error) {
                                  console.error('Error creating draft:', error);
                                  alert(`Failed to create draft for editing: ${error.message}`);
                                }
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              Edit Product
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="gap-2"
                              onClick={() => window.open(`/product/id/${product.id}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                              View in Store
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="gap-2 text-red-600 focus:text-red-600"
                              onClick={() => handleDeleteProduct(product)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete Product
                            </DropdownMenuItem>
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
        {totalProducts > itemsPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {offset + 1} to {Math.min(offset + itemsPerPage, totalProducts)} of {totalProducts} products
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Duplicate Detection Dialog */}
      <Dialog open={showDuplicates} onOpenChange={setShowDuplicates}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duplicate & Similar Products Detected</DialogTitle>
            <DialogDescription>
              Found {duplicateGroups.length} group(s) of published products with similar or identical names but different SKUs.
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
                  {group.products.map((product: PublishedProduct) => (
                    <div 
                      key={product.id} 
                      className="flex items-center justify-between p-3 bg-white rounded border"
                    >
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
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
                            SKU: {product.sku || 'No SKU'} | Product ID: {product.id}
                          </p>
                          <p className="text-xs text-gray-500">
                            Price: R{product.regularPrice ? product.regularPrice.toFixed(2) : '0.00'}
                            {product.onSale && product.salePrice && (
                              <span className="text-green-600 ml-2">
                                Sale: R{product.salePrice.toFixed(2)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/product/id/${product.id}`, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
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
                <p className="text-sm">All published product names appear to be unique.</p>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete "{productToDelete?.name}"? 
              This action will remove the product and all associated data including images, drafts, and attributes.
              Order history will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteProductMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteProduct}
              disabled={deleteProductMutation.isPending}
            >
              {deleteProductMutation.isPending ? 'Deleting...' : 'Delete Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};