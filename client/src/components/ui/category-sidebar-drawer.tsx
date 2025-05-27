import * as React from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CategorySidebar } from "@/components/ui/category-sidebar";

interface CategorySidebarDrawerProps {
  className?: string;
  onCategorySelect?: () => void;
}

export function CategorySidebarDrawer({ className, onCategorySelect }: CategorySidebarDrawerProps) {
  const [open, setOpen] = React.useState(false);
  
  // Close the drawer when a category is selected
  const handleCategorySelect = () => {
    setOpen(false);
    // Call external handler if provided
    if (onCategorySelect) {
      onCategorySelect();
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="md:hidden text-white hover:bg-white/20"
          aria-label="Open categories menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-80">
        <CategorySidebar onCategorySelect={handleCategorySelect} />
      </SheetContent>
    </Sheet>
  );
}