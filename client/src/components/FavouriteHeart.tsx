import { useState } from "react";
import { Heart } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FavouriteHeartProps {
  productId: number;
  userId?: number;
  className?: string;
  size?: number;
}

export function FavouriteHeart({ productId, userId, className, size = 20 }: FavouriteHeartProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  // Check if product is favourited
  const { data: favouriteStatus, isLoading } = useQuery({
    queryKey: ['/api/favourites/check', productId],
    queryFn: () => apiRequest(`/api/favourites/check/${productId}`),
    enabled: !!userId, // Only run if user is logged in
  });

  const isFavourited = favouriteStatus?.data?.isFavourited || false;

  // Add to favourites mutation
  const addToFavouritesMutation = useMutation({
    mutationFn: () => apiRequest('/api/favourites', {
      method: 'POST',
      body: { productId }
    }),
    onSuccess: (data) => {
      // Immediately update the cache with the new state
      queryClient.setQueryData(['/api/favourites/check', productId], {
        success: true,
        data: { isFavourited: true }
      });
      queryClient.invalidateQueries({ queryKey: ['/api/favourites'] });
      toast({
        title: "Added to favourites",
        description: "Product has been added to your favourites.",
      });
    },
    onError: (error: any) => {
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
    mutationFn: () => apiRequest(`/api/favourites/${productId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      // Immediately update the cache with the new state
      queryClient.setQueryData(['/api/favourites/check', productId], {
        success: true,
        data: { isFavourited: false }
      });
      queryClient.invalidateQueries({ queryKey: ['/api/favourites'] });
      toast({
        title: "Removed from favourites",
        description: "Product has been removed from your favourites.",
      });
    },
    onError: (error: any) => {
      const message = error?.message || error?.response?.data?.error || "Failed to remove from favourites";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      toast({
        title: "Login required",
        description: "Please log in to add products to your favourites.",
        variant: "destructive",
      });
      return;
    }

    if (isFavourited) {
      removeFromFavouritesMutation.mutate();
    } else {
      addToFavouritesMutation.mutate();
    }
  };

  const isProcessing = addToFavouritesMutation.isPending || removeFromFavouritesMutation.isPending;

  if (!userId) {
    return null; // Don't show heart for non-logged-in users
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isProcessing || isLoading}
      className={cn(
        "relative p-1 rounded-full transition-all duration-200 hover:bg-white/20",
        "focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
    >
      <Heart
        size={size}
        className={cn(
          "transition-all duration-200",
          isFavourited
            ? "fill-red-500 text-red-500"
            : isHovered
            ? "fill-red-200 text-red-500"
            : "fill-none text-gray-600 hover:text-red-500"
        )}
      />
      
      {/* Loading spinner overlay */}
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
}