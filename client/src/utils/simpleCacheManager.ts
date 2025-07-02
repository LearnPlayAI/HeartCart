/**
 * Simple Cache Manager - Manual cache clearing for TeeMeYou.shop
 * Removes automatic version checking and provides manual cache clearing functionality
 */

export class SimpleCacheManager {
  private static instance: SimpleCacheManager;

  static getInstance(): SimpleCacheManager {
    if (!SimpleCacheManager.instance) {
      SimpleCacheManager.instance = new SimpleCacheManager();
    }
    return SimpleCacheManager.instance;
  }

  /**
   * Clear all caches manually - called by user action
   */
  async clearAllCaches(): Promise<void> {
    try {
      console.log('[SimpleCacheManager] Starting manual cache clear');
      
      // Clear all browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[SimpleCacheManager] Cleared browser caches:', cacheNames);
      }

      // Clear localStorage and sessionStorage
      if (typeof Storage !== 'undefined') {
        const localStorageKeys = Object.keys(localStorage);
        const sessionStorageKeys = Object.keys(sessionStorage);
        
        localStorage.clear();
        sessionStorage.clear();
        
        console.log('[SimpleCacheManager] Cleared storage:', {
          localStorage: localStorageKeys.length,
          sessionStorage: sessionStorageKeys.length
        });
      }

      // Clear query cache if TanStack Query is available
      if ((window as any).queryClient) {
        (window as any).queryClient.clear();
        console.log('[SimpleCacheManager] Cleared TanStack Query cache');
      }

      console.log('[SimpleCacheManager] Manual cache clear complete');
    } catch (error) {
      console.error('[SimpleCacheManager] Error clearing caches:', error);
      throw error;
    }
  }

  /**
   * Force reload the page after cache clearing
   */
  async refreshSite(): Promise<void> {
    await this.clearAllCaches();
    
    // Force a hard reload by adding timestamp to bypass any remaining cache
    const currentUrl = window.location.href;
    const separator = currentUrl.includes('?') ? '&' : '?';
    const refreshUrl = `${currentUrl}${separator}_refresh=${Date.now()}`;
    
    console.log('[SimpleCacheManager] Forcing page reload with cache bypass');
    window.location.replace(refreshUrl);
  }
}

// Export singleton instance
export const simpleCacheManager = SimpleCacheManager.getInstance();