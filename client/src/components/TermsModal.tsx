import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, CheckCircle } from "lucide-react";

interface TermsModalProps {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export function TermsModal({ open, onAccept, onCancel }: TermsModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const threshold = 10; // Allow some tolerance
    
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - threshold) {
      setHasScrolledToBottom(true);
    }
  };

  // Reset scroll state when modal opens
  useEffect(() => {
    if (open) {
      setHasScrolledToBottom(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-[#ff69b4]" />
            TeeMeYou Terms & Conditions
          </DialogTitle>
          <DialogDescription>
            Please read through our complete terms and conditions before creating your account.
            You must scroll to the bottom to accept.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea 
          className="flex-1 max-h-[60vh] px-4 py-2 border rounded-md"
          onScroll={handleScroll}
        >
          <div className="space-y-6 text-sm">
            {/* Introduction */}
            <section>
              <p className="text-xs text-muted-foreground mb-4">
                <strong>IMPORTANT:</strong> The below terms & conditions are binding to all registered customers who buy on this platform.
              </p>
              <h3 className="font-semibold text-base mb-2">1. Introduction</h3>
              <p>
                TeeMeYou.shop is an online retail store providing great products at discounted pricing. These Terms and Conditions govern your use 
                of our website and services. By accessing or using our services, you agree to be bound by these Terms and comply with the 
                South African Consumer Protection Act, 2008.
              </p>
            </section>

            {/* Product Availability */}
            <section>
              <h3 className="font-semibold text-base mb-2">2. Product Availability</h3>
              <div className="space-y-2">
                <p>
                  There are limited stock of all goods on offer. TeeMeYou will make all reasonable efforts to notify you when a product is no longer 
                  available once ordered. In these cases, TeeMeYou will provide you with:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Alternative product options</li>
                  <li>An estimated time of arrival on new stock arriving (goes on back order)</li>
                  <li>A credit on your store credit account</li>
                </ul>
                <p>
                  <strong>Important:</strong> Some items that are not available after they have been ordered will be credited to your store credit account. 
                  Some items ordered may not be available in the color or product attribute option selected. In this case, the value of the item 
                  purchased will be given back as store credit.
                </p>
                <p>
                  Don't get discouraged if a product you order is suddenly not available. There's a constant flow of inventory referring to popular 
                  and new stock. Your product might be available again in 3 to 6 weeks.
                </p>
              </div>
            </section>

            {/* Prices and Discounts */}
            <section>
              <h3 className="font-semibold text-base mb-2">3. Prices and Discounts</h3>
              <div className="space-y-2">
                <p>
                  All product prices as advertised on our website or as promoted in any customized promotional material, are subject to change without prior notice.
                </p>
                <p>
                  All promotions and % discount offers are offered at the discretion of TeeMeYou and may be revoked or changed at any time.
                </p>
              </div>
            </section>

            {/* Order Cancellation */}
            <section>
              <h3 className="font-semibold text-base mb-2">4. Order Processing and Cancellation</h3>
              <div className="space-y-2">
                <p>
                  <strong>4.1.</strong> Due to our quick processing time, we may NOT be able to cancel or modify an order after it has been submitted.
                </p>
                <p>
                  <strong>4.2.</strong> Orders cannot be canceled after they have been shipped. Once your order has been dispatched, 
                  the cancellation window has closed.
                </p>
                <p>
                  <strong>4.3.</strong> Please review your order carefully before finalizing your purchase.
                </p>
              </div>
            </section>

            {/* Quality Checking */}
            <section>
              <h3 className="font-semibold text-base mb-2">5. Quality Checking of Electronic Products</h3>
              <p>
                TeeMeYou quality checks all electronic products before they are sent out to customers. This is a basic quality check, making sure 
                that the product turns on, charges, has basic function, and has no noticeable damage.
              </p>
            </section>

            {/* Warranty and Damages */}
            <section>
              <h3 className="font-semibold text-base mb-2">6. Damages and Returns</h3>
              <div className="space-y-2">
                <p>Our general warranty on all items:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Products with a purchase price less than R500:</strong> 7-day warranty from date of delivery</li>
                  <li><strong>Products with a purchase price of R500 or more:</strong> 30-day warranty from date of delivery</li>
                </ul>
                
                <p className="mt-3"><strong>Upon receiving your order:</strong></p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Please make sure you received what you ordered and check that everything is working as it should</li>
                  <li>If a product supplied is the wrong product or if the product is received damaged, contact us at <span className="text-[#ff69b4] font-medium">sales@teemeyou.shop</span></li>
                  <li>For any returns, please email the details of the product, including pictures where applicable, and reference your order number as found on the My Orders page</li>
                </ol>
                
                <p className="mt-3">
                  All products returned to TeeMeYou must be returned unused, with all relevant parts, and in the original packaging. 
                  After we receive the wrong/damaged product back, we will inspect and determine the way forward.
                </p>
                
                <p>
                  <strong>Note:</strong> Damaged product in this document refers to manufacturing faults only. Damages due to accidental or customer neglect do not apply.
                </p>
                
                <p>
                  TeeMeYou is a third party reseller of goods and cannot be directly held accountable for any injuries or damages a product may cause 
                  due to product malfunctions or through wrong/misuse on the customer's side.
                </p>
              </div>
            </section>

            {/* Shipping Information */}
            <section>
              <h3 className="font-semibold text-base mb-2">7. Pick-up and Shipping Information</h3>
              <div className="space-y-2">
                <p>TeeMeYou offers PUDO locker delivery throughout South Africa. Remember to select the right shipping option at checkout.</p>
                
                <p><strong>Important shipping notes:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>It is your responsibility to choose the correct shipping method</li>
                  <li>The customer is responsible for ensuring the delivery address is correct</li>
                  <li>Items will normally be delivered within 5-7 working days after payment was received unless otherwise stated</li>
                </ul>
              </div>
            </section>

            {/* Product Descriptions & Disclaimers */}
            <section>
              <h3 className="font-semibold text-base mb-2">8. Color and Size Disclaimer</h3>
              <div className="space-y-3">
                <p>
                  The details of products, descriptions, or specifications (for example weight, color, size, etc.) are only approximate values. 
                  There may be slight variations in product design and pattern as compared to the images shown on our website.
                </p>
                
                <div>
                  <h4 className="font-medium mb-1">Color Disclaimer:</h4>
                  <p>
                    Due to variations in monitor settings and display output of digital photography, we assume no responsibility and make no guarantees 
                    regarding color matches of products. We cannot guarantee that the colors displayed on our website will exactly match the color of the product.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Size Disclaimer:</h4>
                  <p>
                    We make every effort to provide accurate information regarding product sizing and dimensions. However, due to the nature of the 
                    manufacturing process, product sizing may vary slightly from time to time. Please always allow for 3-5 cm difference.
                  </p>
                </div>
              </div>
            </section>

            {/* Legal Terms */}
            <section>
              <h3 className="font-semibold text-base mb-2">9. Legal Terms</h3>
              <div className="space-y-2">
                <p>
                  We reserve the right to refuse orders, cancel any sale, and terminate accounts at our discretion.
                </p>
                <p>
                  This website is governed by the laws of South Africa and TeeMeYou chooses as its domicilium citandi et executandi for all purposes 
                  under this agreement, whether in respect of court process, notice, or other documents or communication of whatsoever nature.
                </p>
                <p>
                  TeeMeYou may, in its sole discretion, change this agreement or any part thereof at any time without notice.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h3 className="font-semibold text-base mb-2">10. Contact Information</h3>
              <div className="space-y-1">
                <p>For questions about these Terms & Conditions or any issues:</p>
                <p className="ml-4">
                  <strong>Email:</strong> <span className="text-[#ff69b4] font-medium">sales@teemeyou.shop</span>
                </p>
                <p className="ml-4">
                  <strong>Website:</strong> <span className="text-[#ff69b4] font-medium">www.teemeyou.shop</span>
                </p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Last updated: July 2, 2025
              </p>
            </section>

            {/* Bottom indicator */}
            <div className="flex justify-center py-4">
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">You've reached the end of our Terms & Conditions</span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel Registration
          </Button>
          <Button 
            onClick={onAccept}
            disabled={!hasScrolledToBottom}
            className="bg-[#ff69b4] hover:bg-[#e91e63] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hasScrolledToBottom ? "Accept & Register" : "Scroll to Bottom to Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}