/**
 * Cache Manager - Handles aggressive cache clearing for deployment updates
 */

export class CacheManager {
  private static instance: CacheManager;
  private readonly VERSION_KEY = 'app-build-version';
  private readonly LAST_CHECK_KEY = 'last-version-check';
  private readonly CHECK_INTERVAL = 30000; // 30 seconds

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Clear all caches aggressively
   */
  async clearAllCaches(): Promise<void> {
    try {
      console.log('[CacheManager] Starting aggressive cache clear');
      
      // Clear all browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[CacheManager] Cleared browser caches:', cacheNames);
      }

      // Clear localStorage and sessionStorage
      if (typeof Storage !== 'undefined') {
        const localStorageKeys = Object.keys(localStorage);
        const sessionStorageKeys = Object.keys(sessionStorage);
        
        localStorage.clear();
        sessionStorage.clear();
        
        console.log('[CacheManager] Cleared storage:', {
          localStorage: localStorageKeys.length,
          sessionStorage: sessionStorageKeys.length
        });
      }

      // Clear query cache if TanStack Query is available
      if ((window as any).queryClient) {
        (window as any).queryClient.clear();
        console.log('[CacheManager] Cleared TanStack Query cache');
      }

      console.log('[CacheManager] Cache clear complete');
    } catch (error) {
      console.error('[CacheManager] Error clearing caches:', error);
    }
  }

  /**
   * Check if app version has changed and force reload if needed
   */
  async checkForUpdates(): Promise<boolean> {
    try {
      const now = Date.now();
      const lastCheck = localStorage.getItem(this.LAST_CHECK_KEY);
      
      // Rate limit checks
      if (lastCheck && (now - parseInt(lastCheck)) < this.CHECK_INTERVAL) {
        return false;
      }

      localStorage.setItem(this.LAST_CHECK_KEY, now.toString());

      // Get current build version from server
      const response = await fetch('/api/health', { 
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const currentVersion = data.buildVersion || data.timestamp || Date.now().toString();
      const storedVersion = localStorage.getItem(this.VERSION_KEY);

      if (storedVersion && storedVersion !== currentVersion) {
        console.log('[CacheManager] Version change detected:', {
          stored: storedVersion,
          current: currentVersion
        });
        
        // Store new version but don't auto-reload
        localStorage.setItem(this.VERSION_KEY, currentVersion);
        
        // Return true to indicate update is available
        return true;
      }

      // Store current version if not set
      if (!storedVersion) {
        localStorage.setItem(this.VERSION_KEY, currentVersion);
      }

      return false;
    } catch (error) {
      console.error('[CacheManager] Error checking for updates:', error);
      return false;
    }
  }

  /**
   * Initialize cache management with user-controlled updates
   */
  initialize(): void {
    console.log('[CacheManager] Cache management initialized with user-controlled updates');
    
    // Check immediately but don't auto-reload
    this.checkForUpdates();

    // Set up periodic checks
    setInterval(() => {
      this.checkForUpdates();
    }, this.CHECK_INTERVAL);

    // Check when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates();
      }
    });

    // Check on focus
    window.addEventListener('focus', () => {
      this.checkForUpdates();
    });
  }

  /**
   * Force immediate cache clear and reload
   */
  async forceReload(): Promise<void> {
    console.log('[CacheManager] Force reload requested');
    await this.clearAllCaches();
    window.location.href = window.location.href + '?t=' + Date.now();
  }
}

// Auto-initialization enabled with user-controlled updates
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      CacheManager.getInstance().initialize();
    });
  } else {
    CacheManager.getInstance().initialize();
  }
}

export const cacheManager = CacheManager.getInstance();