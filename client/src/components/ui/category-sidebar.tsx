import * as React from "react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@shared/schema";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CategorySidebarProps {
  className?: string;
  onCategorySelect?: () => void; // Optional callback when category is selected (useful for mobile)
}

export function CategorySidebar({ className, onCategorySelect }: CategorySidebarProps) {
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
  const { data: response, isLoading, error } = useQuery<ApiResponse>({
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
    <div className={cn("h-full w-full max-w-xs flex flex-col bg-white", className)}>
      <div className="px-3 py-2 border-b">
        <h2 className="font-semibold text-pink-600">Categories</h2>
      </div>
      
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          // Show skeleton loaders when loading
          <div className="p-3 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse space-y-2">
                <Skeleton className="h-6 w-full" />
                {index % 2 === 0 && (
                  <div className="pl-4 space-y-2">
                    <Skeleton className="h-5 w-5/6" />
                    <Skeleton className="h-5 w-4/6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : error ? (
          // Show error state
          <div className="p-4 flex flex-col items-center justify-center">
            <div className="text-red-500 mb-2 text-sm">Failed to load categories</div>
            <button 
              className="px-3 py-1 text-xs rounded-md border border-pink-600 text-pink-600 hover:bg-pink-50 transition-colors"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : !categoriesWithChildren || categoriesWithChildren.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No categories found</div>
        ) : (
          <ul className="p-2 space-y-0.5">
            {categoriesWithChildren.map((item) => (
              <li key={item.category.id} className="rounded-md overflow-hidden">
                {/* Main category */}
                <div className="flex items-center">
                  <button
                    onClick={() => toggleCategory(item.category.id)}
                    className="p-2 text-muted-foreground hover:text-foreground"
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
                  <Link
                    href={`/category/${item.category.slug}`}
                    onClick={onCategorySelect}
                    className={cn(
                      "flex-1 px-2 py-2 text-sm rounded-md transition-colors",
                      categorySlug === item.category.slug
                        ? "font-semibold text-pink-600 bg-pink-50"
                        : "hover:bg-gray-100"
                    )}
                  >
                    {item.category.name}
                  </Link>
                </div>
                
                {/* Subcategories (children) */}
                {item.children && item.children.length > 0 && expandedCategories[item.category.id] && (
                  <ul className="pl-8 pr-2 py-1 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/category/${child.slug}`}
                          onClick={onCategorySelect}
                          className={cn(
                            "block px-2 py-1.5 text-sm rounded-md transition-colors",
                            categorySlug === child.slug
                              ? "font-semibold text-pink-600 bg-pink-50"
                              : "hover:bg-gray-100"
                          )}
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default CategorySidebar;