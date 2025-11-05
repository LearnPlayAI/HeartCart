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

export function FulvicProductsCarousel() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const { data: settingData } = useQuery({
    queryKey: ['/api/settings/fulvicCarouselProducts'],
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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

  const { data: productsData } = useQuery({
    queryKey: ['/api/products/by-ids', { ids: productIds.join(',') }],
    enabled: productIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch active promotions
  const { data: promotionsResponse } = useQuery({
    queryKey: ['/api/promotions/active-with-products'],
    staleTime: 5 * 60 * 1000,
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
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 transition-all"
            aria-label="Scroll left"
            data-testid="carousel-scroll-left"
          >
            <ChevronLeft className="h-6 w-6 text-purple-600" />
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 transition-all"
            aria-label="Scroll right"
            data-testid="carousel-scroll-right"
          >
            <ChevronRight className="h-6 w-6 text-purple-600" />
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
