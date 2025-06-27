import { useEffect, useState } from 'react';
import { cacheManager } from '../utils/cacheManager';

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // DISABLED: Update checking temporarily disabled to prevent reload loops
    // let mounted = true;

    // const checkForUpdates = async () => {
    //   if (!mounted) return;
    //   
    //   setIsChecking(true);
    //   try {
    //     const hasUpdate = await cacheManager.checkForUpdates();
    //     if (mounted && hasUpdate) {
    //       setUpdateAvailable(true);
    //     }
    //   } catch (error) {
    //     console.error('[useAppUpdate] Error checking for updates:', error);
    //   } finally {
    //     if (mounted) {
    //       setIsChecking(false);
    //     }
    //   }
    // };

    // // Check immediately
    // checkForUpdates();

    // // Set up periodic checks
    // const interval = setInterval(checkForUpdates, 30000);

    // // Check when page becomes visible
    // const handleVisibilityChange = () => {
    //   if (!document.hidden) {
    //     checkForUpdates();
    //   }
    // };

    // document.addEventListener('visibilitychange', handleVisibilityChange);

    // return () => {
    //   mounted = false;
    //   clearInterval(interval);
    //   document.removeEventListener('visibilitychange', handleVisibilityChange);
    // };
  }, []);

  const applyUpdate = async () => {
    await cacheManager.forceReload();
  };

  return {
    updateAvailable,
    isChecking,
    applyUpdate
  };
}