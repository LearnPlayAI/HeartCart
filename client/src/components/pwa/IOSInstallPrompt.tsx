import { useState } from 'react';
import { X, Share, Plus, Smartphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface IOSInstallPromptProps {
  onDismiss: () => void;
  className?: string;
}

export function IOSInstallPrompt({ onDismiss, className = '' }: IOSInstallPromptProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      icon: <Share className="w-6 h-6 text-blue-500" />,
      title: "Tap Share Button",
      description: "Look for the share icon in Safari's bottom toolbar and tap it"
    },
    {
      icon: <Plus className="w-6 h-6 text-green-500" />,
      title: "Add to Home Screen",
      description: "Scroll down and tap 'Add to Home Screen' from the menu"
    },
    {
      icon: <Smartphone className="w-6 h-6 text-purple-500" />,
      title: "Enjoy the App",
      description: "Find TEE ME YOU on your home screen and tap to open as an app"
    }
  ];

  return (
    <Card className={`fixed bottom-4 left-4 right-4 z-50 shadow-lg border-2 border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Install TEE ME YOU App</h3>
              <p className="text-sm text-gray-600">Get the full mobile app experience</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                index === currentStep 
                  ? 'bg-white shadow-sm border border-pink-200' 
                  : 'opacity-70'
              }`}
            >
              <div className="mt-0.5">{step.icon}</div>
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-900">{step.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{step.description}</p>
              </div>
              {index === currentStep && (
                <div className="w-2 h-2 rounded-full bg-pink-500 mt-2"></div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-pink-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="h-8 px-3 text-xs"
              >
                Previous
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="h-8 px-3 text-xs bg-pink-500 hover:bg-pink-600"
              >
                Next
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onDismiss}
                className="h-8 px-3 text-xs bg-green-500 hover:bg-green-600"
              >
                Got it!
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}