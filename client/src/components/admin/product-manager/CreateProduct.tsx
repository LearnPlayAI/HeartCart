import React from 'react';
import { ProductForm } from './ProductForm';
import { useParams } from 'wouter';

export const CreateProduct: React.FC = () => {
  const params = useParams();
  const catalogId = params.catalogId ? parseInt(params.catalogId) : undefined;
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Create New Product</h1>
      <ProductForm editMode={false} catalogId={catalogId} />
    </div>
  );
};