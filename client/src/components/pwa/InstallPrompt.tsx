import React from 'react';
import { X, Download, Smartphone, Zap, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const InstallPrompt: React.FC = () => {
  const { showInstallPrompt, installApp, dismissInstallPrompt } = usePWAInstall();

  if (!showInstallPrompt) return null;

  const handleInstall = async () => {
    const success = await installApp();
    if (!success) {
      // Show manual install instructions for browsers that don't support the prompt
      alert('To install this app, look for "Add to Home Screen" or "Install" in your browser menu.');
    }
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="border-2 border-pink-200 shadow-lg bg-gradient-to-r from-white to-pink-50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <img 
                src="/site_files/CompanyLogo.jpg" 
                alt="TEE ME YOU"
                className="w-10 h-10 rounded-lg"
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

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center">
              <Zap className="h-5 w-5 text-pink-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Faster Loading</p>
            </div>
            <div className="text-center">
              <Smartphone className="h-5 w-5 text-pink-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Offline Access</p>
            </div>
            <div className="text-center">
              <Bell className="h-5 w-5 text-pink-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Push Alerts</p>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleInstall}
              className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
            <Button
              variant="outline"
              onClick={dismissInstallPrompt}
              className="px-4"
            >
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallPrompt;