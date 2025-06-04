import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavourites } from "@/hooks/use-favourites";

interface FavouriteHeartProps {
  productId: number;
  userId?: number;
  className?: string;
  size?: number;
}

export function FavouriteHeart({ productId, userId, className, size = 20 }: FavouriteHeartProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isProductFavourited, toggleFavourite } = useFavourites();

  const isFavourited = isProductFavourited(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleFavourite(productId);
  };

  if (!userId) {
    return null; // Don't show heart for non-logged-in users
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative p-1 rounded-full transition-all duration-200 hover:bg-white/20",
        "focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2",
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
    </button>
  );
}