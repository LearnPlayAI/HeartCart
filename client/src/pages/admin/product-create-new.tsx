import React from 'react';
import { CreateProduct } from '@/components/admin/product-manager';
import AdminLayout from '@/components/admin/layout';

export default function ProductCreatePage() {
  return (
    <AdminLayout>
      <CreateProduct />
    </AdminLayout>
  );
}