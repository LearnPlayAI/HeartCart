import React, { useState } from 'react';
import { Download, ShoppingCart, Package, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { IOSInstallPrompt } from './IOSInstallPrompt';

interface ContextualInstallPromptsProps {
  context: 'cart' | 'checkout' | 'order-success' | 'general';
  className?: string;
}

const ContextualInstallPrompts: React.FC<ContextualInstallPromptsProps> = ({
  context,
  className = ''
}) => {
  const { isInstallable, isIOSDevice, installApp } = usePWAInstall();
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  if (!isInstallable) return null;

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

  const getContextualContent = () => {
    switch (context) {
      case 'cart':
        return {
          icon: <ShoppingCart className="h-5 w-5 text-pink-500" />,
          title: 'Install for Faster Checkout',
          description: 'Get the app for a quicker shopping experience',
          buttonText: 'Install Now'
        };
      case 'checkout':
        return {
          icon: <Package className="h-5 w-5 text-pink-500" />,
          title: 'Track Your Order',
          description: 'Install our app to get real-time order updates',
          buttonText: 'Get App'
        };
      case 'order-success':
        return {
          icon: <Bell className="h-5 w-5 text-pink-500" />,
          title: 'Never Miss an Update',
          description: 'Install the app to track your order and get notifications',
          buttonText: 'Install App'
        };
      default:
        return {
          icon: <Download className="h-5 w-5 text-pink-500" />,
          title: 'Get the HeartCart App',
          description: 'Faster loading, offline access, push notifications',
          buttonText: 'Install'
        };
    }
  };

  const content = getContextualContent();

  return (
    <>
      <Card className={`border-pink-200 bg-gradient-to-r from-pink-50 to-white ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <img 
              src="/icon-192.png" 
              alt="TEE ME YOU"
              className="w-8 h-8 rounded"
            />
            {content.icon}
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 text-sm">{content.title}</h4>
              <p className="text-xs text-gray-600">{content.description}</p>
            </div>
            <Button
              onClick={handleInstall}
              size="sm"
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              {content.buttonText}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {showIOSPrompt && (
        <IOSInstallPrompt onDismiss={() => setShowIOSPrompt(false)} />
      )}
    </>
  );
};

export default ContextualInstallPrompts;