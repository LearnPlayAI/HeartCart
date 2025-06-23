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
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed (standalone mode)
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
      setIsInstalled(standalone);
    };

    checkStandalone();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      setIsInstallable(true);
      
      // Show install prompt after user has interacted with the site
      const pageViews = parseInt(localStorage.getItem('pwa-page-views') || '0');
      if (pageViews >= 2) {
        setTimeout(() => setShowInstallPrompt(true), 3000);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Track page views for smart prompting
    const pageViews = parseInt(localStorage.getItem('pwa-page-views') || '0');
    localStorage.setItem('pwa-page-views', (pageViews + 1).toString());

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
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
    isInstallable: isInstallable && !isInstalled && !isStandalone,
    isInstalled,
    isStandalone,
    showInstallPrompt: showInstallPrompt && canShowPrompt(),
    installApp,
    dismissInstallPrompt,
    canInstall: !!deferredPrompt
  };
};