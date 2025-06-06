import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductSearch } from '@/components/ui/product-search';
import { useToast } from '@/hooks/use-toast';
import { 
  Search,
  Filter, 
  Edit, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Calculator,
  DollarSign,
  Tag,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useLocation } from 'wouter';

interface ProductPricingData {
  id: number;
  name: string;
  slug: string;
  sku?: string;
  imageUrl?: string;
  categoryId: number;
  categoryName?: string;
  parentCategoryName?: string;
  price: number; // regular price
  salePrice?: number;
  costPrice: number;
  stock: number;
  isActive: boolean;
  supplier?: string;
  catalogId?: number;
  catalogName?: string;
}

interface Category {
  id: number;
  name: string;
  parentId?: number;
  parent?: Category;
}

type SortField = 'name' | 'sku' | 'parentCategory' | 'childCategory' | 'costPrice' | 'price' | 'salePrice' | 'tmyMarkup' | 'customerDiscount';
type SortDirection = 'asc' | 'desc';

export default function PricingPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [parentCategoryFilter, setParentCategoryFilter] = useState<string>('all');
  const [childCategoryFilter, setChildCategoryFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [catalogFilter, setCatalogFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch products with category filtering support
  const { data: productsResponse, isLoading: isProductsLoading, error: productsError } = useQuery({
    queryKey: ['/api/products', parentCategoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '1000', // Get all products to ensure we don't miss any due to pagination
        offset: '0'
      });
      
      // If a parent category is selected, pass it to the backend for hierarchical filtering
      if (parentCategoryFilter && parentCategoryFilter !== 'all' && parentCategoryFilter !== '') {
        params.append('category', parentCategoryFilter);
      }
      
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  // Fetch search results separately when there's a search query
  const { data: searchResponse } = useQuery({
    queryKey: ['/api/search', searchQuery.trim()],
    queryFn: async () => {
      if (!searchQuery.trim()) return { data: [] };
      const searchParams = new URLSearchParams({
        q: searchQuery.trim(),
        limit: '1000',
        offset: '0'
      });
      const response = await fetch(`/api/search?${searchParams}`);
      if (!response.ok) throw new Error('Failed to search products');
      return response.json();
    },
    enabled: !!searchQuery.trim()
  });

  // Fetch categories
  const { data: categoriesResponse } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Fetch catalogs
  const { data: catalogsResponse } = useQuery({
    queryKey: ['/api/catalogs'],
    queryFn: async () => {
      const response = await fetch('/api/catalogs');
      if (!response.ok) throw new Error('Failed to fetch catalogs');
      return response.json();
    }
  });

  // Fetch suppliers
  const { data: suppliersResponse } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const response = await fetch('/api/suppliers');
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      return response.json();
    }
  });

  const products = productsResponse?.data || [];
  const categories = categoriesResponse?.data || [];
  const catalogs = catalogsResponse?.data || [];
  const suppliers = suppliersResponse?.data || [];

  // Organize categories into parent/child relationships
  const categoriesWithParents = useMemo(() => {
    // Create a map for quick lookup
    const categoryMap = new Map(categories.map((cat: any) => [cat.id, cat]));
    
    // Add parent information to each category
    return categories.map((category: any) => ({
      ...category,
      parent: category.parentId ? categoryMap.get(category.parentId) : null
    }));
  }, [categories]);

  // Get parent categories (categories with no parentId) - only active ones
  const parentCategories = useMemo(() => {
    return categoriesWithParents.filter((cat: any) => !cat.parentId && cat.isActive);
  }, [categoriesWithParents]);

  // Get child categories for the selected parent - only active ones
  const availableChildCategories = useMemo(() => {
    if (!parentCategoryFilter || parentCategoryFilter === 'all') return [];
    const parentId = parseInt(parentCategoryFilter);
    return categoriesWithParents.filter((cat: any) => cat.parentId === parentId && cat.isActive);
  }, [categoriesWithParents, parentCategoryFilter]);

  // Calculate derived pricing data
  const enrichedProducts = useMemo(() => {
    return products.map((product: ProductPricingData) => {
      const category = categories.find((cat: Category) => cat.id === product.categoryId);
      const catalog = catalogs.find((cat: any) => cat.id === product.catalogId);
      const supplier = suppliers.find((sup: any) => sup.id === parseInt(product.supplier || '0'));
      
      // Calculate TMY markup percentage (profit margin between cost and sale price)
      const effectivePrice = product.salePrice || product.price;
      const tmyMarkup = product.costPrice > 0 
        ? ((effectivePrice - product.costPrice) / product.costPrice * 100) 
        : 0;
      
      // Calculate customer discount percentage (discount between regular and sale price)
      const customerDiscount = product.salePrice && product.price > 0
        ? ((product.price - product.salePrice) / product.price * 100)
        : 0;

      return {
        ...product,
        categoryName: category?.name || 'Uncategorized',
        parentCategoryName: category?.parent?.name || 'No Parent',
        childCategoryName: category?.name || 'Uncategorized',
        catalogName: catalog?.name || 'No Catalog',
        supplierName: supplier?.name || 'No Supplier',
        tmyMarkup: Number(tmyMarkup.toFixed(2)),
        customerDiscount: Number(customerDiscount.toFixed(2)),
        effectivePrice
      };
    });
  }, [products, categories, catalogs, suppliers]);

  // Get unique values for filters
  const uniqueCategories = useMemo(() => {
    const categorySet = new Set(enrichedProducts.map((p: any) => p.categoryName));
    return Array.from(categorySet).sort();
  }, [enrichedProducts]);

  const uniqueSuppliers = useMemo(() => {
    const supplierSet = new Set(enrichedProducts.filter((p: any) => p.supplierName).map((p: any) => p.supplierName));
    return Array.from(supplierSet).sort();
  }, [enrichedProducts]);

  const uniqueCatalogs = useMemo(() => {
    const catalogSet = new Set(enrichedProducts.map((p: any) => p.catalogName));
    return Array.from(catalogSet).sort();
  }, [enrichedProducts]);

  // Apply additional filters including search
  const filteredProducts = useMemo(() => {
    const searchResults = searchResponse?.data || [];
    
    return enrichedProducts.filter((product: any) => {
      // Search filter - if there's a search query, only show products that match the search
      if (searchQuery.trim() && searchResults.length > 0) {
        const searchResultIds = searchResults.map((p: any) => p.id);
        if (!searchResultIds.includes(product.id)) return false;
      }
      
      // Parent category filter
      if (parentCategoryFilter && parentCategoryFilter !== 'all') {
        const parentId = parseInt(parentCategoryFilter);
        const productCategory = categoriesWithParents.find((cat: any) => cat.id === product.categoryId);
        
        // Debug logging
        if (parentCategoryFilter === '36') { // Computers has ID 36
          console.log('Debug - Product:', product.name, 'CategoryId:', product.categoryId);
          console.log('Debug - ProductCategory found:', productCategory);
          console.log('Debug - Parent ID we are filtering by:', parentId);
        }
        
        if (productCategory) {
          // Check if product's category is the parent or a child of the parent
          const isParentCategory = productCategory.id === parentId;
          const isChildOfParent = productCategory.parentId === parentId;
          
          if (parentCategoryFilter === '24') {
            console.log('Debug - isParentCategory:', isParentCategory, 'isChildOfParent:', isChildOfParent);
          }
          
          if (!isParentCategory && !isChildOfParent) {
            return false;
          }
        } else {
          // If no category found, exclude the product
          return false;
        }
      }

      // Child category filter
      if (childCategoryFilter && childCategoryFilter !== 'all') {
        const childId = parseInt(childCategoryFilter);
        if (product.categoryId !== childId) {
          return false;
        }
      }

      // Supplier filter
      if (supplierFilter && supplierFilter !== 'all' && product.supplierName !== supplierFilter) {
        return false;
      }

      // Catalog filter
      if (catalogFilter && catalogFilter !== 'all' && product.catalogName !== catalogFilter) {
        return false;
      }

      return true;
    });
  }, [enrichedProducts, parentCategoryFilter, childCategoryFilter, supplierFilter, catalogFilter, searchQuery, searchResponse, categoriesWithParents]);

  // Sort products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'sku':
          aValue = a.sku || '';
          bValue = b.sku || '';
          break;
        case 'parentCategory':
          aValue = a.parentCategoryName;
          bValue = b.parentCategoryName;
          break;
        case 'childCategory':
          aValue = a.childCategoryName;
          bValue = b.childCategoryName;
          break;
        case 'costPrice':
          aValue = a.costPrice;
          bValue = b.costPrice;
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'salePrice':
          aValue = a.salePrice || 0;
          bValue = b.salePrice || 0;
          break;
        case 'tmyMarkup':
          aValue = a.tmyMarkup;
          bValue = b.tmyMarkup;
          break;
        case 'customerDiscount':
          aValue = a.customerDiscount;
          bValue = b.customerDiscount;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle edit product
  const handleEditProduct = async (productId: number) => {
    try {
      // Set flag to indicate we came from pricing page
      sessionStorage.setItem('cameFromPricing', 'true');
      
      // Call API to create or reuse existing draft
      const response = await fetch(`/api/product-drafts/create-from-published/${productId}`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error("Failed to create product draft");
        return;
      }
      
      // Get the draft data
      const result = await response.json();
      
      if (result.success && result.data) {
        // Navigate to product wizard with the draft ID
        setLocation(`/admin/product-wizard/${result.data.draftId}`);
      } else {
        console.error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error creating product draft:", error);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setParentCategoryFilter('all');
    setChildCategoryFilter('all');
    setSupplierFilter('all');
    setCatalogFilter('all');
    setCurrentPage(1);
  };

  // Active filters count
  const activeFiltersCount = [
    searchQuery, 
    parentCategoryFilter !== 'all' ? parentCategoryFilter : '', 
    childCategoryFilter !== 'all' ? childCategoryFilter : '', 
    supplierFilter !== 'all' ? supplierFilter : '', 
    catalogFilter !== 'all' ? catalogFilter : ''
  ].filter(Boolean).length;

  if (productsError) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Error Loading Products</h3>
                <p className="text-muted-foreground">There was an error loading the product data. Please try again.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Pricing Management</h1>
            <p className="text-muted-foreground">
              Manage pricing, markups, and discounts for all published products
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>{sortedProducts.length} products</span>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount} active
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name, description, SKU, brand, supplier, category, tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {activeFiltersCount > 0 && (
                <Button variant="outline" onClick={clearFilters} className="shrink-0">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Parent Category Filter */}
              <Select value={parentCategoryFilter} onValueChange={(value) => {
                setParentCategoryFilter(value);
                setChildCategoryFilter('all'); // Reset child when parent changes
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by parent category" />
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

              {/* Child Category Filter */}
              <Select 
                value={childCategoryFilter} 
                onValueChange={setChildCategoryFilter}
                disabled={!parentCategoryFilter || parentCategoryFilter === 'all' || availableChildCategories.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !parentCategoryFilter || parentCategoryFilter === 'all'
                      ? "Select parent first" 
                      : availableChildCategories.length === 0 
                        ? "No child categories"
                        : "Filter by child category"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Child Categories</SelectItem>
                  {availableChildCategories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {uniqueSuppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier || 'unknown'}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={catalogFilter} onValueChange={setCatalogFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by catalog" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Catalogs</SelectItem>
                  {uniqueCatalogs.map((catalog) => (
                    <SelectItem key={catalog} value={catalog || 'unknown'}>
                      {catalog}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Product Pricing Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isProductsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading products...</p>
                </div>
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
                <p className="text-muted-foreground">
                  {activeFiltersCount > 0 
                    ? "No products match your current filters. Try adjusting your search criteria."
                    : "No products available. Add some products to get started."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Desktop Table */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-2">
                            Product
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('sku')}
                        >
                          <div className="flex items-center gap-2">
                            SKU
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('parentCategory')}
                        >
                          <div className="flex items-center gap-2">
                            Parent Cat
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('childCategory')}
                        >
                          <div className="flex items-center gap-2">
                            Child Cat
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 text-right"
                          onClick={() => handleSort('costPrice')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Cost Price
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 text-right"
                          onClick={() => handleSort('price')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Regular Price
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 text-right"
                          onClick={() => handleSort('salePrice')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Sale Price
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 text-right"
                          onClick={() => handleSort('tmyMarkup')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            TMY Markup %
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 text-right"
                          onClick={() => handleSort('customerDiscount')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Cust Discount %
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProducts.map((product: any) => (
                        <TableRow key={product.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                {product.imageUrl ? (
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Package className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{product.name}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {product.supplier || 'No supplier'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {product.sku || 'No SKU'}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {product.parentCategoryName}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {product.childCategoryName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(product.costPrice)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(product.price)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {product.salePrice ? (
                              <span className="text-red-600 font-semibold">
                                {formatCurrency(product.salePrice)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {product.tmyMarkup > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              <span className={`font-semibold ${
                                product.tmyMarkup > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {product.tmyMarkup}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {product.customerDiscount > 0 ? (
                              <Badge className="font-mono bg-pink-500 hover:bg-pink-600 text-white">
                                {product.customerDiscount}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditProduct(product.id)}
                              className="hover:bg-primary hover:text-primary-foreground"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                  {paginatedProducts.map((product: any) => (
                    <Card key={product.id} className="p-4">
                      <div className="space-y-4">
                        {/* Product Header */}
                        <div className="flex items-center gap-3">
                          <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {product.supplier || 'No supplier'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {product.sku || 'No SKU'}
                              </code>
                            </div>
                          </div>
                        </div>

                        {/* Categories */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Parent:</span>
                              <Badge variant="secondary" className="text-xs">
                                {product.parentCategoryName}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Child:</span>
                              <Badge variant="outline">
                                {product.childCategoryName}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Pricing Grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Cost Price</p>
                            <p className="font-mono font-semibold">{formatCurrency(product.costPrice)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Regular Price</p>
                            <p className="font-mono font-semibold">{formatCurrency(product.price)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Sale Price</p>
                            <p className="font-mono font-semibold">
                              {product.salePrice ? (
                                <span className="text-red-600">{formatCurrency(product.salePrice)}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">TMY Markup</p>
                            <div className="flex items-center gap-1">
                              {product.tmyMarkup > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              <span className={`font-semibold ${
                                product.tmyMarkup > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {product.tmyMarkup}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Customer Discount & Action */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Customer Discount: </span>
                            {product.customerDiscount > 0 ? (
                              <Badge className="font-mono text-xs bg-pink-500 hover:bg-pink-600 text-white">
                                {product.customerDiscount}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProduct(product.id)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedProducts.length)} of {sortedProducts.length} products
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentPage(currentPage - 1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                          return (
                            <Button
                              key={pageNum}
                              variant={pageNum === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setCurrentPage(pageNum);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="w-8"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="px-2">...</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCurrentPage(totalPages);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="w-8"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentPage(currentPage + 1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}