/**
 * Product Wizard Types
 * 
 * This file contains all type definitions for the product wizard component.
 */

// Wizard Steps Enum
export enum WizardStep {
  BASIC_INFO = 0,
  PRODUCT_IMAGES = 1,
  ADDITIONAL_INFO = 2,
  REVIEW_SAVE = 3
}

// Action Types for Context Reducer
export enum WizardActionType {
  SET_STEP = 'SET_STEP',
  UPDATE_PRODUCT_DATA = 'UPDATE_PRODUCT_DATA',
  SET_CATALOG_ID = 'SET_CATALOG_ID',
  SET_SUPPLIER_ID = 'SET_SUPPLIER_ID',
  ADD_UPLOADED_IMAGE = 'ADD_UPLOADED_IMAGE',
  REMOVE_UPLOADED_IMAGE = 'REMOVE_UPLOADED_IMAGE',
  SET_MAIN_IMAGE = 'SET_MAIN_IMAGE',
  REORDER_IMAGES = 'REORDER_IMAGES',
  UPDATE_MULTIPLE_FIELDS = 'UPDATE_MULTIPLE_FIELDS',
  RESET_WIZARD = 'RESET_WIZARD'
}

// Interface for uploaded image
export interface UploadedImage {
  id?: number;
  url: string;
  objectKey?: string;   // Object key in storage
  file?: File;          // Used only for client-side temp file references
  isMain: boolean;
  order: number;
  metadata?: {
    size?: number;
    width?: number;
    height?: number;
    backgroundRemoved?: boolean;
    alt?: string;
    processedAt?: string;
  };
}

// Main product data interface
export interface ProductWizardData {
  id?: number;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  sku?: string;
  price: number;
  costPrice: number;
  markupPercentage?: string; // Added markup percentage for price calculation
  salePrice?: number | null;
  minimumPrice?: number;
  discount?: number;
  discountLabel?: string;
  minimumOrder?: number;
  stock?: number; // Added stock field which is required by the API
  imageUrl?: string;
  categoryId?: number;
  brand?: string;
  additionalImages?: string[];
  uploadedImages: UploadedImage[];
  tags?: string[];
  status?: 'active' | 'inactive' | 'draft';
  isFlashDeal?: boolean;
  flashDealStart?: Date | null;
  flashDealEnd?: Date | null;
  freeShipping?: boolean;
  isFeatured?: boolean;
  specialSaleText?: string;
  specialSaleStart?: Date | null;
  specialSaleEnd?: Date | null;
}

// Wizard State Interface
export interface WizardState {
  currentStep: WizardStep;
  productData: ProductWizardData;
  catalogId?: number;
  supplierId?: number;
  isFormDirty: boolean;
  isLoading: boolean;
}

// Wizard Action Interface
export interface WizardAction {
  type: WizardActionType;
  payload?: any;
}