import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Get all categories
export function useCategories() {
  return useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('/api/categories');
      return response;
    }
  });
}

// Get a category name by its ID
export function useCategoryName(categoryId?: number | null) {
  const { data } = useCategories();
  
  if (!categoryId || !data) return '';
  
  const category = data.find((cat: any) => cat.id === categoryId);
  return category ? category.name : '';
}

// Get main categories with children
export function useMainCategoriesWithChildren() {
  return useQuery({
    queryKey: ['/api/categories/main/with-children'],
    queryFn: async () => {
      const response = await apiRequest('/api/categories/main/with-children');
      return response;
    }
  });
}

// Get a category with its children by ID
export function useCategoryWithChildren(categoryId: number) {
  return useQuery({
    queryKey: [`/api/categories/${categoryId}/with-children`],
    queryFn: async () => {
      const response = await apiRequest(`/api/categories/${categoryId}/with-children`);
      return response;
    },
    enabled: !!categoryId
  });
}