import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DraftDashboard from '@/components/admin/product-management/DraftDashboard';
import { PublishedProducts } from '@/components/admin/product-management/PublishedProducts';
import { AdminLayout } from '@/components/admin/layout';

const ProductManagementPage: React.FC = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Product Management</h2>
          <p className="text-muted-foreground">
            Create, edit, and publish products with the advanced product management system
          </p>
        </div>
      
        <Tabs defaultValue="drafts" className="space-y-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
            <TabsTrigger value="drafts">Product Drafts</TabsTrigger>
            <TabsTrigger value="published">Published Products</TabsTrigger>
          </TabsList>
          
          <TabsContent value="drafts" className="space-y-4">
            <DraftDashboard />
          </TabsContent>
          
          <TabsContent value="published" className="space-y-4">
            <PublishedProducts />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default ProductManagementPage;