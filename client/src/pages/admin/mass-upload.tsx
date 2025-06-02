import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLocation } from 'wouter';
import { MassUploadStep1 } from '@/components/admin/mass-upload/MassUploadStep1';
import { MassUploadStep2 } from '@/components/admin/mass-upload/MassUploadStep2';
import { MassUploadStep3 } from '@/components/admin/mass-upload/MassUploadStep3';
import { MassUploadStep4 } from '@/components/admin/mass-upload/MassUploadStep4';
import { MassUploadStep5 } from '@/components/admin/mass-upload/MassUploadStep5';
import { MassUploadStep6 } from '@/components/admin/mass-upload/MassUploadStep6';

export interface CSVProduct {
  sku: string;
  title: string;
  description: string;
  parentCategory: string;
  childCategory: string;
  attribute?: string;
  attributeOptions?: string;
  costPrice: number;
  salePrice: number;
  regularPrice: number;
  productUrl: string;
  // Validation results
  validationErrors?: string[];
  validationWarnings?: string[];
  isValid?: boolean;
  // Resolved category IDs
  parentCategoryId?: number;
  childCategoryId?: number;
  // Draft ID after creation
  draftId?: number;
  // Duplicate checking for draft records
  existingDraft?: {
    id: number;
    name: string;
    price: number;
    salePrice?: number;
    costPrice: number;
    draftStatus: string;
  };
  isDuplicate?: boolean;
  isSelected?: boolean;
  // Category assignment for products with missing categories
  needsCategoryAssignment?: boolean;
  assignedParentCategoryId?: number | null;
  assignedChildCategoryId?: number | null;
}

export interface MassUploadData {
  supplierId: number;
  supplierName: string;
  catalogId: number;
  catalogName: string;
  csvFile?: File;
  products: CSVProduct[];
  validationResults?: {
    hasErrors: boolean;
    hasWarnings: boolean;
    totalProducts: number;
    validProducts: number;
    invalidProducts: number;
  };
}

const STEPS = [
  { id: 1, title: 'Supplier & Catalog', description: 'Select supplier and catalog' },
  { id: 2, title: 'Upload CSV', description: 'Upload product data file' },
  { id: 3, title: 'Preview Products', description: 'Review product details' },
  { id: 4, title: 'Validation', description: 'Check for issues' },
  { id: 5, title: 'Adjustments', description: 'Fix any problems' },
  { id: 6, title: 'Upload Images', description: 'Add product images' },
];

export default function MassUploadPage() {
  const [location, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [massUploadData, setMassUploadData] = useState<MassUploadData>({
    supplierId: 0,
    supplierName: '',
    catalogId: 0,
    catalogName: '',
    products: [],
  });

  const handleBack = () => {
    navigate('/admin/product-management');
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateMassUploadData = (updates: Partial<MassUploadData>) => {
    setMassUploadData(prev => ({ ...prev, ...updates }));
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <MassUploadStep1
            data={massUploadData}
            onUpdate={updateMassUploadData}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <MassUploadStep2
            data={massUploadData}
            onUpdate={updateMassUploadData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 3:
        return (
          <MassUploadStep3
            data={massUploadData}
            onUpdate={updateMassUploadData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 4:
        return (
          <MassUploadStep4
            data={massUploadData}
            onUpdate={updateMassUploadData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 5:
        return (
          <MassUploadStep5
            data={massUploadData}
            onUpdate={updateMassUploadData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 6:
        return (
          <MassUploadStep6
            data={massUploadData}
            onUpdate={updateMassUploadData}
            onComplete={() => navigate('/admin/product-management')}
            onPrevious={handlePrevious}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Product Management
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Mass Product Upload</h1>
            <p className="text-muted-foreground">
              Upload multiple products from CSV file with guided validation
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      step.id === currentStep
                        ? 'border-primary bg-primary text-primary-foreground'
                        : step.id < currentStep
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        step.id === currentStep
                          ? 'text-primary'
                          : step.id < currentStep
                          ? 'text-green-600'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground mx-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Step Content */}
        <div className="min-h-[600px]">
          {renderCurrentStep()}
        </div>
      </div>
    </AdminLayout>
  );
}