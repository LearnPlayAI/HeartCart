import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DraftDashboard from '@/components/admin/product-management/DraftDashboard';

const ProductManagementPage: React.FC = () => {
  return (
    <div className="container py-6 md:py-10 max-w-screen-xl space-y-6">
      <Tabs defaultValue="drafts" className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="drafts">Product Drafts</TabsTrigger>
          <TabsTrigger value="published">Published Products</TabsTrigger>
        </TabsList>
        
        <TabsContent value="drafts" className="space-y-4">
          <DraftDashboard />
        </TabsContent>
        
        <TabsContent value="published" className="space-y-4">
          <div className="bg-muted/40 border rounded-lg p-8 text-center">
            <h3 className="text-lg font-medium">Published Products View</h3>
            <p className="text-muted-foreground mt-2">
              This view will show all published products and their performance metrics.
              Feature coming soon in a future update.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductManagementPage;