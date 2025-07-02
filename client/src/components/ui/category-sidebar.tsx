import * as React from "react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@shared/schema";
import { ChevronRight, ChevronDown, Grid3X3, Folder, FolderOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CategorySidebarProps {
  className?: string;
  onCategorySelect?: () => void; // Optional callback when category is selected (useful for mobile)
  onCategoryFilter?: (categoryId: number | null, includeChildren?: boolean) => void; // Optional callback for filtering products
  selectedCategoryId?: number | null; // Currently selected category for filtering
  isFilterMode?: boolean; // Whether this sidebar is used for filtering (vs navigation)
}

export function CategorySidebar({ 
  className, 
  onCategorySelect, 
  onCategoryFilter, 
  selectedCategoryId, 
  isFilterMode = false 
}: CategorySidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});
  const [location] = useLocation();
  
  // Define the interface for the categories with children response
  interface CategoryWithChildren {
    category: Category;
    children: Category[];
  }
  
  // Define the standardized API response type
  interface ApiResponse {
    success: boolean;
    data: CategoryWithChildren[];
  }
  
  // Fetch main categories with their children using the new API endpoint
  const { data: response, isLoading, error, refetch } = useQuery<ApiResponse>({
    queryKey: ["/api/categories/main/with-children"],
  });
  
  // Extract the categories with children from the standardized response
  const categoriesWithChildren = response?.success ? response.data : [];
  
  // Log any errors that occur during data fetching
  React.useEffect(() => {
    if (error) {
      console.error("Error fetching categories:", error);
    }
  }, [error]);
  
  // Extract the category slug from the current URL if we're on a category page
  const categorySlug = location.startsWith("/category/") 
    ? location.replace("/category/", "") 
    : null;

  // Helper function to handle category selection
  const handleCategorySelect = (categoryId: number, hasChildren: boolean) => {
    if (isFilterMode && onCategoryFilter) {
      // In filter mode, call the filter callback with includeChildren=true for hierarchical filtering
      onCategoryFilter(categoryId, hasChildren);
    }
    
    // Call the general onCategorySelect callback if provided
    if (onCategorySelect) {
      onCategorySelect();
    }
  };

  // Helper function to handle "All Categories" selection
  const handleAllCategoriesSelect = () => {
    if (isFilterMode && onCategoryFilter) {
      onCategoryFilter(null, false); // Clear all filters
    }
    
    if (onCategorySelect) {
      onCategorySelect();
    }
  };
  
  // Handle category expansion toggle
  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  
  // Auto-expand the parent category of the current category
  useEffect(() => {
    if (categorySlug && categoriesWithChildren && categoriesWithChildren.length > 0) {
      // Find which parent category contains this slug in its children
      categoriesWithChildren.forEach((item) => {
        const childMatches = item.children.some(
          (child) => child.slug === categorySlug
        );
        
        if (childMatches) {
          setExpandedCategories(prev => ({
            ...prev,
            [item.category.id]: true
          }));
        }
      });
    }
  }, [categorySlug, categoriesWithChildren]);
  
  return (
    <div className={cn("h-full w-full max-w-xs flex flex-col bg-gradient-to-b from-white to-gray-50/30 border-r border-gray-200", className)}>
      {!isFilterMode && (
        <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0 bg-white shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-sm">
              <Grid3X3 className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-gray-900">Categories</h2>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 max-h-full">
        {isLoading ? (
          // Enhanced skeleton loaders with card styling
          <div className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 flex-1 rounded" />
                </div>
                {index % 2 === 0 && (
                  <div className="mt-2 pl-7 space-y-2">
                    <Skeleton className="h-3 w-4/5 rounded" />
                    <Skeleton className="h-3 w-3/5 rounded" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : error ? (
          // Enhanced error state with better styling
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-red-600 mb-3 text-sm font-medium">Failed to load categories</div>
              <button 
                className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-red-300 text-red-700 hover:bg-red-50 transition-colors shadow-sm"
                onClick={() => refetch()}
              >
                Retry
              </button>
            </div>
          </div>
        ) : !categoriesWithChildren || categoriesWithChildren.length === 0 ? (
          <div className="p-4">
            <div className="text-center py-8 bg-white rounded-lg border border-gray-100 shadow-sm">
              <Grid3X3 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <div className="text-sm text-gray-500">No categories found</div>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-1.5 h-full">
            {/* Enhanced All Categories option for both filter and navigation modes */}
            <div className="mb-3">
              {isFilterMode ? (
                <button
                  onClick={handleAllCategoriesSelect}
                  className={cn(
                    "w-full px-4 py-3 text-sm text-left rounded-lg transition-all duration-200 border shadow-sm",
                    selectedCategoryId === null
                      ? "font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 border-pink-500 shadow-pink-200"
                      : "bg-white border-gray-200 hover:bg-pink-50 hover:border-pink-300 hover:shadow-md"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    All Categories
                  </div>
                </button>
              ) : (
                <Link
                  href="/products"
                  onClick={onCategorySelect}
                  className={cn(
                    "block w-full px-4 py-3 text-sm text-left rounded-lg transition-all duration-200 border shadow-sm",
                    (location === "/products" || (location.startsWith("/products") && !location.includes("categoryId"))) || location === "/"
                      ? "font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 border-pink-500 shadow-pink-200"
                      : "bg-white border-gray-200 hover:bg-pink-50 hover:border-pink-300 hover:shadow-md"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    All Categories
                  </div>
                </Link>
              )}
            </div>
            
            <ul className="space-y-1.5">
              {categoriesWithChildren.map((item) => (
                <li key={item.category.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                  {/* Enhanced main category */}
                  <div className="flex items-center p-1">
                    <button
                      onClick={() => toggleCategory(item.category.id)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        item.children && item.children.length > 0
                          ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          : "invisible"
                      )}
                      aria-label={expandedCategories[item.category.id] ? "Collapse category" : "Expand category"}
                    >
                      {item.children && item.children.length > 0 ? (
                        expandedCategories[item.category.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )
                      ) : (
                        <span className="w-4" />
                      )}
                    </button>
                    
                    {/* Enhanced conditional rendering with icons */}
                    {isFilterMode ? (
                      <button
                        onClick={() => handleCategorySelect(item.category.id, item.children.length > 0)}
                        className={cn(
                          "flex-1 px-3 py-2.5 text-sm text-left rounded-lg transition-all duration-200",
                          selectedCategoryId === item.category.id
                            ? "font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600"
                            : "hover:bg-pink-50 hover:border-pink-200"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {expandedCategories[item.category.id] ? (
                            <FolderOpen className="h-4 w-4 text-pink-500" />
                          ) : (
                            <Folder className="h-4 w-4 text-gray-400" />
                          )}
                          {item.category.name}
                        </div>
                      </button>
                    ) : (
                      <Link
                        href={`/category/${item.category.slug}`}
                        onClick={onCategorySelect}
                        className={cn(
                          "flex-1 px-3 py-2.5 text-sm rounded-lg transition-all duration-200",
                          categorySlug === item.category.slug
                            ? "font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600"
                            : "hover:bg-pink-50 hover:border-pink-200"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {categorySlug === item.category.slug ? (
                            <FolderOpen className="h-4 w-4 text-white" />
                          ) : (
                            <Folder className="h-4 w-4 text-gray-400" />
                          )}
                          {item.category.name}
                        </div>
                      </Link>
                    )}
                  </div>
                  
                  {/* Enhanced subcategories with better visual hierarchy */}
                  {item.children && item.children.length > 0 && expandedCategories[item.category.id] && (
                    <div className="border-t border-gray-100 bg-gray-50/30">
                      <ul className="px-4 py-3 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.id}>
                            {/* Enhanced conditional rendering with improved styling */}
                            {isFilterMode ? (
                              <button
                                onClick={() => handleCategorySelect(child.id, false)}
                                className={cn(
                                  "w-full px-3 py-2 text-sm text-left rounded-lg transition-all duration-200 border",
                                  selectedCategoryId === child.id
                                    ? "font-medium text-white bg-gradient-to-r from-pink-400 to-pink-500 border-pink-400 shadow-sm"
                                    : "bg-white border-gray-200 hover:bg-pink-50 hover:border-pink-200 hover:shadow-sm"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    selectedCategoryId === child.id ? "bg-white" : "bg-pink-300"
                                  )} />
                                  {child.name}
                                </div>
                              </button>
                            ) : (
                              <Link
                                href={`/category/${child.slug}`}
                                onClick={onCategorySelect}
                                className={cn(
                                  "block px-3 py-2 text-sm rounded-lg transition-all duration-200 border",
                                  categorySlug === child.slug
                                    ? "font-medium text-white bg-gradient-to-r from-pink-400 to-pink-500 border-pink-400 shadow-sm"
                                    : "bg-white border-gray-200 hover:bg-pink-50 hover:border-pink-200 hover:shadow-sm"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    categorySlug === child.slug ? "bg-white" : "bg-pink-300"
                                  )} />
                                  {child.name}
                                </div>
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default CategorySidebar;