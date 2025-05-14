/**
 * Product Manager Types
 * Type definitions for the new product manager wizard system
 */

// Core product data interfaces
export interface ProductDraftData {
  id?: number;
  name: string;
  description: string;
  slug: string;
  categoryId: number | null;
  regularPrice: number | null;
  salePrice: number | null;
  costPrice: number | null;
  onSale: boolean;
  stockLevel: number;
  isActive: boolean;
  isFeatured: boolean;
  attributes: ProductAttribute[];
  imageUrls: string[];
  imageObjectKeys: string[];
  mainImageIndex: number;
  discountLabel: string;
  specialSaleText: string;
  specialSaleStart: string | null;
  specialSaleEnd: string | null;
  isFlashDeal: boolean;
  flashDealEnd: string | null;
  dimensions: string;
  weight: string;
  catalogId: number | null;
  supplierId: number | null;
  completedSteps: string[];
  draftStatus: 'draft' | 'review' | 'ready';
  wizardProgress: Record<string, boolean>;
  originalProductId?: number;
  hasBackgroundRemoved?: boolean; // For image background removal option
}

export interface ProductAttribute {
  attributeId: number;
  value: string | string[] | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number | null;
  imageUrl?: string;
}

export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

export interface Catalog {
  id: number;
  name: string;
  description?: string;
}

// Step-specific interfaces and enums
export enum WizardStepId {
  BasicInfo = 'basic-info',
  Images = 'images',
  Details = 'details',
  Review = 'review'
}

export type StepNumberMap = {
  [key in WizardStepId]: number;
};

export const STEP_NUMBER_MAP: StepNumberMap = {
  [WizardStepId.BasicInfo]: 0,
  [WizardStepId.Images]: 1,
  [WizardStepId.Details]: 2,
  [WizardStepId.Review]: 3
};

export interface WizardStep {
  id: WizardStepId;
  label: string;
  description: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { 
    id: WizardStepId.BasicInfo, 
    label: 'Basic Information',
    description: 'Enter the essential product information'
  },
  { 
    id: WizardStepId.Images, 
    label: 'Product Images',
    description: 'Upload and manage product images'
  },
  { 
    id: WizardStepId.Details, 
    label: 'Additional Details',
    description: 'Set inventory, shipping, and other details'
  },
  { 
    id: WizardStepId.Review, 
    label: 'Review & Save',
    description: 'Review all information before publishing'
  }
];

// Component prop interfaces
export interface StepComponentProps {
  draft: ProductDraftData;
  onSave: (data: Partial<ProductDraftData>, advance?: boolean) => void;
  onNext: () => void;
  isLoading: boolean;
}

export interface ProductFormSharedProps {
  editMode: boolean;
  productId?: number;
}