import React from 'react';
import { DraftCreationTest } from '@/components/admin/product-wizard/test/DraftCreationTest';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Helmet } from 'react-helmet';

export function DraftTestPage() {
  return (
    <AdminLayout>
      <Helmet>
        <title>Product Draft Testing | TeeMeYou Admin</title>
      </Helmet>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Product Draft System Testing</h1>
        <p className="mb-6 text-gray-600">
          Use this page to test the product draft creation functionality.
        </p>
        
        <DraftCreationTest />
      </div>
    </AdminLayout>
  );
}

export default DraftTestPage;