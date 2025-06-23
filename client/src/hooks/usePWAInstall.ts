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
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect mobile devices and browsers
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid || /Mobile/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !isChrome;
    
    setIsIOSDevice(isIOS);
    
    // Check if app is already installed (standalone mode)
    const checkStandalone = () => {
      const standalone = isInStandaloneMode || isInWebAppiOS || document.referrer.includes('android-app://');
      setIsStandalone(standalone);
      setIsInstalled(standalone);
      return standalone;
    };

    const isAlreadyInstalled = checkStandalone();
    
    // Enhanced installability detection - always show for mobile unless already installed
    if (!isAlreadyInstalled) {
      // For iOS devices (Safari), always show manual install instructions
      if (isIOS && isSafari && !isInWebAppiOS && !isInStandaloneMode) {
        setIsInstallable(true);
      }
      // For Android Chrome/Edge, wait for beforeinstallprompt or show manual instructions
      else if (isAndroid && (isChrome || isEdge)) {
        // Show button immediately, beforeinstallprompt will enhance it
        setIsInstallable(true);
      }
      // For any other mobile browser, show manual instructions
      else if (isMobile) {
        setIsInstallable(true);
      }
      // For desktop browsers that support PWA
      else if (isChrome || isEdge || isFirefox) {
        setIsInstallable(true);
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      setIsInstallable(true);
      
      console.log('PWA install prompt available');
      
      // Show install prompt after user has interacted with the site
      const pageViews = parseInt(localStorage.getItem('pwa-page-views') || '0');
      if (pageViews >= 1) { // Reduced threshold for better visibility
        setTimeout(() => setShowInstallPrompt(true), 2000);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
      console.log('PWA installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Track page views for smart prompting
    const pageViews = parseInt(localStorage.getItem('pwa-page-views') || '0');
    localStorage.setItem('pwa-page-views', (pageViews + 1).toString());

    // Debug logging
    console.log('PWA Install Hook:', {
      isIOS,
      isAndroid,
      isMobile,
      isChrome,
      isEdge,
      isFirefox,
      isSafari,
      isInstallable: !isAlreadyInstalled,
      isInstalled: isAlreadyInstalled,
      userAgent: navigator.userAgent
    });

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
    isIOSDevice,
    showInstallPrompt: showInstallPrompt && canShowPrompt(),
    installApp,
    dismissInstallPrompt,
    canInstall: !!deferredPrompt
  };
};