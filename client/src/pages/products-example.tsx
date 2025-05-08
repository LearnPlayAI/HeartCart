import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import { useToast } from '@/hooks/use-toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Grid2X2,
  List,
  Filter,
  Search
} from 'lucide-react';

// Import our standardized components and hooks
import ProductGrid from '@/components/product/product-grid';
import { useProducts } from '@/hooks/use-products';
import { useCategories } from '@/hooks/use-categories';

// View modes
type ViewMode = 'grid' | 'list';

/**
 * Example page demonstrating standardized components and hooks
 */
const ProductsExample = () => {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const { toast } = useToast();
  
  // State for filters and pagination
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'default');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const limit = 20;
  
  // Use our standardized hooks with error handling built in
  const { categories } = useCategories();
  
  const { 
    productsResponse, 
    isLoading: isLoadingProducts
  } = useProducts({
    categoryId: selectedCategory,
    page,
    limit,
    searchQuery,
    sortBy
  });
  
  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1); // Reset to first page when sort changes
  };
  
  // Handle category change
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setPage(1);
  };
  
  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };
  
  // Handle page change - used by the ProductGrid component
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>Products - TeeMeYou</title>
        <meta name="description" content="Browse our wide range of products at TeeMeYou. Find the best deals on fashion, electronics, and more." />
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Products</h1>
        <p className="text-gray-600">Find the perfect items for your needs</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar with filters */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Filter className="mr-2 h-5 w-5" /> Filters
              </h2>
              
              {/* Category Filter */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">Category</h3>
                <Select value={selectedCategory || ''} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories?.map(category => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Sort By */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">Sort By</h3>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default Sorting" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Sorting</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    <SelectItem value="name_asc">Name: A to Z</SelectItem>
                    <SelectItem value="name_desc">Name: Z to A</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Search */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">Search</h3>
                <form onSubmit={handleSearchSubmit} className="flex">
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery || ''}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" variant="outline" size="icon" className="ml-2">
                    <Search className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* View Mode Toggle */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                className={viewMode === 'grid' ? 'bg-[#FF69B4] hover:bg-[#FF1493]' : ''}
                onClick={() => setViewMode('grid')}
              >
                <Grid2X2 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                className={viewMode === 'list' ? 'bg-[#FF69B4] hover:bg-[#FF1493]' : ''}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Standardized Product Grid Component with built-in pagination */}
          <ProductGrid
            productsResponse={productsResponse}
            currentPage={page}
            onPageChange={handlePageChange}
            isLoading={isLoadingProducts}
            showAddToCart={true}
            viewMode={viewMode}
            onError={(error) => {
              toast({
                title: 'Error loading products',
                description: error.message,
                variant: 'destructive',
              });
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductsExample;