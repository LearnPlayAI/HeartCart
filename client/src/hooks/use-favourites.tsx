import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface FavouritesContextType {
  favouriteProductIds: Set<number>;
  isProductFavourited: (productId: number) => boolean;
  toggleFavourite: (productId: number) => Promise<void>;
  isLoading: boolean;
  refreshFavourites: () => void;
}

const FavouritesContext = createContext<FavouritesContextType | undefined>(undefined);

interface FavouritesProviderProps {
  children: ReactNode;
}

export function FavouritesProvider({ children }: FavouritesProviderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [favouriteProductIds, setFavouriteProductIds] = useState<Set<number>>(new Set());

  // Fetch user's favourites on load
  const { data: favouritesData, isLoading } = useQuery({
    queryKey: ['/api/favourites'],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Update local state when favourites data changes
  useEffect(() => {
    if (favouritesData?.success && favouritesData.data) {
      const productIds = new Set(
        favouritesData.data.map((fav: any) => fav.productId).filter(Boolean)
      );
      setFavouriteProductIds(productIds);
    }
  }, [favouritesData]);

  // Add to favourites mutation
  const addToFavouritesMutation = useMutation({
    mutationFn: (productId: number) => apiRequest('POST', '/api/favourites', { productId }),
    onMutate: async (productId: number) => {
      // Optimistic update
      setFavouriteProductIds(prev => new Set([...prev, productId]));
    },
    onSuccess: (data, productId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/favourites'] });
      
    },
    onError: (error: any, productId) => {
      // Revert optimistic update
      setFavouriteProductIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
      const message = error?.message || error?.response?.data?.error || "Failed to add to favourites";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  });

  // Remove from favourites mutation
  const removeFromFavouritesMutation = useMutation({
    mutationFn: (productId: number) => apiRequest('DELETE', `/api/favourites/${productId}`),
    onMutate: async (productId: number) => {
      // Optimistic update
      setFavouriteProductIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    },
    onSuccess: (data, productId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/favourites'] });
      
    },
    onError: (error: any, productId) => {
      // Revert optimistic update
      setFavouriteProductIds(prev => new Set([...prev, productId]));
      const message = error?.message || error?.response?.data?.error || "Failed to remove from favourites";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  });

  const isProductFavourited = (productId: number): boolean => {
    return favouriteProductIds.has(productId);
  };

  const toggleFavourite = async (productId: number): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Login required",
        description: "Please log in to add products to your favourites.",
        variant: "destructive",
      });
      return;
    }

    if (isProductFavourited(productId)) {
      removeFromFavouritesMutation.mutate(productId);
    } else {
      addToFavouritesMutation.mutate(productId);
    }
  };

  const refreshFavourites = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/favourites'] });
  };

  return (
    <FavouritesContext.Provider
      value={{
        favouriteProductIds,
        isProductFavourited,
        toggleFavourite,
        isLoading,
        refreshFavourites,
      }}
    >
      {children}
    </FavouritesContext.Provider>
  );
}

export function useFavourites(): FavouritesContextType {
  const context = useContext(FavouritesContext);
  if (context === undefined) {
    throw new Error('useFavourites must be used within a FavouritesProvider');
  }
  return context;
}