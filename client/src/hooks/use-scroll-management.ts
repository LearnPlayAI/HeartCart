import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

interface ScrollPosition {
  x: number;
  y: number;
}

interface PageState {
  scrollPosition: ScrollPosition;
  currentPage: number;
  totalPages: number;
  timestamp: number;
}

class ScrollManager {
  private static instance: ScrollManager;
  private scrollPositions = new Map<string, ScrollPosition>();
  private pageStates = new Map<string, PageState>();
  private lastLocation: string = '';
  private previousLocation: string = '';
  private lastFullUrl: string = '';
  private previousFullUrl: string = '';
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

  setLastFullUrl(url: string): void {
    this.previousFullUrl = this.lastFullUrl;
    this.lastFullUrl = url;
  }

  getLastLocation(): string {
    return this.lastLocation;
  }

  getPreviousLocation(): string {
    return this.previousLocation;
  }

  getLastFullUrl(): string {
    return this.lastFullUrl;
  }

  getPreviousFullUrl(): string {
    return this.previousFullUrl;
  }

  // Session storage methods for pagination state
  savePageState(path: string, currentPage: number, totalPages: number): void {
    const scrollPosition = this.getScrollPosition(path) || { x: 0, y: window.scrollY };
    const pageState: PageState = {
      scrollPosition,
      currentPage,
      totalPages,
      timestamp: Date.now()
    };
    
    try {
      sessionStorage.setItem(`pageState_${path}`, JSON.stringify(pageState));
      this.pageStates.set(path, pageState);
    } catch (error) {
      console.warn('Failed to save page state to sessionStorage:', error);
    }
  }

  getPageState(path: string): PageState | null {
    try {
      // First check memory cache
      const memoryState = this.pageStates.get(path);
      if (memoryState) {
        return memoryState;
      }

      // Then check sessionStorage
      const stored = sessionStorage.getItem(`pageState_${path}`);
      if (stored) {
        const pageState = JSON.parse(stored) as PageState;
        // Only return if timestamp is recent (within 30 minutes)
        if (Date.now() - pageState.timestamp < 30 * 60 * 1000) {
          this.pageStates.set(path, pageState);
          return pageState;
        } else {
          // Clean up expired state
          sessionStorage.removeItem(`pageState_${path}`);
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve page state from sessionStorage:', error);
    }
    return null;
  }

  clearPageState(path: string): void {
    this.pageStates.delete(path);
    try {
      sessionStorage.removeItem(`pageState_${path}`);
    } catch (error) {
      console.warn('Failed to clear page state from sessionStorage:', error);
    }
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
    const currentFullUrl = window.location.pathname + window.location.search;

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
    scrollManager.setLastFullUrl(currentFullUrl);

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
    savePageState: (path: string, currentPage: number, totalPages: number) => 
      scrollManager.savePageState(path, currentPage, totalPages),
    getPageState: (path: string) => scrollManager.getPageState(path),
    clearPageState: (path: string) => scrollManager.clearPageState(path)
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
      
      if (previousLocation && scrollManager.isProductListingPage(previousLocation)) {
        // For product listing pages, use history.back() to trigger our pagination restoration
        window.history.back();
      } else if (previousLocation) {
        // Use history.back() for other cases
        window.history.back();
      } else {
        // Fallback to home page if no previous location
        window.location.href = '/';
      }
    },
    getPreviousLocation: () => scrollManager.getPreviousLocation(),
    getPreviousFullUrl: () => scrollManager.getPreviousFullUrl(),
    hasPreviousLocation: () => !!scrollManager.getPreviousLocation()
  };
};

// Hook for pagination state restoration in product listing pages
export const usePaginationStateRestoration = (
  currentPage: number,
  totalPages: number,
  setCurrentPage: (page: number) => void
) => {
  const [location] = useLocation();
  const scrollManager = ScrollManager.getInstance();
  const hasRestoredRef = useRef(false);

  // Save current pagination state whenever it changes
  useEffect(() => {
    if (scrollManager.isProductListingPage(location) && currentPage > 0) {
      scrollManager.savePageState(location, currentPage, totalPages);
    }
  }, [location, currentPage, totalPages, scrollManager]);

  // Restore pagination state when returning from product detail pages
  useEffect(() => {
    if (!hasRestoredRef.current && scrollManager.isProductListingPage(location)) {
      const previousLocation = scrollManager.getPreviousLocation();
      
      // Check if we're coming back from a product detail page
      if (scrollManager.isProductDetailPage(previousLocation)) {
        const savedPageState = scrollManager.getPageState(location);
        
        if (savedPageState && savedPageState.currentPage !== currentPage) {
          setCurrentPage(savedPageState.currentPage);
          hasRestoredRef.current = true;
        }
      }
    }
  }, [location, currentPage, setCurrentPage, scrollManager]);

  // Reset restoration flag when navigating to different paths
  useEffect(() => {
    return () => {
      hasRestoredRef.current = false;
    };
  }, [location]);

  return {
    savePageState: (page: number, total: number) => 
      scrollManager.savePageState(location, page, total),
    getSavedPageState: () => scrollManager.getPageState(location)
  };
};