import React from 'react';
import { EditProduct } from '@/components/admin/product-manager';
import AdminLayout from '@/components/admin/layout';

export default function ProductEditPage() {
  return (
    <AdminLayout>
      <EditProduct />
    </AdminLayout>
  );
}