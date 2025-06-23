import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Plus, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface MobileInstallButtonProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showAlways?: boolean; // Force show even if not detected as installable
}

const MobileInstallButton: React.FC<MobileInstallButtonProps> = ({
  className = '',
  size = 'default',
  variant = 'default',
  showAlways = false
}) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    isIOS: false,
    isAndroid: false,
    isMobile: false,
    browser: 'unknown',
    isStandalone: false
  });

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = isIOS || isAndroid || /Mobile/.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;

    let browser = 'unknown';
    if (/Chrome/.test(userAgent) && !/Edg/.test(userAgent)) browser = 'chrome';
    else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) browser = 'safari';
    else if (/Firefox/.test(userAgent)) browser = 'firefox';
    else if (/Edg/.test(userAgent)) browser = 'edge';

    setDeviceInfo({
      isIOS,
      isAndroid,
      isMobile,
      browser,
      isStandalone
    });
  }, []);

  // Show button if mobile device and not already installed, or if forced to show
  const shouldShowButton = (deviceInfo.isMobile && !deviceInfo.isStandalone) || showAlways;

  if (!shouldShowButton) return null;

  const handleInstallClick = () => {
    setShowInstructions(true);
  };

  const getInstructions = () => {
    const { isIOS, isAndroid, browser } = deviceInfo;

    if (isIOS && browser === 'safari') {
      return {
        title: 'Install TEE ME YOU on iPhone/iPad',
        steps: [
          'Tap the Share button (□↗) at the bottom of the screen',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" in the top right corner',
          'The app will appear on your home screen'
        ],
        icon: <Share className="h-6 w-6 text-blue-500" />
      };
    } else if (isIOS) {
      return {
        title: 'Install TEE ME YOU',
        steps: [
          'Open this website in Safari browser',
          'Tap the Share button (□↗)',
          'Select "Add to Home Screen"',
          'Tap "Add" to install'
        ],
        icon: <Share className="h-6 w-6 text-blue-500" />
      };
    } else if (isAndroid && browser === 'chrome') {
      return {
        title: 'Install TEE ME YOU on Android',
        steps: [
          'Tap the menu button (⋮) in the top right',
          'Select "Add to Home screen" or "Install app"',
          'Tap "Add" or "Install"',
          'The app will appear on your home screen'
        ],
        icon: <Plus className="h-6 w-6 text-green-500" />
      };
    } else if (isAndroid) {
      return {
        title: 'Install TEE ME YOU on Android',
        steps: [
          'Open this website in Chrome browser',
          'Tap the menu (⋮) and select "Add to Home screen"',
          'Or look for an "Install" banner at the top',
          'Follow the prompts to install'
        ],
        icon: <Plus className="h-6 w-6 text-green-500" />
      };
    } else {
      return {
        title: 'Install TEE ME YOU App',
        steps: [
          'Look for an "Install" or "Add to Home Screen" option in your browser menu',
          'This is usually found in the browser\'s main menu (⋮ or ≡)',
          'Follow the prompts to install the app',
          'The app will be available on your device home screen'
        ],
        icon: <Download className="h-6 w-6 text-purple-500" />
      };
    }
  };

  const instructions = getInstructions();

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleInstallClick}
        className={`${className} bg-[#FF69B4] hover:bg-[#FF1493] text-white border-0 shadow-lg`}
      >
        <Smartphone className="h-4 w-4 mr-2" />
        Install App
      </Button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {instructions.icon}
              {instructions.title}
            </DialogTitle>
            <DialogDescription>
              Follow these steps to install our mobile app for a better shopping experience
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#FF69B4]/10 to-purple-500/10 p-4 rounded-lg border border-[#FF69B4]/20">
              <h4 className="font-semibold text-sm mb-2 text-gray-900">Why install our app?</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Faster loading and smoother experience</li>
                <li>• Works offline for browsing products</li>
                <li>• Push notifications for order updates</li>
                <li>• Quick access from your home screen</li>
                <li>• No app store download required</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-900">Installation Steps:</h4>
              <ol className="space-y-2">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#FF69B4] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="pt-4">
              <Button 
                onClick={() => setShowInstructions(false)}
                className="w-full bg-[#FF69B4] hover:bg-[#FF1493] text-white"
              >
                Got it!
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MobileInstallButton;