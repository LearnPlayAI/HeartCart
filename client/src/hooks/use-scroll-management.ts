import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';

interface ScrollPosition {
  x: number;
  y: number;
}

interface ProductListingState {
  scrollY: number;
  targetProductId: string | null;
  page: number;
  categoryId: string | null;
  fullUrl: string;
  timestamp: number;
}

class ScrollManager {
  private static instance: ScrollManager;
  private scrollPositions = new Map<string, ScrollPosition>();
  private lastLocation: string = '';
  private previousLocation: string = '';
  private lastFullUrl: string = '';
  private previousFullUrl: string = '';
  private isListeningToScroll = false;
  private productListingState: ProductListingState | null = null;

  static getInstance(): ScrollManager {
    if (!ScrollManager.instance) {
      ScrollManager.instance = new ScrollManager();
    }
    return ScrollManager.instance;
  }

  private handleScroll = () => {
    const fullUrl = window.location.pathname + window.location.search;
    if (this.isProductListingPage(window.location.pathname)) {
      this.saveScrollPosition(fullUrl);
    }
  };

  private handleBeforeUnload = () => {
    const fullUrl = window.location.pathname + window.location.search;
    this.saveScrollPosition(fullUrl);
  };

  startScrollTracking(): void {
    if (!this.isListeningToScroll) {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      this.isListeningToScroll = true;
    }
  }

  stopScrollTracking(): void {
    if (this.isListeningToScroll) {
      window.removeEventListener('scroll', this.handleScroll);
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      this.isListeningToScroll = false;
    }
  }

  saveScrollPosition(fullUrl: string): void {
    const scrollPosition = {
      x: window.scrollX || window.pageXOffset,
      y: window.scrollY || window.pageYOffset
    };
    this.scrollPositions.set(fullUrl, scrollPosition);
  }

  getScrollPosition(fullUrl: string): ScrollPosition | null {
    return this.scrollPositions.get(fullUrl) || null;
  }

  clearScrollPosition(fullUrl: string): void {
    this.scrollPositions.delete(fullUrl);
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

  saveProductListingState(state: ProductListingState): void {
    this.productListingState = state;
    try {
      sessionStorage.setItem('productListingScrollState', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save product listing state to sessionStorage:', error);
    }
  }

  getProductListingState(): ProductListingState | null {
    if (this.productListingState) {
      return this.productListingState;
    }
    
    try {
      const stored = sessionStorage.getItem('productListingScrollState');
      if (stored) {
        const state = JSON.parse(stored) as ProductListingState;
        if (Date.now() - state.timestamp < 30 * 60 * 1000) {
          this.productListingState = state;
          return state;
        } else {
          sessionStorage.removeItem('productListingScrollState');
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve product listing state from sessionStorage:', error);
    }
    return null;
  }

  clearProductListingState(): void {
    this.productListingState = null;
    try {
      sessionStorage.removeItem('productListingScrollState');
      sessionStorage.removeItem('productListingState');
      sessionStorage.removeItem('productListingScrollPosition');
      sessionStorage.removeItem('productListingTargetProduct');
      sessionStorage.removeItem('productListingPage');
    } catch (error) {
      console.warn('Failed to clear product listing state:', error);
    }
  }

  isProductDetailPage(path: string): boolean {
    return path.startsWith('/product/') && !path.includes('/products');
  }

  isProductListingPage(path: string): boolean {
    return (
      path === '/' ||
      path === '/products' ||
      path.startsWith('/products?') ||
      path.startsWith('/category/') ||
      path.startsWith('/search') ||
      path === '/flash-deals' ||
      path === '/promotions'
    );
  }

  shouldPreserveScroll(fromPath: string, toPath: string): boolean {
    if (this.isProductListingPage(fromPath) && this.isProductDetailPage(toPath)) {
      return true;
    }
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

    if (scrollManager.isProductListingPage(currentPath)) {
      scrollManager.startScrollTracking();
    }

    if (previousPath) {
      const prevFullUrl = scrollManager.getLastFullUrl();
      if (prevFullUrl) {
        scrollManager.saveScrollPosition(prevFullUrl);
      }
    }

    scrollManager.setLastLocation(currentPath);
    scrollManager.setLastFullUrl(currentFullUrl);

    if (scrollManager.isProductDetailPage(currentPath)) {
      window.scrollTo(0, 0);
      lastLocationRef.current = currentPath;
      return;
    }

    lastLocationRef.current = currentPath;

    return () => {
      scrollManager.stopScrollTracking();
    };
  }, [location]);
};

export const useScrollPositionManager = () => {
  const scrollManager = ScrollManager.getInstance();
  
  return {
    saveScrollPosition: (fullUrl: string) => scrollManager.saveScrollPosition(fullUrl),
    getScrollPosition: (fullUrl: string) => scrollManager.getScrollPosition(fullUrl),
    clearScrollPosition: (fullUrl: string) => scrollManager.clearScrollPosition(fullUrl),
    saveProductListingState: (state: ProductListingState) => scrollManager.saveProductListingState(state),
    getProductListingState: () => scrollManager.getProductListingState(),
    clearProductListingState: () => scrollManager.clearProductListingState()
  };
};

export const useProductListingScroll = () => {
  const scrollManager = ScrollManager.getInstance();

  useEffect(() => {
    return () => {
      const fullUrl = window.location.pathname + window.location.search;
      if (scrollManager.isProductListingPage(window.location.pathname)) {
        scrollManager.saveScrollPosition(fullUrl);
      }
    };
  }, []);
};

export const useNavigateBack = () => {
  const scrollManager = ScrollManager.getInstance();
  
  return {
    goBack: () => {
      window.history.back();
    },
    getPreviousLocation: () => scrollManager.getPreviousLocation(),
    getPreviousFullUrl: () => scrollManager.getPreviousFullUrl(),
    hasPreviousLocation: () => !!scrollManager.getPreviousLocation()
  };
};

export const useScrollRestoration = (
  isLoading: boolean,
  productsLoaded: boolean,
  onRestoreComplete?: () => void
) => {
  const restoredRef = useRef(false);
  const scrollManager = ScrollManager.getInstance();

  const restoreScrollPosition = useCallback(() => {
    if (restoredRef.current) return;

    const savedState = scrollManager.getProductListingState();
    if (!savedState) return;

    const currentFullUrl = window.location.pathname + window.location.search;
    
    const currentParams = new URLSearchParams(window.location.search);
    const savedParams = new URLSearchParams(savedState.fullUrl.split('?')[1] || '');
    
    const currentCategoryId = currentParams.get('categoryId') || 'null';
    const savedCategoryId = savedParams.get('categoryId') || savedState.categoryId || 'null';
    
    if (currentCategoryId !== savedCategoryId) {
      scrollManager.clearProductListingState();
      return;
    }

    restoredRef.current = true;

    const attemptScroll = (attempt: number = 0) => {
      if (attempt > 10) {
        window.scrollTo(0, savedState.scrollY);
        scrollManager.clearProductListingState();
        onRestoreComplete?.();
        return;
      }

      if (savedState.targetProductId) {
        const targetElement = document.querySelector(`[data-product-id="${savedState.targetProductId}"]`);
        if (targetElement) {
          const rect = targetElement.getBoundingClientRect();
          const absoluteTop = rect.top + window.scrollY;
          const center = absoluteTop - (window.innerHeight / 2) + (targetElement.clientHeight / 2);
          window.scrollTo({ top: Math.max(0, center), behavior: 'instant' });
          scrollManager.clearProductListingState();
          onRestoreComplete?.();
          return;
        }
      }

      if (savedState.scrollY > 0) {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (maxScroll >= savedState.scrollY * 0.8) {
          window.scrollTo({ top: savedState.scrollY, behavior: 'instant' });
          scrollManager.clearProductListingState();
          onRestoreComplete?.();
          return;
        }
      }

      setTimeout(() => attemptScroll(attempt + 1), 100);
    };

    requestAnimationFrame(() => {
      attemptScroll(0);
    });
  }, [scrollManager, onRestoreComplete]);

  useEffect(() => {
    if (!isLoading && productsLoaded && !restoredRef.current) {
      const savedState = scrollManager.getProductListingState();
      if (savedState) {
        setTimeout(() => {
          restoreScrollPosition();
        }, 50);
      }
    }
  }, [isLoading, productsLoaded, restoreScrollPosition]);

  useEffect(() => {
    restoredRef.current = false;
  }, []);

  return {
    restoreScrollPosition,
    hasStateToRestore: () => !!scrollManager.getProductListingState()
  };
};

export const usePaginationStateRestoration = (
  currentPage: number,
  totalPages: number,
  setCurrentPage: (page: number) => void
) => {
  const [location] = useLocation();
  const scrollManager = ScrollManager.getInstance();
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/products' && !hasRestoredRef.current) {
        const savedState = scrollManager.getProductListingState();
        if (savedState && savedState.page !== currentPage && savedState.page > 1) {
          const currentParams = new URLSearchParams(window.location.search);
          const savedCategoryId = savedState.categoryId || 'null';
          const currentCategoryId = currentParams.get('categoryId') || 'null';
          
          if (savedCategoryId === currentCategoryId) {
            setCurrentPage(savedState.page);
            hasRestoredRef.current = true;
            setTimeout(() => {
              hasRestoredRef.current = false;
            }, 1000);
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPage, setCurrentPage, scrollManager]);

  return {
    savePageState: (page: number, total: number) => {
      const fullUrl = window.location.pathname + window.location.search;
      const params = new URLSearchParams(window.location.search);
      scrollManager.saveProductListingState({
        scrollY: window.scrollY,
        targetProductId: null,
        page,
        categoryId: params.get('categoryId'),
        fullUrl,
        timestamp: Date.now()
      });
    },
    getSavedPageState: () => scrollManager.getProductListingState()
  };
};

export const saveProductClickState = (productId: number | string) => {
  const scrollManager = ScrollManager.getInstance();
  const fullUrl = window.location.pathname + window.location.search;
  const params = new URLSearchParams(window.location.search);
  const pageParam = params.get('page');
  const page = pageParam ? parseInt(pageParam) : 1;
  
  const state: ProductListingState = {
    scrollY: window.scrollY,
    targetProductId: productId.toString(),
    page,
    categoryId: params.get('categoryId'),
    fullUrl,
    timestamp: Date.now()
  };
  
  scrollManager.saveProductListingState(state);
};

export { ScrollManager };
