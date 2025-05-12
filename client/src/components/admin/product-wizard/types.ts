/**
 * Product Wizard Types
 * 
 * This file contains all the TypeScript interfaces and types
 * used throughout the product wizard components.
 */

import { z } from 'zod';

/**
 * Wizard Step Identifiers
 */
export enum WizardStep {
  BASIC_INFO = 'basic-info',
  PRODUCT_IMAGES = 'product-images',
  ADDITIONAL_INFO = 'additional-info',
  REVIEW_SAVE = 'review-save'
}

/**
 * Wizard Step Configuration
 */
export interface StepConfig {
  id: WizardStep;
  label: string;
  description: string;
}

/**
 * Product Status Options
 */
export enum ProductStatus {
  DRAFT = 'draft',
  INACTIVE = 'inactive',
  ACTIVE = 'active'
}

/**
 * Product Wizard State - represents the complete wizard state
 */
export interface ProductWizardState {
  // Meta information
  currentStep: WizardStep;
  isLoading: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  validationErrors: Record<string, string[]>;
  
  // Catalog context
  catalogId: number | null;
  supplierId: number | null;
  
  // Form data
  productData: ProductWizardData;
}

/**
 * Product Data structure for the wizard
 */
export interface ProductWizardData {
  // Basic info step
  id?: number;
  name: string;
  slug: string;
  description: string;
  categoryId: number | null;
  price: number;
  costPrice: number;
  salePrice: number | null;
  discount: number;
  discountLabel: string;
  minimumPrice: number;
  
  // Product images step
  imageUrl: string | null;
  additionalImages: string[];
  uploadedImages: UploadedImage[];
  
  // Additional info step
  sku: string;
  brand: string;
  minimumOrder: number;
  tags: string[];
  shortDescription: string;
  
  // Product attributes
  selectedAttributes: ProductAttribute[];
  requiredAttributeIds: number[];
  
  // Sales information
  isFlashDeal: boolean;
  flashDealStart: Date | null;
  flashDealEnd: Date | null;
  freeShipping: boolean;
  isFeatured: boolean;
  specialSaleText: string;
  specialSaleStart: Date | null;
  specialSaleEnd: Date | null;
  
  // Product status
  status: ProductStatus;
}

/**
 * Image upload representation
 */
export interface UploadedImage {
  id?: number;
  url: string;
  isMain: boolean;
  file?: File;
  order: number;
  metadata?: Record<string, any>;
}

/**
 * Product Attribute representation
 */
export interface ProductAttribute {
  id: number;
  attributeId: number;
  attribute: {
    id: number;
    name: string;
    displayName: string;
    type: string;
  };
  options: AttributeOption[];
  isRequired: boolean;
}

/**
 * Attribute Option representation
 */
export interface AttributeOption {
  id: number;
  attributeId: number;
  value: string;
  displayValue: string;
  isSelected: boolean;
  color?: string;
}

/**
 * Wizard Context Actions
 */
export enum WizardActionType {
  SET_STEP = 'SET_STEP',
  UPDATE_PRODUCT_DATA = 'UPDATE_PRODUCT_DATA',
  SET_VALIDATION_ERRORS = 'SET_VALIDATION_ERRORS',
  SET_LOADING = 'SET_LOADING',
  SET_SUBMITTING = 'SET_SUBMITTING',
  RESET_WIZARD = 'RESET_WIZARD',
  SET_DIRTY = 'SET_DIRTY',
  INITIALIZE_WITH_CATALOG = 'INITIALIZE_WITH_CATALOG',
  INITIALIZE_WITH_PRODUCT = 'INITIALIZE_WITH_PRODUCT',
  ADD_UPLOADED_IMAGE = 'ADD_UPLOADED_IMAGE',
  REMOVE_UPLOADED_IMAGE = 'REMOVE_UPLOADED_IMAGE',
  SET_MAIN_IMAGE = 'SET_MAIN_IMAGE',
  REORDER_IMAGES = 'REORDER_IMAGES',
  ADD_PRODUCT_ATTRIBUTE = 'ADD_PRODUCT_ATTRIBUTE',
  REMOVE_PRODUCT_ATTRIBUTE = 'REMOVE_PRODUCT_ATTRIBUTE',
  TOGGLE_REQUIRED_ATTRIBUTE = 'TOGGLE_REQUIRED_ATTRIBUTE',
  UPDATE_ATTRIBUTE_OPTIONS = 'UPDATE_ATTRIBUTE_OPTIONS'
}

/**
 * Wizard Action Payloads
 */
export type WizardAction =
  | { type: WizardActionType.SET_STEP; payload: WizardStep }
  | { type: WizardActionType.UPDATE_PRODUCT_DATA; payload: Partial<ProductWizardData> }
  | { type: WizardActionType.SET_VALIDATION_ERRORS; payload: Record<string, string[]> }
  | { type: WizardActionType.SET_LOADING; payload: boolean }
  | { type: WizardActionType.SET_SUBMITTING; payload: boolean }
  | { type: WizardActionType.RESET_WIZARD }
  | { type: WizardActionType.SET_DIRTY; payload: boolean }
  | { type: WizardActionType.INITIALIZE_WITH_CATALOG; payload: { catalogId: number; supplierId: number } }
  | { type: WizardActionType.INITIALIZE_WITH_PRODUCT; payload: ProductWizardData }
  | { type: WizardActionType.ADD_UPLOADED_IMAGE; payload: UploadedImage }
  | { type: WizardActionType.REMOVE_UPLOADED_IMAGE; payload: string | number }
  | { type: WizardActionType.SET_MAIN_IMAGE; payload: string | number }
  | { type: WizardActionType.REORDER_IMAGES; payload: UploadedImage[] }
  | { type: WizardActionType.ADD_PRODUCT_ATTRIBUTE; payload: ProductAttribute }
  | { type: WizardActionType.REMOVE_PRODUCT_ATTRIBUTE; payload: number }
  | { type: WizardActionType.TOGGLE_REQUIRED_ATTRIBUTE; payload: { attributeId: number; isRequired: boolean } }
  | { type: WizardActionType.UPDATE_ATTRIBUTE_OPTIONS; payload: { attributeId: number; options: AttributeOption[] } };