import React from 'react';
import { RefreshCw, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppUpdate } from '@/hooks/useAppUpdate';

export function UpdateNotification() {
  const { updateAvailable, isUpdating, applyUpdate, dismissUpdate } = useAppUpdate();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className="border-[#FF1493] bg-white shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Download className="h-5 w-5 text-[#FF1493]" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                New Update Available
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                A new version of TeeMeYou is ready to install with improvements and bug fixes.
              </p>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={applyUpdate}
                  disabled={isUpdating}
                  className="bg-[#FF1493] hover:bg-[#E91E63] text-white text-xs px-3 py-1 h-auto"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-1" />
                      Update Now
                    </>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={dismissUpdate}
                  disabled={isUpdating}
                  className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1 h-auto"
                >
                  Later
                </Button>
              </div>
            </div>
            
            <button
              onClick={dismissUpdate}
              disabled={isUpdating}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UpdateNotification;