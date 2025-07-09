import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from '@/components/ui/button';
import { ChevronDown, Shield, Palette } from 'lucide-react';

interface DisclaimersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  productName?: string;
}

export default function DisclaimersModal({ 
  open, 
  onOpenChange, 
  onAccept, 
  productName 
}: DisclaimersModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] lg:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Important Information</DialogTitle>
          <DialogDescription>
            Please review the following important information before proceeding to checkout.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Product Warranty Disclaimer */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-[#FF69B4]" />
                Product warranty
              </div>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 text-sm text-gray-600">
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <p>• Products with a purchase price less than R500, has a 5 day warranty</p>
                <p>• Products with a purchase price of R500 or more, has a 15 day warranty</p>
                <p>• In cases where products need to be returned, please email us with your return request to sales@teemeyou.shop. Include your order number in the mail Title and a detailed description of the issue in the mail body.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Colour and Size Disclaimer */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <Palette className="h-4 w-4 mr-2 text-[#FF69B4]" />
                Colour and size disclaimer
              </div>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 text-sm text-gray-600">
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <p>The details of the products, descriptions or specifications (for example weight, colour, size, etc.) are only approximate values. There may be slight variations in the product design and pattern as compared to the images shown on our website.</p>
                
                <div>
                  <p className="font-medium text-gray-700 mb-1">Colour Disclaimer:</p>
                  <p>Due to variations in monitor settings and display output of digital photography, we assume no responsibility and makes no guarantees regarding colour matches of products. We cannot guarantee that the colours displayed on our website will exactly match the colour of the product.</p>
                </div>
                
                <div>
                  <p className="font-medium text-gray-700 mb-1">Size Disclaimer:</p>
                  <p>We make every effort in providing as accurate information as possible in regard to the product sizing and dimensions. However, due to the nature of the manufacturing process, from time to time product sizing may vary slightly. Please always allow for 3-5 cm difference.</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={onAccept}
            className="w-full sm:w-auto bg-[#FF69B4] hover:bg-[#FF1493] text-white"
          >
            Accept & Checkout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}