import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';

import { StandardApiResponse } from '@/types/api';
import { useProductListingScroll, useScrollRestoration, ScrollManager, saveProductClickState } from '@/hooks/use-scroll-management';
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
import QuickViewModal from '@/components/product/quick-view-modal';
import type { Product, Category } from '@shared/schema';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import type { Attribute, AttributeOption, CategoryAttribute } from '@/types/attribute-types';
import { 
  calculateProductPricing, 
  getCartPrice, 
  isPromotionActive, 
  getPromotionTimeRemaining,
  type PromotionInfo 
} from '@/utils/pricing';

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
const getAttributeDisplayName = (attribute: Attribute | CategoryAttribute): string => {
  if ('overrideDisplayName' in attribute && attribute.overrideDisplayName) {
    return attribute.overrideDisplayName;
  }
  return attribute.attribute?.displayName || '';
};

const ProductListing = () => {
  const [location, setLocation] = useLocation();
  
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const { addItem } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useProductListingScroll();
  
  // State for filters
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'default');
  
  // Quick view modal state
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Removed disclaimer modal state - disclaimer now shown during checkout process only
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    return searchParams.get('category');
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(() => {
    const categoryIdParam = new URLSearchParams(window.location.search).get('categoryId');
    return categoryIdParam ? parseInt(categoryIdParam) : null;
  });
  
  // Update state when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryIdParam = urlParams.get('categoryId');
    const newCategoryId = categoryIdParam ? parseInt(categoryIdParam) : null;
    
    if (selectedCategoryId !== newCategoryId) {
      setSelectedCategoryId(newCategoryId);
    }
  }, [location]);
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(searchParams.get('rating') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilter[]>([]);
  const [filters, setFilters] = useState({
    onPromotion: searchParams.get('onPromotion') === 'true',
    featuredProducts: searchParams.get('featuredProducts') === 'true',
    newArrivals: searchParams.get('newArrivals') === 'true'
  });
  
  // Pagination - Initialize from URL or saved scroll state
  const [page, setPage] = useState(() => {
    const scrollManager = ScrollManager.getInstance();
    const savedState = scrollManager.getProductListingState();
    if (savedState && savedState.page > 1) {
      const savedCategoryId = savedState.categoryId || 'null';
      const currentCategoryId = new URLSearchParams(window.location.search).get('categoryId') || 'null';
      if (savedCategoryId === currentCategoryId) {
        return savedState.page;
      }
    }
    return parseInt(searchParams.get('page') || '1');
  });
  const limit = 20;
  
  useProductListingScroll();
  
  // Fetch categories
  const { 
    data: categoriesResponse, 
    error: categoriesError 
  } = useQuery<StandardApiResponse<Category[]>>({
    queryKey: ['/api/categories'],
  });
  const categories = categoriesResponse?.success ? categoriesResponse.data : [];
  
  // Helper function to map sortBy values to API parameters
  const getSortParams = (sortBy: string) => {
    switch (sortBy) {
      case 'price-asc':
        return { sortField: 'price', sortOrder: 'asc' };
      case 'price-desc':
        return { sortField: 'price', sortOrder: 'desc' };
      case 'name-asc':
        return { sortField: 'name', sortOrder: 'asc' };
      case 'name-desc':
        return { sortField: 'name', sortOrder: 'desc' };
      case 'rating-desc':
        return { sortField: 'rating', sortOrder: 'desc' };
      case 'newest-arrivals':
        return { sortField: 'publishedAt', sortOrder: 'desc' };
      case 'popularity':
        return { sortField: 'popularity', sortOrder: 'desc' };
      default:
        return {};
    }
  };

  // Fetch products with proper search or filtering
  const { 
    data: productsResponse, 
    isLoading: isLoadingProducts,
    error: productsError
  } = useQuery<StandardApiResponse<Product[], { total?: number, totalPages?: number }>>({
    queryKey: searchQuery ? 
      ['/api/search', { query: searchQuery, page, limit, sortBy }] : 
      ['/api/products', { page, categoryId: selectedCategoryId, includeChildren: searchParams.get('includeChildren'), limit, sortBy, filters }],
    staleTime: 0, // Always fetch fresh data when category/page changes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const sortParams = getSortParams(sortBy);
      
      if (searchQuery) {
        const searchParamsObj = new URLSearchParams({
          q: searchQuery,
          limit: limit.toString(),
          offset: ((page - 1) * limit).toString()
        });
        
        // Add sorting parameters
        if (sortParams.sortField) {
          searchParamsObj.append('sortField', sortParams.sortField);
          searchParamsObj.append('sortOrder', sortParams.sortOrder);
        }
        
        const response = await fetch(`/api/search?${searchParamsObj}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      } else {
        const productParams = new URLSearchParams({
          limit: limit.toString(),
          offset: ((page - 1) * limit).toString()
        });
        
        if (selectedCategoryId) {
          productParams.append('categoryId', selectedCategoryId.toString());
        }
        if (searchParams.get('includeChildren') === 'true') {
          productParams.append('includeChildren', 'true');
        }
        
        // Add sorting parameters
        if (sortParams.sortField) {
          productParams.append('sortField', sortParams.sortField);
          productParams.append('sortOrder', sortParams.sortOrder);
        }
        
        // Add filter parameters based on active filters
        if (filters.onPromotion) {
          productParams.append('onPromotion', 'true');
        }
        if (filters.featuredProducts) {
          productParams.append('featuredProducts', 'true');
        }
        if (filters.newArrivals) {
          productParams.append('newArrivals', 'true');
        }
        
        console.log('Fetching products with params:', productParams.toString());
        console.log('selectedCategoryId:', selectedCategoryId);
        console.log('sortBy:', sortBy, 'sortParams:', sortParams);
        const response = await fetch(`/api/products?${productParams}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      }
    }
  });
  const products = productsResponse?.success ? productsResponse.data : [];
  const totalProducts = productsResponse?.meta?.total || products.length;
  const totalPages = Math.ceil(totalProducts / limit);
  
  useScrollRestoration(isLoadingProducts, products.length > 0);
  
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
  } = useQuery<StandardApiResponse<(CategoryAttribute & { options: AttributeOption[], attribute: Attribute })[]>>({
    queryKey: [selectedCategory ? 
      `/api/categories/${selectedCategory}/filterable-attributes` : 
      '/api/products/filterable-attributes'
    ],
    enabled: !!products,
  });
  const filterableAttributes = filterableAttributesResponse?.success ? filterableAttributesResponse.data : [];
  
  // Fetch active promotions for pricing calculations
  const { data: promotionsResponse } = useQuery<any>({
    queryKey: ['/api/promotions/active-with-products'],
    staleTime: 0, // No cache - always fetch fresh promotional data
    gcTime: 0, // Don't keep in cache when component unmounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });
  const activePromotions = promotionsResponse?.data || promotionsResponse || [];
  
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
    if (selectedCategoryId) params.set('categoryId', selectedCategoryId.toString());
    if (ratingFilter) params.set('rating', ratingFilter);
    if (searchQuery) params.set('q', searchQuery);
    if (filters.onPromotion) params.set('onPromotion', 'true');
    if (filters.featuredProducts) params.set('featuredProducts', 'true');
    if (filters.newArrivals) params.set('newArrivals', 'true');
    if (page > 1) params.set('page', page.toString());
    
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
    if (filters.onPromotion) newActiveFilters.push('On Promotion');
    if (filters.featuredProducts) newActiveFilters.push('Featured Products');
    if (filters.newArrivals) newActiveFilters.push('Just Arrived');
    if (ratingFilter) {
      const ratingOption = ratingOptions.find(o => o.value === ratingFilter);
      if (ratingOption) newActiveFilters.push(ratingOption.label);
    }
    if (priceRange[0] > 0 || priceRange[1] < 5000) {
      newActiveFilters.push(`Price: ${formatCurrency(priceRange[0])} - ${formatCurrency(priceRange[1])}`);
    }
    
    setActiveFilters(newActiveFilters);
  }, [sortBy, selectedCategory, selectedCategoryId, ratingFilter, searchQuery, filters, page, priceRange, categories, location, setLocation]);
  
  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };
  
  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1); // Reset to first page when sort changes
    // Invalidate products query to fetch fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
  };
  
  
  const handleRatingFilterChange = (value: string) => {
    setRatingFilter(value);
    setPage(1);
  };
  
  const handleFilterChange = (key: keyof typeof filters, value: boolean) => {
    // Special handling for "On Promotion" filter - redirect to promotions page
    if (key === 'onPromotion' && value) {
      setLocation('/promotions');
      return;
    }
    
    // Special handling for "Featured Products" filter - redirect to featured page
    if (key === 'featuredProducts' && value) {
      setLocation('/featured');
      return;
    }
    
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
    setPage(1); // Reset pagination when category changes
    
    // Invalidate products query to fetch fresh data for new category
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    
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
    // Remove page parameter when resetting to page 1
    newSearchParams.delete('page');
    setLocation(`/products?${newSearchParams.toString()}`);
  };

  // Removed handleAcceptDisclaimers function - disclaimer now shown during checkout process only
  
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
    } else if (filter === 'On Promotion') {
      setFilters(prev => ({ ...prev, onPromotion: false }));
    } else if (filter === 'Featured Products') {
      setFilters(prev => ({ ...prev, featuredProducts: false }));
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
      onPromotion: false,
      featuredProducts: false,
      newArrivals: false
    });
    setAttributeFilters([]);
    setSearchQuery('');
    setSortBy('default');
    setPage(1);
  };
  
  // Fetch product attribute values for filtering
  const { 
    data: productAttributeValuesResponse,
    error: attributeValuesError
  } = useQuery<StandardApiResponse<{
    productId: number;
    attributeId: number;
    optionId: number | null;
    textValue: string | null;
  }[]>>({
    queryKey: ['/api/products/attribute-values'],
    enabled: !!products && attributeFilters.length > 0,
  });
  const productAttributeValues = productAttributeValuesResponse?.success ? productAttributeValuesResponse.data : [];
  
  // Handle attribute values error
  useEffect(() => {
    if (attributeValuesError) {
      console.error('Error fetching product attribute values:', attributeValuesError);
      toast({
        title: "Failed to load product attributes",
        description: attributeValuesError instanceof Error ? attributeValuesError.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [attributeValuesError, toast]);
  
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

  // Server handles ALL filtering and sorting - no client-side filtering
  const filteredProducts = products || [];
    
  return (
    <>
      <Helmet>
        <title>Shop All Products - HeartCart</title>
        <meta 
          name="description" 
          content="Discover our wide range of products from local South African suppliers at unbeatable prices. Browse through our collections and find the perfect item for you."
        />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        
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
              isFilterOpen ? 'fixed inset-0 z-50 bg-white' : 'hidden'
            } md:relative md:block md:w-64 md:flex-shrink-0`}
          >
            <div className={`${
              isFilterOpen ? 'h-full overflow-y-auto p-4' : ''
            } md:overflow-visible md:p-0 md:h-auto`}
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
            <div className="mb-6 bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-[#FF69B4] to-[#FF1493] p-4">
                <h3 className="text-white text-lg font-bold">Categories</h3>
              </div>
              <div className="p-4 bg-[#ff68b32e]">
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
                  className="border-0 shadow-none p-0"
                />
              </div>
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
              

              
              <AccordionItem value="more">
                <AccordionTrigger>More Filters</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="onPromotion" 
                        checked={filters.onPromotion}
                        onCheckedChange={checked => 
                          handleFilterChange('onPromotion', checked as boolean)
                        }
                      />
                      <label 
                        htmlFor="onPromotion"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        On Promotion
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="featuredProducts" 
                        checked={filters.featuredProducts}
                        onCheckedChange={checked => 
                          handleFilterChange('featuredProducts', checked as boolean)
                        }
                      />
                      <label 
                        htmlFor="featuredProducts"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Featured Products
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
                        Just Arrived
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
                  Showing {filteredProducts.length} of {totalProducts} products
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
                  <SelectItem value="newest">Just Arrived</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Top Pagination */}
            {filteredProducts.length > 0 && (
              <div className="flex justify-center mb-6">
                <Button 
                  variant="outline"
                  className="border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white mr-2"
                  disabled={page === 1}
                  onClick={() => {
                    const newPage = Math.max(page - 1, 1);
                    
                    // Immediate scroll to top
                    window.scrollTo(0, 0);
                    
                    setPage(newPage);
                    // Invalidate query to fetch fresh data for new page
                    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                    // Update URL with all current parameters preserved
                    const newSearchParams = new URLSearchParams(searchParams);
                    if (newPage === 1) {
                      newSearchParams.delete('page');
                    } else {
                      newSearchParams.set('page', newPage.toString());
                    }
                    setLocation(`/products?${newSearchParams.toString()}`);
                    
                    // Additional scroll after a short delay to ensure it works
                    setTimeout(() => {
                      window.scrollTo(0, 0);
                    }, 100);
                  }}
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
                  onClick={() => {
                    const newPage = Math.min(page + 1, totalPages);
                    
                    // Immediate scroll to top
                    window.scrollTo(0, 0);
                    
                    setPage(newPage);
                    // Invalidate query to fetch fresh data for new page
                    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                    // Update URL with all current parameters preserved
                    const newSearchParams = new URLSearchParams(searchParams);
                    newSearchParams.set('page', newPage.toString());
                    setLocation(`/products?${newSearchParams.toString()}`);
                    
                    // Additional scroll after a short delay to ensure it works
                    setTimeout(() => {
                      window.scrollTo(0, 0);
                    }, 100);
                  }}
                >
                  Next
                </Button>
              </div>
            )}
            
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
                    {filteredProducts.map(product => {
                      // Find promotion for this product
                      const productPromotion = activePromotions
                        .flatMap((promo: any) => promo.products?.map((pp: any) => ({ ...pp, promotion: promo })) || [])
                        .find((pp: any) => pp.productId === product.id);

                      const promotionInfo = productPromotion ? {
                        promotionName: productPromotion.promotion.promotionName,
                        promotionDiscount: productPromotion.extraDiscountPercentage || productPromotion.discountOverride || productPromotion.promotion.discountValue,
                        promotionDiscountType: productPromotion.promotion.promotionType,
                        promotionEndDate: productPromotion.promotion.endDate,
                        promotionalPrice: productPromotion.promotionalPrice ? Number(productPromotion.promotionalPrice) : null
                      } : undefined;

                      return (
                        <ProductCard
                          key={product.id}
                          product={product}
                          showAddToCart={true}
                          promotionInfo={promotionInfo}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredProducts.map(product => (
                      <div key={product.id} data-product-id={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="flex flex-col sm:flex-row">
                          <div className="w-full sm:w-1/4">
                            <Link 
                              href={`/product/${product.slug}`} 
                              className="block"
                              onClick={() => {
                                saveProductClickState(product.id);
                              }}
                            >
                              <img 
                                src={product.imageUrl || ''} 
                                alt={product.name} 
                                className="w-full h-56 sm:h-full object-cover"
                              />
                            </Link>
                          </div>
                          <div className="w-full sm:w-3/4 p-4 flex flex-col justify-between">
                            <div>
                              <Link 
                                href={`/product/${product.slug}`} 
                                className="block"
                                onClick={() => {
                                  saveProductClickState(product.id);
                                }}
                              >
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
                                {(() => {
                                  // Find promotion for this product
                                  const productPromotion = activePromotions
                                    .flatMap((promo: any) => promo.products?.map((pp: any) => ({ ...pp, promotion: promo })) || [])
                                    .find((pp: any) => pp.productId === product.id);

                                  const promotionInfo = productPromotion ? {
                                    promotionName: productPromotion.promotion.promotionName,
                                    promotionDiscount: productPromotion.extraDiscountPercentage || productPromotion.discountOverride || productPromotion.promotion.discountValue,
                                    promotionDiscountType: productPromotion.promotion.promotionType,
                                    promotionEndDate: productPromotion.promotion.endDate,
                                    promotionalPrice: productPromotion.promotionalPrice ? Number(productPromotion.promotionalPrice) : null
                                  } : null;

                                  const pricingResult = calculateProductPricing(product.price, product.salePrice, promotionInfo || undefined);
                                  const cartPricing = getCartPrice(product.price, product.salePrice, promotionInfo || undefined);

                                  console.log(`List view pricing for product ${product.id}:`, {
                                    productName: product.name,
                                    basePrice: product.price,
                                    salePrice: product.salePrice,
                                    promotionInfo,
                                    pricingResult,
                                    cartPricing
                                  });

                                  return (
                                    <div className="flex items-baseline">
                                      <span className="text-xl text-[#FF69B4] font-bold">
                                        {formatCurrency(pricingResult.displayPrice)}
                                      </span>
                                      {pricingResult.hasDiscount && (
                                        <span className="ml-2 text-gray-500 text-sm line-through">
                                          {formatCurrency(pricingResult.originalPrice)}
                                        </span>
                                      )}
                                      {pricingResult.hasDiscount && (
                                        <Badge variant="secondary" className="ml-2 bg-red-100 text-red-600 text-xs">
                                          -{pricingResult.discountPercentage}%
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })()}
                                {(() => {
                                  // Show promotion info if available
                                  const productPromotion = activePromotions
                                    .flatMap((promo: any) => promo.products?.map((pp: any) => ({ ...pp, promotion: promo })) || [])
                                    .find((pp: any) => pp.productId === product.id);

                                  if (productPromotion) {
                                    return (
                                      <div className="text-xs text-[#FF69B4] mt-1 font-medium">
                                        🎉 {productPromotion.promotion.promotionName}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="text-sm text-gray-500 mt-1">
                                      Available from our suppliers
                                    </div>
                                  );
                                })()}
                              </div>
                              <Button 
                                className="bg-[#FF69B4] hover:bg-[#FF1493] text-white"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  try {
                                    // Check if product has required attributes by fetching attributes
                                    const attributesResponse = await fetch(`/api/product-attributes/product/${product.id}/attributes`);
                                    const attributesData = await attributesResponse.json();
                                    
                                    if (attributesData.success && attributesData.data.length > 0) {
                                      // Check if any attributes are required
                                      const hasRequiredAttributes = attributesData.data.some((attr: any) => attr.isRequired);
                                      
                                      if (hasRequiredAttributes) {
                                        // Open quick view modal instead of adding directly to cart
                                        setSelectedProduct(product);
                                        setQuickViewOpen(true);
                                        return;
                                      }
                                    }
                                    
                                    // If no required attributes, add item directly to cart
                                    // Calculate correct promotional price for cart
                                    const productPromotion = activePromotions
                                      .flatMap((promo: any) => promo.products?.map((pp: any) => ({ ...pp, promotion: promo })) || [])
                                      .find((pp: any) => pp.productId === product.id);

                                    const promotionInfo = productPromotion ? {
                                      promotionName: productPromotion.promotion.promotionName,
                                      promotionDiscount: productPromotion.extraDiscountPercentage || productPromotion.discountOverride || productPromotion.promotion.discountValue,
                                      promotionDiscountType: productPromotion.promotion.promotionType,
                                      promotionEndDate: productPromotion.promotion.endDate,
                                      promotionalPrice: productPromotion.promotionalPrice ? Number(productPromotion.promotionalPrice) : null
                                    } : null;

                                    const cartPricing = getCartPrice(product.price, product.salePrice, promotionInfo || undefined);
                                    
                                    // Add item directly to cart without disclaimer modal
                                    addItem({
                                      productId: product.id,
                                      quantity: 1,
                                      itemPrice: cartPricing,
                                      attributeSelections: {}
                                    });
                                  } catch (error) {
                                    console.error('Error checking product attributes:', error);
                                    // Fallback: add item directly to cart without disclaimer modal
                                    const fallbackCartPricing = getCartPrice(product.price, product.salePrice, undefined);
                                    addItem({
                                      productId: product.id,
                                      quantity: 1,
                                      itemPrice: fallbackCartPricing,
                                      attributeSelections: {}
                                    });
                                  }
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
                    onClick={() => {
                      const newPage = Math.max(page - 1, 1);
                      
                      // Immediate scroll to top
                      window.scrollTo(0, 0);
                      
                      setPage(newPage);
                      // Invalidate query to fetch fresh data for new page
                      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                      // Update URL with all current parameters preserved
                      const newSearchParams = new URLSearchParams(searchParams);
                      if (newPage === 1) {
                        newSearchParams.delete('page');
                      } else {
                        newSearchParams.set('page', newPage.toString());
                      }
                      setLocation(`/products?${newSearchParams.toString()}`);
                      
                      // Delayed scroll to ensure DOM updates
                      setTimeout(() => {
                        window.scrollTo(0, 0);
                      }, 100);
                    }}
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
                    onClick={() => {
                      const newPage = Math.min(page + 1, totalPages);
                      
                      // Immediate scroll to top
                      window.scrollTo(0, 0);
                      
                      setPage(newPage);
                      // Invalidate query to fetch fresh data for new page
                      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                      // Update URL with all current parameters preserved
                      const newSearchParams = new URLSearchParams(searchParams);
                      newSearchParams.set('page', newPage.toString());
                      setLocation(`/products?${newSearchParams.toString()}`);
                      
                      // Delayed scroll to ensure DOM updates
                      setTimeout(() => {
                        window.scrollTo(0, 0);
                      }, 100);
                    }}
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
      
      {/* Quick View Modal */}
      {selectedProduct && (
        <QuickViewModal
          open={quickViewOpen}
          onOpenChange={setQuickViewOpen}
          productId={selectedProduct.id}
        />
      )}

      {/* Disclaimers Modal removed - disclaimer now shown during checkout process only */}
    </>
  );
};

export default ProductListing;