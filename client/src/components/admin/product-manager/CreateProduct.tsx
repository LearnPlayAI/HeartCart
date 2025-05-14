import React from 'react';
import { ProductForm } from './ProductForm';

export const CreateProduct: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Create New Product</h1>
      <ProductForm editMode={false} />
    </div>
  );
};