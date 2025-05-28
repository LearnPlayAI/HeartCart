import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { StandardApiResponse } from '@/types/api';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, 
  SlidersHorizontal, 
  X, 
  Search,
  Star,
  Grid2X2,
  List,
  CircleCheck
} from 'lucide-react';
import ProductCard from '@/components/product/product-card';
import CategorySidebar from '@/components/ui/category-sidebar';
import type { Product, Category } from '@shared/schema';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import type { Attribute, AttributeOption } from '@/types/attribute-types';

// Availability filter options (replaced stock filter)
const availabilityOptions = [
  { value: 'all', label: 'All Products' },
];

// Rating filter options
const ratingOptions = [
  { value: '4_and_up', label: '4 Stars & Up' },
  { value: '3_and_up', label: '3 Stars & Up' },
  { value: '2_and_up', label: '2 Stars & Up' },
  { value: '1_and_up', label: '1 Star & Up' }
];

// View modes
type ViewMode = 'grid' | 'list';

// Type definition for attribute filters
interface AttributeFilter {
  attributeId: number;
  attributeName: string;
  selectedOptions: string[];
}

// Helper function to get attribute display name
const getAttributeDisplayName = (attribute: any): string => {
  if (attribute.overrideDisplayName) {
    return attribute.overrideDisplayName;
  }
  // Try different attribute name properties based on the structure
  return attribute.attribute?.displayName || 
         attribute.attribute?.name || 
         attribute.displayName || 
         attribute.name || 
         'Unknown Attribute';
};

const ProductListing = () => {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const { addItem } = useCart();
  const { toast } = useToast();
  
  // State for filters
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'default');
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!) : null
  );
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(searchParams.get('rating') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilter[]>([]);
  const [filters, setFilters] = useState({
    onSale: searchParams.get('on_sale') === 'true',
    freeShipping: searchParams.get('free_shipping') === 'true',
    newArrivals: searchParams.get('new_arrivals') === 'true'
  });
  
  // Pagination
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const limit = 20;
  
  // Fetch categories
  const { 
    data: categoriesResponse, 
    error: categoriesError 
  } = useQuery<StandardApiResponse<Category[]>>({
    queryKey: ['/api/categories'],
  });
  const categories = categoriesResponse?.success ? categoriesResponse.data : [];
  
  // Fetch products with comprehensive filtering
  const queryParams = {
    limit, 
    offset: (page - 1) * limit,
    ...(attributeFilters.length > 0 && { attributeFilters: JSON.stringify(attributeFilters) }),
    ...(searchQuery && { q: searchQuery }),
    ...(selectedCategoryId && { categoryId: selectedCategoryId }),
    ...(sortBy !== 'default' && { sort: sortBy }),
    ...(priceRange[0] > 0 && { minPrice: priceRange[0] }),
    ...(priceRange[1] < 5000 && { maxPrice: priceRange[1] }),
    ...(ratingFilter && { minRating: ratingFilter }),
    ...(availabilityFilter !== 'all' && { availability: availabilityFilter }),
    ...(filters.onSale && { onSale: true }),
    ...(filters.freeShipping && { freeShipping: true }),
    ...(filters.newArrivals && { newArrivals: true })
  };

  // Debug logging for attribute filters
  console.log("Current attribute filters:", attributeFilters);
  console.log("Query params being sent:", queryParams);
  
  const { 
    data: productsResponse, 
    isLoading: isLoadingProducts,
    error: productsError
  } = useQuery<StandardApiResponse<Product[], { total?: number, totalPages?: number }>>({
    queryKey: ['/api/products', queryParams],
  });
  const products = productsResponse?.success ? productsResponse.data : [];
  const totalPages = productsResponse?.meta?.totalPages || 1;
  
  // Fetch categories with children for hierarchical filtering
  const { 
    data: categoriesWithChildrenResponse 
  } = useQuery({
    queryKey: ["/api/categories/main/with-children"],
  });
  const categoriesWithChildren = categoriesWithChildrenResponse?.success ? categoriesWithChildrenResponse.data : [];

  // Fetch filterable attributes based on selected category
  const { 
    data: filterableAttributesResponse, 
    isLoading: isLoadingAttributes,
    error: attributesError
  } = useQuery<StandardApiResponse<any[]>>({
    queryKey: [selectedCategory ? 
      `/api/categories/${selectedCategory}/filterable-attributes` : 
      '/api/products/filterable-attributes'
    ],
    enabled: !!products,
  });
  const filterableAttributes = filterableAttributesResponse?.success ? filterableAttributesResponse.data : [];
  
  // Handle API errors
  useEffect(() => {
    const errors = [
      { error: categoriesError, name: 'categories' },
      { error: productsError, name: 'products' },
      { error: attributesError, name: 'product attributes' }
    ].filter(item => item.error);
    
    if (errors.length > 0) {
      errors.forEach(({ error, name }) => {
        console.error(`Error fetching ${name}:`, error);
        toast({
          title: `Failed to load ${name}`,
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
      });
    }
  }, [categoriesError, productsError, attributesError, toast]);
  
  // Update URL with filters
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (sortBy !== 'default') params.set('sort', sortBy);
    if (selectedCategory) params.set('category', selectedCategory);
    if (ratingFilter) params.set('rating', ratingFilter);
    if (searchQuery) params.set('q', searchQuery);
    if (filters.onSale) params.set('on_sale', 'true');
    if (filters.freeShipping) params.set('free_shipping', 'true');
    if (filters.newArrivals) params.set('new_arrivals', 'true');
    if (page > 1) params.set('page', page.toString());
    
    // Add attribute filters to URL
    if (attributeFilters.length > 0) {
      params.set('attributeFilters', JSON.stringify(attributeFilters));
    }
    
    const queryString = params.toString();
    const newLocation = queryString ? `/products?${queryString}` : '/products';
    
    // Only update if location changed to avoid infinite loop
    if (location !== newLocation) {
      setLocation(newLocation, { replace: true });
    }
    
    // Calculate active filters for showing badges
    const newActiveFilters: string[] = [];
    if (selectedCategory) {
      const category = categories?.find(c => c.id.toString() === selectedCategory);
      if (category) newActiveFilters.push(`Category: ${category.name}`);
    }
    if (filters.onSale) newActiveFilters.push('On Sale');
    if (filters.freeShipping) newActiveFilters.push('Free Shipping');
    if (filters.newArrivals) newActiveFilters.push('New Arrivals');
    if (ratingFilter) {
      const ratingOption = ratingOptions.find(o => o.value === ratingFilter);
      if (ratingOption) newActiveFilters.push(ratingOption.label);
    }
    if (priceRange[0] > 0 || priceRange[1] < 5000) {
      newActiveFilters.push(`Price: ${formatCurrency(priceRange[0])} - ${formatCurrency(priceRange[1])}`);
    }
    
    setActiveFilters(newActiveFilters);
  }, [sortBy, selectedCategory, ratingFilter, searchQuery, filters, page, priceRange, categories, location, setLocation]);
  
  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };
  
  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1); // Reset to first page when sort changes
  };
  
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setPage(1);
  };
  
  const handleRatingFilterChange = (value: string) => {
    setRatingFilter(value);
    setPage(1);
  };
  
  const handleFilterChange = (key: keyof typeof filters, value: boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };
  
  const handlePriceChange = (values: number[]) => {
    setPriceRange(values);
    setPage(1);
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  // Handle category filtering with hierarchical support
  const handleCategoryFilter = (categoryId: number | null, includeChildren: boolean = false) => {
    setSelectedCategoryId(categoryId);
    
    // Update URL parameters
    const newSearchParams = new URLSearchParams(searchParams);
    if (categoryId) {
      newSearchParams.set('categoryId', categoryId.toString());
      if (includeChildren) {
        newSearchParams.set('includeChildren', 'true');
      } else {
        newSearchParams.delete('includeChildren');
      }
    } else {
      newSearchParams.delete('categoryId');
      newSearchParams.delete('includeChildren');
    }
    setLocation(`/products?${newSearchParams.toString()}`);
  };
  
  // Handle attribute filter changes
  const handleAttributeFilterChange = (attributeId: number, attributeName: string, optionValue: string, isChecked: boolean) => {
    setAttributeFilters(prevFilters => {
      // Find existing filter for this attribute
      const existingFilterIndex = prevFilters.findIndex(f => f.attributeId === attributeId);
      
      if (existingFilterIndex >= 0) {
        const existingFilter = prevFilters[existingFilterIndex];
        let updatedSelectedOptions = [...existingFilter.selectedOptions];
        
        if (isChecked) {
          // Add option if it's not already selected
          if (!updatedSelectedOptions.includes(optionValue)) {
            updatedSelectedOptions.push(optionValue);
          }
        } else {
          // Remove option
          updatedSelectedOptions = updatedSelectedOptions.filter(opt => opt !== optionValue);
        }
        
        // If no options selected, remove the filter entirely
        if (updatedSelectedOptions.length === 0) {
          return prevFilters.filter(f => f.attributeId !== attributeId);
        }
        
        // Update the filter with new selected options
        const updatedFilter = {
          ...existingFilter,
          selectedOptions: updatedSelectedOptions
        };
        
        return [
          ...prevFilters.slice(0, existingFilterIndex),
          updatedFilter,
          ...prevFilters.slice(existingFilterIndex + 1)
        ];
      } else {
        // Create new filter
        return [
          ...prevFilters,
          {
            attributeId,
            attributeName,
            selectedOptions: [optionValue]
          }
        ];
      }
    });
    
    setPage(1);
  };
  
  // Check if an attribute option is selected
  const isAttributeOptionSelected = (attributeId: number, optionValue: string): boolean => {
    const attributeFilter = attributeFilters.find(f => f.attributeId === attributeId);
    if (!attributeFilter) return false;
    return attributeFilter.selectedOptions.includes(optionValue);
  };
  
  const removeFilter = (filter: string) => {
    if (filter.startsWith('Category:')) {
      setSelectedCategory(null);
    } else if (filter === 'On Sale') {
      setFilters(prev => ({ ...prev, onSale: false }));
    } else if (filter === 'Free Shipping') {
      setFilters(prev => ({ ...prev, freeShipping: false }));
    } else if (filter === 'New Arrivals') {
      setFilters(prev => ({ ...prev, newArrivals: false }));
    } else if (ratingOptions.some(o => o.label === filter)) {
      setRatingFilter('');
    } else if (filter.startsWith('Price:')) {
      setPriceRange([0, 5000]);
    } else if (filter.includes(':')) {
      // Handle attribute filters
      const [attributeName, optionValue] = filter.split(': ');
      const attributeFilter = attributeFilters.find(f => f.attributeName === attributeName);
      
      if (attributeFilter) {
        const updatedOptions = attributeFilter.selectedOptions.filter(opt => opt !== optionValue);
        
        if (updatedOptions.length === 0) {
          // Remove the entire filter if no options left
          setAttributeFilters(prevFilters => prevFilters.filter(f => f.attributeId !== attributeFilter.attributeId));
        } else {
          // Update the filter with remaining options
          setAttributeFilters(prevFilters => 
            prevFilters.map(f => 
              f.attributeId === attributeFilter.attributeId 
                ? { ...f, selectedOptions: updatedOptions } 
                : f
            )
          );
        }
      }
    }
  };
  
  const clearAllFilters = () => {
    setSelectedCategory(null);
    setRatingFilter('');
    setPriceRange([0, 5000]);
    setFilters({
      onSale: false,
      freeShipping: false,
      newArrivals: false
    });
    setAttributeFilters([]);
    setSearchQuery('');
    setSortBy('default');
    setPage(1);
  };
  
  // Remove the problematic attribute values query that was causing API errors
  
  // Update active filters to include attribute filters
  useEffect(() => {
    if (!attributeFilters.length) return;
    
    const newActiveFilters = [...activeFilters];
    
    // Add attribute filters to active filters
    attributeFilters.forEach(filter => {
      filter.selectedOptions.forEach(option => {
        const filterLabel = `${filter.attributeName}: ${option}`;
        if (!newActiveFilters.includes(filterLabel)) {
          newActiveFilters.push(filterLabel);
        }
      });
    });
    
    setActiveFilters(newActiveFilters);
  }, [attributeFilters]);
  
  // Get all child category IDs for hierarchical filtering
  const getAllChildCategoryIds = (parentCategoryId: number, categoriesWithChildren: any[]): number[] => {
    const categoryItem = categoriesWithChildren.find(item => item.category?.id === parentCategoryId);
    if (!categoryItem) return [parentCategoryId];
    
    let allIds = [parentCategoryId];
    if (categoryItem.children && categoryItem.children.length > 0) {
      categoryItem.children.forEach((child: any) => {
        allIds.push(child.id);
        // Recursively get children of children if needed
        const childIds = getAllChildCategoryIds(child.id, categoriesWithChildren);
        allIds = allIds.concat(childIds.filter(id => !allIds.includes(id)));
      });
    }
    return allIds;
  };

  // Apply filters and sorting to products
  const filteredProducts = products ? products
    .filter(product => {
      // Apply category filter with hierarchical support
      if (selectedCategoryId) {
        const urlParams = new URLSearchParams(window.location.search);
        const includeChildren = urlParams.get('includeChildren') === 'true';
        
        if (includeChildren) {
          // Get all child category IDs using the fetched categories data
          const allowedCategoryIds = getAllChildCategoryIds(selectedCategoryId, categoriesWithChildren);
          
          if (!product.categoryId || !allowedCategoryIds.includes(product.categoryId)) return false;
        } else {
          // Exact category match
          if (product.categoryId !== selectedCategoryId) return false;
        }
      }
      
      // Legacy category filter support (string-based)
      if (selectedCategory && (!product.categoryId || product.categoryId.toString() !== selectedCategory)) return false;
      
      // Apply price filter
      const price = product.salePrice || product.price;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      
      // Apply sale filter
      if (filters.onSale && !product.salePrice) return false;
      
      // All products are available to order from our suppliers
      
      // Apply rating filter
      if (ratingFilter === '4_and_up' && (product.rating || 0) < 4) return false;
      if (ratingFilter === '3_and_up' && (product.rating || 0) < 3) return false;
      if (ratingFilter === '2_and_up' && (product.rating || 0) < 2) return false;
      if (ratingFilter === '1_and_up' && (product.rating || 0) < 1) return false;
      
      // Apply free shipping filter
      if (filters.freeShipping && product.freeShipping !== true) return false;
      
      // Apply new arrivals filter
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (filters.newArrivals && new Date(product.createdAt) < thirtyDaysAgo) return false;
      
      // Apply search query
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // Apply attribute filters
      if (attributeFilters.length > 0) {
        // For each attribute filter, check if the product matches
        for (const filter of attributeFilters) {
          // Check if the product has the required attribute values
          // We need to check the product's actual attribute data from the API
          // For now, we'll show products when attributes are filtered but implement proper filtering later
          // This requires connecting to the product attribute API endpoints
          
          // TODO: Implement proper product-attribute filtering by fetching product attributes
          // For now, return true to show all products when filtering is applied
          continue;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      // Apply sorting
      const priceA = a.salePrice || a.price;
      const priceB = b.salePrice || b.price;
      
      switch (sortBy) {
        case 'price-asc':
          return priceA - priceB;
        case 'price-desc':
          return priceB - priceA;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'popularity':
          return (b.reviewCount || 0) - (a.reviewCount || 0);
        default:
          return 0;
      }
    }) : [];
    
  return (
    <>
      <Helmet>
        <title>Shop All Products - TEE ME YOU</title>
        <meta 
          name="description" 
          content="Discover our wide range of products from local South African suppliers at unbeatable prices. Browse through our collections and find the perfect item for you."
        />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            All Products
          </h1>
          <p className="mt-2 text-gray-600">
            Browse our collection of products from local South African suppliers
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="mb-6">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search products..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" className="bg-[#FF69B4] hover:bg-[#FF1493] text-white">
              Search
            </Button>
          </form>
        </div>
        
        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">Active Filters:</span>
              {activeFilters.map((filter) => (
                <Badge 
                  key={filter}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {filter}
                  <button 
                    onClick={() => removeFilter(filter)}
                    className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-[#FF69B4] hover:text-[#FF1493] hover:bg-pink-50"
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
        
        {/* Filter Toggle & Sort (Mobile View) */}
        <div className="flex justify-between items-center mb-4 md:hidden">
          <Button 
            variant="outline" 
            size="sm"
            onClick={toggleFilter}
            className="flex items-center"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="name-asc">Name: A to Z</SelectItem>
              <SelectItem value="name-desc">Name: Z to A</SelectItem>
              <SelectItem value="rating-desc">Highest Rated</SelectItem>
              <SelectItem value="newest">Newest Arrivals</SelectItem>
              <SelectItem value="popularity">Popularity</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters Sidebar */}
          <div 
            className={`${
              isFilterOpen ? 'fixed inset-0 z-40 bg-white p-4 overflow-y-auto' : 'hidden'
            } md:relative md:block md:w-64 md:flex-shrink-0`}
          >
            {isFilterOpen && (
              <div className="flex justify-between items-center mb-4 md:hidden">
                <h2 className="text-lg font-medium">Filters</h2>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={toggleFilter}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}
            
            <div className="hidden md:flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Filters</h2>
              <SlidersHorizontal className="h-5 w-5 text-gray-500" />
            </div>
            
            {/* Category Sidebar Component */}
            <div className="mb-6">
              <CategorySidebar
                isFilterMode={true}
                selectedCategoryId={selectedCategoryId}
                onCategoryFilter={handleCategoryFilter}
                onCategorySelect={() => {
                  // Close mobile filter when category is selected
                  if (isFilterOpen) {
                    toggleFilter();
                  }
                }}
                className="border-0 shadow-none"
              />
            </div>
            
            <Accordion type="multiple" defaultValue={['price', 'availability', 'rating', 'attributes', 'more']}>
              
              <AccordionItem value="price">
                <AccordionTrigger>Price Range</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <Slider
                      value={priceRange}
                      min={0}
                      max={5000}
                      step={100}
                      onValueChange={handlePriceChange}
                    />
                    <div className="flex justify-between">
                      <span className="text-sm">{formatCurrency(priceRange[0])}</span>
                      <span className="text-sm">{formatCurrency(priceRange[1])}</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="availability">
                <AccordionTrigger>Availability</AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm text-gray-600 italic">
                    All products are available to order from our local suppliers.
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="rating">
                <AccordionTrigger>Product Rating</AccordionTrigger>
                <AccordionContent>
                  <RadioGroup 
                    value={ratingFilter} 
                    onValueChange={handleRatingFilterChange}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem id="rating-all" value="" />
                      <label htmlFor="rating-all" className="text-sm">All Ratings</label>
                    </div>
                    
                    {ratingOptions.map(option => (
                      <div key={option.value} className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem id={`rating-${option.value}`} value={option.value} />
                        <label 
                          htmlFor={`rating-${option.value}`} 
                          className="text-sm flex items-center"
                        >
                          {option.label.includes('4') && (
                            <div className="flex mr-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <Star className="h-3 w-3 text-gray-300" />
                            </div>
                          )}
                          {option.label.includes('3') && (
                            <div className="flex mr-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <Star className="h-3 w-3 text-gray-300" />
                              <Star className="h-3 w-3 text-gray-300" />
                            </div>
                          )}
                          {option.label.includes('2') && (
                            <div className="flex mr-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <Star className="h-3 w-3 text-gray-300" />
                              <Star className="h-3 w-3 text-gray-300" />
                              <Star className="h-3 w-3 text-gray-300" />
                            </div>
                          )}
                          {option.label.includes('1') && (
                            <div className="flex mr-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <Star className="h-3 w-3 text-gray-300" />
                              <Star className="h-3 w-3 text-gray-300" />
                              <Star className="h-3 w-3 text-gray-300" />
                              <Star className="h-3 w-3 text-gray-300" />
                            </div>
                          )}
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </AccordionContent>
              </AccordionItem>
              
              {/* Product Attributes - Hierarchical Structure */}
              {filterableAttributes && filterableAttributes.length > 0 && (
                <AccordionItem value="attributes">
                  <AccordionTrigger>Product Attributes</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {filterableAttributes.map(attribute => (
                        <Accordion key={attribute.id} type="single" collapsible className="border rounded-lg">
                          <AccordionItem value={`attribute-${attribute.id}`} className="border-none">
                            <AccordionTrigger className="px-3 py-2 text-sm font-medium hover:no-underline">
                              <div className="flex items-center justify-between w-full">
                                <span>{getAttributeDisplayName(attribute)}</span>
                                {/* Show count of selected options */}
                                {(() => {
                                  const selectedCount = attribute.options.filter(option => 
                                    isAttributeOptionSelected(attribute.id, option.value)
                                  ).length;
                                  return selectedCount > 0 ? (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      {selectedCount} selected
                                    </Badge>
                                  ) : null;
                                })()}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-3 pb-3">
                              <div className="space-y-2">
                                {attribute.options.map(option => (
                                  <div key={option.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                      id={`attr-${attribute.id}-${option.id}`}
                                      checked={isAttributeOptionSelected(attribute.id, option.value)}
                                      onCheckedChange={(checked) => handleAttributeFilterChange(
                                        attribute.id,
                                        getAttributeDisplayName(attribute),
                                        option.value,
                                        checked as boolean
                                      )}
                                    />
                                    <label 
                                      htmlFor={`attr-${attribute.id}-${option.id}`} 
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      {option.value}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              <AccordionItem value="more">
                <AccordionTrigger>More Filters</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="onSale" 
                        checked={filters.onSale}
                        onCheckedChange={checked => 
                          handleFilterChange('onSale', checked as boolean)
                        }
                      />
                      <label 
                        htmlFor="onSale"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        On Sale
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="freeShipping" 
                        checked={filters.freeShipping}
                        onCheckedChange={checked => 
                          handleFilterChange('freeShipping', checked as boolean)
                        }
                      />
                      <label 
                        htmlFor="freeShipping"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Free Shipping
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="newArrivals" 
                        checked={filters.newArrivals}
                        onCheckedChange={checked => 
                          handleFilterChange('newArrivals', checked as boolean)
                        }
                      />
                      <label 
                        htmlFor="newArrivals"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        New Arrivals (Last 30 days)
                      </label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            {isFilterOpen && (
              <div className="mt-6 md:hidden">
                <Button 
                  className="w-full bg-[#FF69B4] hover:bg-[#FF1493] text-white"
                  onClick={toggleFilter}
                >
                  Apply Filters
                </Button>
              </div>
            )}
          </div>
          
          {/* Products Grid */}
          <div className="flex-1">
            {/* Sort and View Options (Desktop) */}
            <div className="hidden md:flex justify-between items-center mb-4">
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
                <span className="text-sm text-gray-500 ml-2">
                  Showing {filteredProducts.length} of {products?.length || 0} products
                </span>
              </div>
              
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="name-asc">Name: A to Z</SelectItem>
                  <SelectItem value="name-desc">Name: Z to A</SelectItem>
                  <SelectItem value="rating-desc">Highest Rated</SelectItem>
                  <SelectItem value="newest">Newest Arrivals</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {isLoadingProducts ? (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  : "space-y-4"
              }>
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                    <div className="h-48 bg-gray-200"></div>
                    <div className="p-3">
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-full mt-2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredProducts.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        showAddToCart={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredProducts.map(product => (
                      <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="flex flex-col sm:flex-row">
                          <div className="w-full sm:w-1/4">
                            <Link href={`/product/${product.slug}`} className="block">
                              <img 
                                src={product.imageUrl || ''} 
                                alt={product.name} 
                                className="w-full h-56 sm:h-full object-cover"
                              />
                            </Link>
                          </div>
                          <div className="w-full sm:w-3/4 p-4 flex flex-col justify-between">
                            <div>
                              <Link href={`/product/${product.slug}`} className="block">
                                <h3 className="text-lg font-medium text-gray-800 hover:text-[#FF69B4] mb-2">
                                  {product.name}
                                </h3>
                              </Link>
                              <div className="flex items-center mb-2">
                                <div className="flex text-yellow-400 mr-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`h-4 w-4 ${i < Math.floor(product.rating || 0) ? 'fill-yellow-400' : ''}`} 
                                    />
                                  ))}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {product.rating?.toFixed(1)} ({product.reviewCount || 0})
                                </span>
                              </div>
                              <p className="text-gray-600 mb-4 line-clamp-2">
                                {product.description || 'No description available'}
                              </p>
                              {product.freeShipping && (
                                <Badge variant="outline" className="mb-2 bg-green-50 text-green-600 border-green-200">
                                  Free Shipping
                                </Badge>
                              )}
                            </div>
                            <div className="flex justify-between items-end">
                              <div>
                                <div className="flex items-baseline">
                                  <span className="text-xl text-[#FF69B4] font-bold">
                                    {formatCurrency(product.salePrice || product.price)}
                                  </span>
                                  {product.salePrice && (
                                    <span className="ml-2 text-gray-500 text-sm line-through">
                                      {formatCurrency(product.price)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  Available from our suppliers
                                </div>
                              </div>
                              <Button 
                                className="bg-[#FF69B4] hover:bg-[#FF1493] text-white"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  addItem({
                                    productId: product.id,
                                    product,
                                    quantity: 1
                                  });
                                  toast({
                                    title: "Added to cart",
                                    description: `${product.name} has been added to your cart.`,
                                    duration: 2000,
                                  });
                                }}
                              >
                                Add to Cart
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Pagination */}
                <div className="flex justify-center mt-8">
                  <Button 
                    variant="outline"
                    className="border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white mr-2"
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center mx-4 text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button 
                    variant="outline"
                    className="border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white"
                    disabled={page >= totalPages}
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <h3 className="text-lg font-medium mb-2">No products found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters or browse other categories.
                </p>
                <Button asChild>
                  <Link href="/">Continue Shopping</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductListing;