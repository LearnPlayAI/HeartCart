import React, { useState } from 'react';
import { Menu, Grid3X3 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CategorySidebar } from "@/components/ui/category-sidebar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface FloatingCategoriesButtonProps {
  className?: string;
}

export function FloatingCategoriesButton({ className }: FloatingCategoriesButtonProps) {
  const [open, setOpen] = useState(false);
  
  // Close the drawer when a category is selected
  const handleCategorySelect = () => {
    setOpen(false);
  };
  
  return (
    <div className={`md:hidden ${className}`}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-20 right-4 z-50 flex items-center space-x-2 bg-[#EE00DA] text-white px-5 py-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 active:scale-95 border-4 border-white/30 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, #EE00DA 0%, #B800A3 100%)',
              boxShadow: '0 10px 25px rgba(238, 0, 218, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)'
            }}
            aria-label="Open categories menu"
          >
            <Grid3X3 className="h-5 w-5" />
            <span className="font-semibold text-sm">Categories</span>
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-80 h-full flex flex-col">
          <VisuallyHidden>
            <SheetHeader>
              <SheetTitle>Categories Menu</SheetTitle>
              <SheetDescription>Browse and select from product categories</SheetDescription>
            </SheetHeader>
          </VisuallyHidden>
          <CategorySidebar onCategorySelect={handleCategorySelect} className="h-full" />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default FloatingCategoriesButton;