import React from 'react';
import { Button } from '@/components/ui/button';
import { Apple, PlayCircle } from 'lucide-react';
import { usePwa } from '@/hooks/use-pwa';

const AppBanner = () => {
  const { installPwa, isInstallable } = usePwa();
  
  if (!isInstallable) {
    return null;
  }
  
  return (
    <section className="mb-8 bg-gradient-to-r from-[#FF69B4] to-[#FF1493] rounded-lg shadow-md overflow-hidden">
      <div className="flex flex-col md:flex-row items-center">
        <div className="p-6 md:p-8 flex-1">
          <h2 className="text-white text-2xl font-bold mb-2">Shop Anytime, Anywhere!</h2>
          <p className="text-white/90 mb-4">
            Install our app for a seamless shopping experience with exclusive app-only deals.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={installPwa} className="bg-black text-white hover:bg-gray-900">
              <Apple className="mr-2 h-4 w-4" />
              <div className="text-left">
                <div className="text-xs">Install</div>
                <div className="font-bold">Web App</div>
              </div>
            </Button>
            <Button className="bg-black text-white hover:bg-gray-900">
              <PlayCircle className="mr-2 h-4 w-4" />
              <div className="text-left">
                <div className="text-xs">Coming Soon to</div>
                <div className="font-bold">Google Play</div>
              </div>
            </Button>
          </div>
        </div>
        <div className="md:w-1/3 p-4">
          <img 
            src="https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=650&q=80" 
            alt="Shopping app on smartphone" 
            className="w-full h-auto rounded-xl shadow-lg"
          />
        </div>
      </div>
    </section>
  );
};

export default AppBanner;
