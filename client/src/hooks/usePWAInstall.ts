import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWAInstall = () => {
  // PWA install functionality disabled per user request
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // PWA install functionality disabled per user request
    // No browser detection, no event listeners, no logging
    return () => {
      // No cleanup needed
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallPrompt(false);
        return true;
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
      return false;
    } catch (error) {
      console.error('Install failed:', error);
      return false;
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const canShowPrompt = () => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (!dismissed) return true;
    
    // Show again after 7 days
    const dismissedTime = parseInt(dismissed);
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return dismissedTime < sevenDaysAgo;
  };

  return {
    isInstallable: false, // PWA install disabled
    isInstalled: false,
    isStandalone: false,
    isIOSDevice: false,
    showInstallPrompt: false,
    installApp: () => Promise.resolve(false),
    dismissInstallPrompt: () => {},
    canInstall: false
  };
};