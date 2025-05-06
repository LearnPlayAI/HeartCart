import React from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Shirt, Smartphone, Home, UtensilsCrossed, Sparkles, 
  Gift, Baby, Volleyball, PawPrint, Car, Apple, MoreHorizontal 
} from 'lucide-react';
import type { Category } from '@shared/schema';

// Map of category names to icons
const categoryIcons: Record<string, React.ReactNode> = {
  'Fashion': <Shirt className="text-[#FF69B4] text-xl" />,
  'Electronics': <Smartphone className="text-[#FF69B4] text-xl" />,
  'Home': <Home className="text-[#FF69B4] text-xl" />,
  'Kitchen': <UtensilsCrossed className="text-[#FF69B4] text-xl" />,
  'Beauty': <Sparkles className="text-[#FF69B4] text-xl" />,
  'Gifts': <Gift className="text-[#FF69B4] text-xl" />,
  'Kids': <Baby className="text-[#FF69B4] text-xl" />,
  'Sports': <Volleyball className="text-[#FF69B4] text-xl" />,
  'Pets': <PawPrint className="text-[#FF69B4] text-xl" />,
  'Automotive': <Car className="text-[#FF69B4] text-xl" />,
  'Groceries': <Apple className="text-[#FF69B4] text-xl" />,
  'More': <MoreHorizontal className="text-[#FF69B4] text-xl" />
};

const CategoriesShowcase = () => {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });
  
  return (
    <section className="mb-8 bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-4">Shop by Category</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {isLoading ? (
          // Show skeleton loaders while loading
          Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center p-3 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-gray-200 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          ))
        ) : (
          categories?.map((category) => (
            <Link key={category.id} href={`/category/${category.slug}`} className="category-pill flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <div className="w-14 h-14 rounded-full bg-[#FFC0CB] flex items-center justify-center mb-2">
                {categoryIcons[category.name] || <MoreHorizontal className="text-[#FF69B4] text-xl" />}
              </div>
              <span className="text-sm text-center font-medium">{category.name}</span>
            </Link>
          ))
        )}
        
        {/* Fallback "More" category if no data */}
        {!isLoading && (!categories || categories.length === 0) && (
          <Link href="/categories" className="category-pill flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
            <div className="w-14 h-14 rounded-full bg-[#FFC0CB] flex items-center justify-center mb-2">
              <MoreHorizontal className="text-[#FF69B4] text-xl" />
            </div>
            <span className="text-sm text-center font-medium">All Categories</span>
          </Link>
        )}
      </div>
    </section>
  );
};

export default CategoriesShowcase;
