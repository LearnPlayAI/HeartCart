import { useState, useEffect, useCallback } from 'react';

interface UpdateInfo {
  updateAvailable: boolean;
  currentVersion?: string;
  cachedVersion?: string;
  isUpdating: boolean;
}

interface ServiceWorkerMessage {
  type: string;
  version?: string;
  action?: string;
  currentVersion?: string;
  cachedVersion?: string;
  updateAvailable?: boolean;
  error?: string;
}

export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    updateAvailable: false,
    isUpdating: false
  });
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check for updates by comparing versions
  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !registration) {
      return;
    }

    try {
      // Force service worker to check for updates
      await registration.update();
      
      // Check version information
      const messageChannel = new MessageChannel();
      const serviceWorker = registration.active || registration.waiting || registration.installing;
      
      if (serviceWorker) {
        serviceWorker.postMessage({ type: 'CHECK_VERSION' }, [messageChannel.port2]);
        
        messageChannel.port1.onmessage = (event) => {
          const data: ServiceWorkerMessage = event.data;
          
          if (data.type === 'VERSION_INFO') {
            setUpdateInfo(prev => ({
              ...prev,
              updateAvailable: data.updateAvailable || false,
              currentVersion: data.currentVersion,
              cachedVersion: data.cachedVersion
            }));
          }
        };
      }
    } catch (error) {
      console.error('[Update] Error checking for updates:', error);
    }
  }, [registration]);

  // Apply update by reloading the page
  const applyUpdate = useCallback(async () => {
    setUpdateInfo(prev => ({ ...prev, isUpdating: true }));
    
    try {
      // Clear all caches to ensure fresh content
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear localStorage and sessionStorage
      if (typeof Storage !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // If there's a waiting service worker, tell it to skip waiting
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Wait for the new service worker to control the page
        registration.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      } else {
        // No waiting worker, just reload
        window.location.reload();
      }
    } catch (error) {
      console.error('[Update] Error applying update:', error);
      // Fallback: hard reload
      window.location.reload();
    }
  }, [registration]);

  // Dismiss update notification
  const dismissUpdate = useCallback(() => {
    setUpdateInfo(prev => ({ ...prev, updateAvailable: false }));
  }, []);

  // Initialize service worker and set up listeners
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);
      
      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        const data: ServiceWorkerMessage = event.data;
        
        if (data.type === 'SW_UPDATE') {
          setUpdateInfo(prev => ({
            ...prev,
            updateAvailable: true,
            currentVersion: data.version
          }));
        }
      });
      
      // Check for updates immediately
      checkForUpdates();
    });

    // Set up periodic update checks (every 30 seconds)
    const updateInterval = setInterval(checkForUpdates, 30000);

    // Check for updates when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdates();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(updateInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdates]);

  return {
    updateAvailable: updateInfo.updateAvailable,
    isUpdating: updateInfo.isUpdating,
    currentVersion: updateInfo.currentVersion,
    cachedVersion: updateInfo.cachedVersion,
    applyUpdate,
    dismissUpdate,
    checkForUpdates
  };
}