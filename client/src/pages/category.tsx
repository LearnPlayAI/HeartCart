import React, { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { useProductListingScroll } from '@/hooks/use-scroll-management';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { Filter, SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '@/components/product/product-card';
import { CategorySidebar } from '@/components/ui/category-sidebar';
import { CategorySidebarDrawer } from '@/components/ui/category-sidebar-drawer';
import type { Product, Category, CategoryAttribute, CategoryAttributeOption } from '@shared/schema';

const CategoryPage = () => {
  const [match, params] = useRoute('/category/:slug');
  useProductListingScroll();
  const slug = params?.slug;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [filters, setFilters] = useState({
    onSale: false,
    freeShipping: false,
  });
  
  // State for attribute filters
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string[]>>({});
  
  const { data: categoryResponse, isLoading: isLoadingCategory } = useQuery({
    queryKey: [`/api/categories/${slug}`],
    enabled: !!slug,
  });
  
  // Extract the category from the standardized response
  const category = categoryResponse?.success ? categoryResponse.data : null;
  
  // Log for debugging
  useEffect(() => {
    if (categoryResponse) {
      console.log("Category response:", categoryResponse);
    }
  }, [categoryResponse]);
  
  const { data: productsResponse, isLoading: isLoadingProducts } = useQuery({
    queryKey: [`/api/products/category/${category?.id}`],
    enabled: !!category?.id,
    staleTime: 0, // Always fetch fresh data to prevent inactive products from showing
    gcTime: 0, // Don't keep in cache when component unmounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });
  
  // Extract the products from the standardized response
  const products = productsResponse?.success ? productsResponse.data || [] : [];
  
  // Log for debugging
  useEffect(() => {
    if (productsResponse) {
      console.log("Category products response:", productsResponse);
      console.log("Products extracted:", products);
    }
  }, [productsResponse, products]);
  
  // Fetch all categories for the sidebar
  const { data: categoriesResponse } = useQuery({
    queryKey: ['/api/categories'],
  });
  
  const categories = categoriesResponse?.success ? categoriesResponse.data : [];
  
  // Fetch category attributes for filtering
  const { data: categoryAttributesResponse } = useQuery({
    queryKey: [`/api/categories/${category?.id}/attributes`],
    enabled: !!category?.id,
  });
  
  const categoryAttributes = categoryAttributesResponse?.success ? 
    (Array.isArray(categoryAttributesResponse.data) ? categoryAttributesResponse.data : []) : [];
  
  // State to store attribute options
  const [attributeOptions, setAttributeOptions] = useState<Record<number, CategoryAttributeOption[]>>({});
  
  // Fetch options for each attribute
  useEffect(() => {
    if (!categoryAttributes || !categoryAttributes.length) return;
    
    const fetchOptions = async () => {
      const options: Record<number, CategoryAttributeOption[]> = {};
      
      for (const attribute of categoryAttributes) {
        try {
          const response = await fetch(`/api/category-attributes/${attribute.id}/options`);
          const responseData = await response.json();
          
          // Check if response follows the standard API format with success and data properties
          if (responseData && responseData.success) {
            options[attribute.id] = responseData.data || [];
          } else if (Array.isArray(responseData)) {
            // Fallback for older API format
            options[attribute.id] = responseData;
          } else {
            options[attribute.id] = [];
          }
          
          console.log(`Attribute ${attribute.id} options:`, options[attribute.id]);
        } catch (error) {
          console.error(`Error fetching options for attribute ${attribute.id}:`, error);
          options[attribute.id] = [];
        }
      }
      
      setAttributeOptions(options);
    };
    
    fetchOptions();
  }, [categoryAttributes]);
  
  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };
  
  const handleSortChange = (value: string) => {
    setSortBy(value);
  };
  
  const handleFilterChange = (key: string, value: boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handlePriceChange = (values: number[]) => {
    setPriceRange(values);
  };
  
  // Handle attribute filter selection
  const handleAttributeFilterChange = (attributeName: string, optionValue: string) => {
    setAttributeFilters(prev => {
      const currentValues = prev[attributeName] || [];
      
      // If already selected, remove it; otherwise add it
      if (currentValues.includes(optionValue)) {
        return {
          ...prev,
          [attributeName]: currentValues.filter(v => v !== optionValue)
        };
      } else {
        return {
          ...prev,
          [attributeName]: [...currentValues, optionValue]
        };
      }
    });
  };
  
  // Check if an attribute option is selected
  const isAttributeOptionSelected = (attributeName: string, optionValue: string): boolean => {
    return (attributeFilters[attributeName] || []).includes(optionValue);
  };
  
  // Query for product attributes to enable attribute filtering
  const { data: productAttributes } = useQuery<{ productId: number, attributes: Record<string, string[]> }[]>({
    queryKey: [`/api/products/attributes-for-category/${category?.id}`],
    enabled: !!category?.id && Object.keys(attributeFilters).length > 0,
  });
  
  // Apply filters and sorting to products
  const filteredProducts = products ? products
    .filter(product => {
      // Apply price filter
      const price = product.salePrice || product.price;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      
      // Apply sale filter
      if (filters.onSale && !product.salePrice) return false;
      
      // Apply attribute filters
      if (Object.keys(attributeFilters).length > 0 && productAttributes) {
        // Find attributes for this product
        const productAttrData = productAttributes.find(pa => pa.productId === product.id);
        
        // If product has no attribute data but we have filters, exclude it
        if (!productAttrData) return false;
        
        // Check each attribute filter
        for (const [attrName, selectedValues] of Object.entries(attributeFilters)) {
          // Skip if no values selected for this attribute
          if (selectedValues.length === 0) continue;
          
          // Get values for this attribute on this product
          const productValues = productAttrData.attributes[attrName] || [];
          
          // Product should have at least one of the selected values
          const hasMatchingValue = selectedValues.some(val => productValues.includes(val));
          if (!hasMatchingValue) return false;
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
        default:
          return 0;
      }
    }) : [];
  
  return (
    <>
      <Helmet>
        <title>{category?.name || 'Category'} - TEE ME YOU</title>
        <meta name="description" content={`Shop ${category?.name || 'our products'} from local South African suppliers at unbeatable prices.`} />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        {/* Category Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {isLoadingCategory ? 'Loading...' : category?.name || 'All Products'}
          </h1>
          {category?.description && (
            <p className="mt-2 text-gray-600">{category.description}</p>
          )}
        </div>
        
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
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters Sidebar */}
          <div 
            className={`${
              isFilterOpen ? 'fixed inset-0 z-40 bg-white p-4 overflow-y-auto' : 'hidden'
            } md:relative md:block md:w-64 md:flex-shrink-0 md:max-h-[calc(100vh-8rem)] md:overflow-visible`}
          >
            {isFilterOpen && (
              <>
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
                <div className="block md:hidden mb-4">
                  <CategorySidebarDrawer onCategorySelect={toggleFilter} />
                </div>
              </>
            )}
            
            {/* Desktop Category Sidebar */}
            <div className="hidden md:block mb-6 max-h-64 overflow-hidden">
              <CategorySidebar className="border rounded-md shadow-sm h-full" />
            </div>
            
            <div className="hidden md:flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Filters</h2>
              <SlidersHorizontal className="h-5 w-5 text-gray-500" />
            </div>
            
            <Accordion type="multiple" defaultValue={['price', 'filters']}>
              
              <AccordionItem value="price">
                <AccordionTrigger>Price Range</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <Slider
                      value={priceRange}
                      min={0}
                      max={2000}
                      step={10}
                      onValueChange={handlePriceChange}
                    />
                    <div className="flex justify-between">
                      <span>R{priceRange[0]}</span>
                      <span>R{priceRange[1]}</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Dynamic Attribute Filters */}
              {categoryAttributes?.map(attribute => (
                <AccordionItem key={attribute.id} value={`attribute-${attribute.id}`}>
                  <AccordionTrigger>{attribute.displayName}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {attributeOptions[attribute.id]?.map((option: CategoryAttributeOption) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`attr-${attribute.id}-${option.id}`}
                            checked={isAttributeOptionSelected(attribute.name, option.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleAttributeFilterChange(attribute.name, option.value);
                              } else {
                                handleAttributeFilterChange(attribute.name, option.value);
                              }
                            }}
                          />
                          <label
                            htmlFor={`attr-${attribute.id}-${option.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {option.displayValue}
                          </label>
                        </div>
                      ))}
                      {attributeOptions[attribute.id]?.length === 0 && (
                        <div className="text-sm text-gray-500">No options available</div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
              
              <AccordionItem value="filters">
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
            {/* Sort (Desktop View) */}
            <div className="hidden md:flex justify-end mb-4">
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
                </SelectContent>
              </Select>
            </div>
            
            {isLoadingProducts ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <h3 className="text-lg font-medium mb-2">No products found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters or browse other categories.
                </p>
                <Button asChild>
                  <Link href="/">
                    Continue Shopping
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CategoryPage;
