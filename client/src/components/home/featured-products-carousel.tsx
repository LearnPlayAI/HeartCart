import { useQuery } from '@tanstack/react-query';
import ProductCard from '@/components/product/product-card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Product } from '@shared/schema';

interface CarouselProduct {
  productId: number;
  position: number;
}

interface CarouselConfig {
  enabled: boolean;
  products: CarouselProduct[];
}

export function FeaturedProductsCarousel() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);

  const { data: settingData } = useQuery<any>({
    queryKey: ['/api/settings/featuredCarouselProducts'],
    retry: false,
    staleTime: 0, // Don't cache - always fetch fresh data
    refetchOnMount: 'always', // Force refetch on mount regardless of staleTime
    refetchOnWindowFocus: 'always', // Force refetch when user returns to tab
  });

  let config: CarouselConfig | null = null;
  if (settingData?.success && settingData.data?.settingValue) {
    try {
      config = JSON.parse(settingData.data.settingValue);
    } catch (error) {
      console.error('Error parsing carousel config:', error);
    }
  }

  const productIds = config?.products
    ?.sort((a, b) => a.position - b.position)
    .map(p => p.productId) || [];

  const { data: productsData } = useQuery<any>({
    queryKey: ['/api/products/by-ids', { ids: productIds.join(',') }],
    enabled: productIds.length > 0,
    staleTime: 0, // Don't cache - always fetch fresh data
    refetchOnMount: 'always', // Force refetch on mount regardless of staleTime
    refetchOnWindowFocus: 'always', // Force refetch when user returns to tab
  });

  // Fetch active promotions
  const { data: promotionsResponse } = useQuery<any>({
    queryKey: ['/api/promotions/active-with-products'],
    staleTime: 0, // Don't cache - always fetch fresh data
    refetchOnMount: 'always', // Force refetch on mount regardless of staleTime
    refetchOnWindowFocus: 'always', // Force refetch when user returns to tab
  });

  const products: Product[] = productsData?.success ? productsData.data : [];

  // Create a map of product promotions for quick lookup
  const activePromotions = promotionsResponse?.success ? promotionsResponse.data : [];
  const productPromotions = new Map();

  activePromotions?.forEach((promo: any) => {
    promo.products?.forEach((pp: any) => {
      productPromotions.set(pp.productId, {
        promotionName: promo.promotionName,
        promotionDiscount: pp.additionalDiscountPercentage || pp.discountOverride || promo.discountValue,
        promotionDiscountType: promo.discountType,
        promotionEndDate: promo.endDate,
        promotionalPrice: pp.promotionalPrice ? Number(pp.promotionalPrice) : null
      });
    });
  });

  const updateArrowVisibility = () => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    updateArrowVisibility();
    window.addEventListener('resize', updateArrowVisibility);
    return () => window.removeEventListener('resize', updateArrowVisibility);
  }, [products]);

  // Auto-scroll carousel every 3 seconds
  useEffect(() => {
    if (!scrollContainerRef.current || isAutoScrollPaused || products.length === 0) {
      return;
    }

    const autoScrollInterval = setInterval(() => {
      if (!scrollContainerRef.current) return;

      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 10;

      if (isAtEnd) {
        // Loop back to the beginning
        scrollContainerRef.current.scrollTo({
          left: 0,
          behavior: 'smooth',
        });
      } else {
        // Scroll to the right
        const scrollAmount = clientWidth * 0.8;
        scrollContainerRef.current.scrollTo({
          left: scrollLeft + scrollAmount,
          behavior: 'smooth',
        });
      }
    }, 5000); // 5 seconds

    return () => clearInterval(autoScrollInterval);
  }, [isAutoScrollPaused, products]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
    const newScrollLeft = direction === 'left'
      ? scrollContainerRef.current.scrollLeft - scrollAmount
      : scrollContainerRef.current.scrollLeft + scrollAmount;

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  if (!config?.enabled || products.length === 0) {
    return null;
  }

  return (
    <section className="mb-4 md:mb-8 bg-white rounded-lg shadow-md overflow-hidden" data-testid="fulvic-products-carousel">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-4">
        <h2 className="text-white text-xl font-bold">
          Fulvic Wellness Products
        </h2>
        <p className="text-white/90 text-sm mt-1">
          Premium health and wellness solutions for you and your animals
        </p>
      </div>
      <div className="relative bg-[#f3e5f5]">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-purple-600 hover:bg-[#ff69b4] shadow-lg rounded-full p-2 transition-all"
            aria-label="Scroll left"
            data-testid="carousel-scroll-left"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-purple-600 hover:bg-[#ff69b4] shadow-lg rounded-full p-2 transition-all"
            aria-label="Scroll right"
            data-testid="carousel-scroll-right"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        )}

        {/* Products Container */}
        <div
          ref={scrollContainerRef}
          onScroll={updateArrowVisibility}
          className="flex overflow-x-auto gap-4 sm:gap-6 p-4 scroll-smooth hide-scrollbar"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-64 sm:w-72"
              data-testid={`carousel-product-card-${product.id}`}
            >
              <ProductCard
                product={product}
                isFlashDeal={false}
                showAddToCart={true}
                promotionInfo={productPromotions.get(product.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
