import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, X } from "lucide-react";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { useState } from "react";

export function UpdateNotification() {
  const [dismissed, setDismissed] = useState(false);
  const { updateAvailable, isChecking, applyUpdate } = useAppUpdate();

  if (!updateAvailable || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1 mr-2">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Update Available
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              A new version is ready to install
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={applyUpdate}
              disabled={isChecking}
              className="text-xs px-2 py-1 h-auto"
            >
              {isChecking ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                "Update"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="h-auto p-1 text-blue-600 hover:text-blue-800"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}