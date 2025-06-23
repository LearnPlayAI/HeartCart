import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MobileInstallButton from './MobileInstallButton';

const FloatingInstallButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the floating button
    const dismissed = localStorage.getItem('pwa-floating-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Detect mobile devices
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = isIOS || isAndroid || /Mobile/.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;

    // Only show on mobile devices that aren't already installed
    if (isMobile && !isStandalone) {
      // Show after a brief delay to avoid being intrusive
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000); // 5 second delay

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-floating-dismissed', 'true');
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-[#FF69B4]/20 p-4 max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 text-sm">Install TEE ME YOU</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-gray-600 mb-3">
          Get faster loading and offline access by installing our mobile app
        </p>
        
        <div className="flex gap-2">
          <MobileInstallButton 
            variant="default"
            size="sm"
            className="flex-1"
            showAlways={true}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="text-gray-500 border-gray-200"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FloatingInstallButton;