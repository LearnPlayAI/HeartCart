import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { IOSInstallPrompt } from './IOSInstallPrompt';

interface InstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  showIcon?: boolean;
  text?: string;
}

const InstallButton: React.FC<InstallButtonProps> = ({
  variant = 'outline',
  size = 'sm',
  className = '',
  showIcon = true,
  text = 'Install App'
}) => {
  const { isInstallable, isIOSDevice, installApp, isInstalled } = usePWAInstall();
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  // Always show the button for mobile devices (let the hook handle detection)
  // This ensures visibility while the hook determines installability
  const shouldShow = isInstallable && !isInstalled;

  if (!shouldShow) return null;

  const handleInstall = async () => {
    if (isIOSDevice) {
      setShowIOSPrompt(true);
      return;
    }
    
    const success = await installApp();
    if (!success) {
      // More helpful instructions for different browsers
      const userAgent = navigator.userAgent;
      let instructions = 'To install this app:';
      
      if (/Chrome/.test(userAgent)) {
        instructions += '\n• Tap the menu (⋮) → "Add to Home screen"';
      } else if (/Firefox/.test(userAgent)) {
        instructions += '\n• Tap the menu (⋮) → "Install"';
      } else if (/Safari/.test(userAgent)) {
        instructions += '\n• Tap the share button (□↗) → "Add to Home Screen"';
      } else {
        instructions += '\n• Look for "Add to Home Screen" or "Install" in your browser menu';
      }
      
      alert(instructions);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleInstall}
        className={`${className} border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white transition-colors duration-200`}
      >
        {showIcon && <Download className="h-4 w-4 mr-2" />}
        {text}
      </Button>
      
      {showIOSPrompt && (
        <IOSInstallPrompt onDismiss={() => setShowIOSPrompt(false)} />
      )}
    </>
  );
};

export default InstallButton;