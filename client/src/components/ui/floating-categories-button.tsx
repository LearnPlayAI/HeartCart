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
            className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 bg-gradient-to-r from-[#FF69B4] to-[#FF1493] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95"
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