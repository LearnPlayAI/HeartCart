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

  if (!isInstallable || isInstalled) return null;

  const handleInstall = async () => {
    if (isIOSDevice) {
      setShowIOSPrompt(true);
      return;
    }
    
    const success = await installApp();
    if (!success) {
      alert('To install this app, look for "Add to Home Screen" or "Install" in your browser menu.');
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleInstall}
        className={`${className} border-pink-200 text-pink-600 hover:bg-pink-50`}
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