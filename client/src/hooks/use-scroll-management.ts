import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

interface ScrollPosition {
  x: number;
  y: number;
}

class ScrollManager {
  private static instance: ScrollManager;
  private scrollPositions = new Map<string, ScrollPosition>();
  private lastLocation: string = '';

  static getInstance(): ScrollManager {
    if (!ScrollManager.instance) {
      ScrollManager.instance = new ScrollManager();
    }
    return ScrollManager.instance;
  }

  saveScrollPosition(path: string): void {
    const scrollPosition = {
      x: window.scrollX || window.pageXOffset,
      y: window.scrollY || window.pageYOffset
    };
    this.scrollPositions.set(path, scrollPosition);
  }

  getScrollPosition(path: string): ScrollPosition | null {
    return this.scrollPositions.get(path) || null;
  }

  clearScrollPosition(path: string): void {
    this.scrollPositions.delete(path);
  }

  setLastLocation(location: string): void {
    this.lastLocation = location;
  }

  getLastLocation(): string {
    return this.lastLocation;
  }

  isProductDetailPage(path: string): boolean {
    return path.startsWith('/product/') && !path.includes('/products');
  }

  isProductListingPage(path: string): boolean {
    return (
      path === '/' ||
      path === '/products' ||
      path.startsWith('/category/') ||
      path.startsWith('/search') ||
      path === '/flash-deals' ||
      path === '/promotions'
    );
  }

  shouldPreserveScroll(fromPath: string, toPath: string): boolean {
    // Preserve scroll when going from product listing to product detail
    if (this.isProductListingPage(fromPath) && this.isProductDetailPage(toPath)) {
      return true;
    }
    // Preserve scroll when returning from product detail to product listing
    if (this.isProductDetailPage(fromPath) && this.isProductListingPage(toPath)) {
      return true;
    }
    return false;
  }
}

export const useScrollToTop = () => {
  const [location] = useLocation();
  const scrollManager = ScrollManager.getInstance();
  const lastLocationRef = useRef<string>('');

  useEffect(() => {
    const currentPath = location;
    const previousPath = lastLocationRef.current;

    // Always save scroll position before navigation
    if (previousPath) {
      scrollManager.saveScrollPosition(previousPath);
    }

    // Product detail pages should ALWAYS start at the top
    if (scrollManager.isProductDetailPage(currentPath)) {
      window.scrollTo(0, 0);
      lastLocationRef.current = currentPath;
      return;
    }

    // Determine if we should preserve scroll position for other pages
    const shouldPreserveScroll = scrollManager.shouldPreserveScroll(previousPath, currentPath);

    if (shouldPreserveScroll) {
      // Check if we're returning to a previous page that had saved scroll position
      const savedPosition = scrollManager.getScrollPosition(currentPath);
      if (savedPosition) {
        // Restore scroll position after a short delay to ensure DOM is ready
        setTimeout(() => {
          window.scrollTo(savedPosition.x, savedPosition.y);
        }, 100);
      } else {
        // If no saved position, scroll to top
        window.scrollTo(0, 0);
      }
    } else {
      // For all other navigation, scroll to top
      window.scrollTo(0, 0);
    }

    // Update last location reference
    lastLocationRef.current = currentPath;
  }, [location]);
};

export const useScrollPositionManager = () => {
  const scrollManager = ScrollManager.getInstance();
  
  return {
    saveScrollPosition: (path: string) => scrollManager.saveScrollPosition(path),
    getScrollPosition: (path: string) => scrollManager.getScrollPosition(path),
    clearScrollPosition: (path: string) => scrollManager.clearScrollPosition(path),
  };
};

// Hook specifically for product listing pages to handle back navigation
export const useProductListingScroll = () => {
  const [location] = useLocation();
  const scrollManager = ScrollManager.getInstance();

  useEffect(() => {
    // Save scroll position when leaving product listing pages
    return () => {
      if (scrollManager.isProductListingPage(location)) {
        scrollManager.saveScrollPosition(location);
      }
    };
  }, [location]);
};