import { useState, useEffect } from 'react';
import { getPWADisplayMode } from '@/lib/utils';

type UsePwaReturnType = {
  isInstallable: boolean;
  isStandalone: boolean;
  installPwa: () => void;
  displayMode: string;
};

export const usePwa = (): UsePwaReturnType => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [displayMode, setDisplayMode] = useState(getPWADisplayMode());
  
  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    const detectDisplayMode = () => {
      setDisplayMode(getPWADisplayMode());
    };
    
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      detectDisplayMode();
    });
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);
  
  const installPwa = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, clear it
    setDeferredPrompt(null);
    setIsInstallable(false);
  };
  
  return {
    isInstallable,
    isStandalone: displayMode !== 'browser',
    installPwa,
    displayMode
  };
};
