import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import Logo from '@/components/ui/logo';
import { usePwa } from '@/hooks/use-pwa';

const InstallBanner = () => {
  const [dismissed, setDismissed] = React.useState(false);
  const { installPwa, isInstallable } = usePwa();
  
  if (!isInstallable || dismissed) {
    return null;
  }
  
  return (
    <div className="app-install-banner mb-4 bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
      <div className="flex items-center">
        <Logo className="h-12 w-12 rounded-xl mr-3" />
        <div>
          <h3 className="font-bold text-gray-800">TEE ME YOU App</h3>
          <p className="text-sm text-gray-600">Install our app for a better experience</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          onClick={() => setDismissed(true)}
          variant="ghost"
          size="icon"
          className="text-gray-400"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button 
          onClick={installPwa}
          className="bg-[#FF69B4] hover:bg-[#FF1493] text-white"
        >
          <Download className="mr-2 h-4 w-4" />
          Install
        </Button>
      </div>
    </div>
  );
};

export default InstallBanner;
