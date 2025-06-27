import React, { useState } from 'react';
import { Download, Smartphone, X, Apple, Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const MobileAppInstallButton: React.FC = () => {
  const { 
    isInstallable, 
    installApp, 
    isIOSDevice, 
    isStandalone, 
    showInstallPrompt,
    dismissInstallPrompt 
  } = usePWAInstall();
  
  const [showInstructions, setShowInstructions] = useState(false);

  // Don't show if already installed or not on mobile
  if (isStandalone || !isInstallable) return null;

  const handleInstall = async () => {
    const success = await installApp();
    if (!success) {
      // Show manual install instructions
      setShowInstructions(true);
    }
  };

  const IOSInstructions = () => (
    <Card className="mt-4 border-2 border-pink-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-bold text-gray-900 flex items-center">
            <Apple className="mr-2 h-5 w-5" />
            Install on iPhone/iPad
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInstructions(false)}
            className="text-gray-400"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <ol className="text-sm text-gray-600 space-y-2">
          <li>1. Tap the <strong>Share</strong> button at the bottom of Safari</li>
          <li>2. Scroll down and tap <strong>"Add to Home Screen"</strong></li>
          <li>3. Tap <strong>"Add"</strong> to install the TEE ME YOU app</li>
        </ol>
      </CardContent>
    </Card>
  );

  const AndroidInstructions = () => (
    <Card className="mt-4 border-2 border-pink-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-bold text-gray-900 flex items-center">
            <Chrome className="mr-2 h-5 w-5" />
            Install on Android
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInstructions(false)}
            className="text-gray-400"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <ol className="text-sm text-gray-600 space-y-2">
          <li>1. Tap the <strong>menu</strong> (3 dots) in your browser</li>
          <li>2. Look for <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></li>
          <li>3. Tap to install the TEE ME YOU app</li>
        </ol>
      </CardContent>
    </Card>
  );

  if (showInstallPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
        <Card className="border-2 border-pink-200 shadow-lg bg-gradient-to-r from-white to-pink-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <img 
                  src="/site_files/CompanyLogo.jpg" 
                  alt="TEE ME YOU"
                  className="w-12 h-12 rounded-lg shadow-md"
                />
                <div>
                  <h3 className="font-bold text-gray-900">Install TEE ME YOU App</h3>
                  <p className="text-sm text-gray-600">Get the full mobile experience</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissInstallPrompt}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Smartphone className="h-4 w-4 text-pink-500" />
                <span>Faster loading</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Download className="h-4 w-4 text-pink-500" />
                <span>Offline access</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleInstall}
                className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Install App
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowInstructions(true)}
                className="text-pink-600 border-pink-200 hover:bg-pink-50"
              >
                How?
              </Button>
            </div>

            {showInstructions && (
              isIOSDevice ? <IOSInstructions /> : <AndroidInstructions />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Floating install button for mobile
  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      <Button
        onClick={handleInstall}
        size="lg"
        className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg rounded-full w-14 h-14 p-0"
      >
        <Download className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default MobileAppInstallButton;