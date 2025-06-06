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
  private previousLocation: string = '';
  private isListeningToScroll = false;

  static getInstance(): ScrollManager {
    if (!ScrollManager.instance) {
      ScrollManager.instance = new ScrollManager();
    }
    return ScrollManager.instance;
  }

  private handleScroll = () => {
    if (this.lastLocation && this.isProductListingPage(this.lastLocation)) {
      this.saveScrollPosition(this.lastLocation);
    }
  };

  private handleBeforeUnload = () => {
    if (this.lastLocation) {
      this.saveScrollPosition(this.lastLocation);
    }
  };

  private handlePopState = (event: PopStateEvent) => {
    // When back button is pressed, save current scroll position
    if (this.lastLocation) {
      this.saveScrollPosition(this.lastLocation);
    }
  };

  startScrollTracking(): void {
    if (!this.isListeningToScroll) {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      window.addEventListener('popstate', this.handlePopState);
      this.isListeningToScroll = true;
    }
  }

  stopScrollTracking(): void {
    if (this.isListeningToScroll) {
      window.removeEventListener('scroll', this.handleScroll);
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      window.removeEventListener('popstate', this.handlePopState);
      this.isListeningToScroll = false;
    }
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
    this.previousLocation = this.lastLocation;
    this.lastLocation = location;
  }

  getLastLocation(): string {
    return this.lastLocation;
  }

  getPreviousLocation(): string {
    return this.previousLocation;
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

    // Start scroll tracking for product listing pages
    if (scrollManager.isProductListingPage(currentPath)) {
      scrollManager.startScrollTracking();
    }

    // Always save scroll position before navigation
    if (previousPath) {
      scrollManager.saveScrollPosition(previousPath);
    }

    // Update scroll manager location tracking
    scrollManager.setLastLocation(currentPath);

    // Product detail pages should ALWAYS start at the top
    if (scrollManager.isProductDetailPage(currentPath)) {
      window.scrollTo(0, 0);
      lastLocationRef.current = currentPath;
      return;
    }

    // Check if we're coming back from a product detail page to a listing page
    const isBackFromProductDetail = scrollManager.isProductDetailPage(previousPath) && scrollManager.isProductListingPage(currentPath);
    
    if (isBackFromProductDetail) {
      // Restore scroll position when coming back from product detail
      const savedPosition = scrollManager.getScrollPosition(currentPath);
      if (savedPosition) {
        // Use requestAnimationFrame for better timing with DOM updates
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo({
              left: savedPosition.x,
              top: savedPosition.y,
              behavior: 'instant'
            });
          }, 250);
        });
      } else {
        window.scrollTo(0, 0);
      }
    } else if (scrollManager.isProductListingPage(currentPath)) {
      // For fresh navigation to product listing pages, check if we have saved position
      const savedPosition = scrollManager.getScrollPosition(currentPath);
      if (savedPosition && scrollManager.shouldPreserveScroll(previousPath, currentPath)) {
        setTimeout(() => {
          window.scrollTo({
            left: savedPosition.x,
            top: savedPosition.y,
            behavior: 'instant'
          });
        }, 100);
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      // For all other navigation, scroll to top
      window.scrollTo(0, 0);
    }

    // Update last location reference
    lastLocationRef.current = currentPath;

    // Cleanup function to stop tracking when component unmounts
    return () => {
      scrollManager.stopScrollTracking();
    };
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

// Hook for back navigation with scroll position restoration
export const useNavigateBack = () => {
  const scrollManager = ScrollManager.getInstance();
  
  return {
    goBack: () => {
      const previousLocation = scrollManager.getPreviousLocation();
      if (previousLocation) {
        // Use history.back() to maintain browser history
        window.history.back();
      } else {
        // Fallback to home page if no previous location
        window.location.href = '/';
      }
    },
    getPreviousLocation: () => scrollManager.getPreviousLocation(),
    hasPreviousLocation: () => !!scrollManager.getPreviousLocation()
  };
};