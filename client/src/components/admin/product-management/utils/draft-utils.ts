/**
 * Draft Utilities
 * 
 * This file contains utility functions for working with product drafts.
 */

import { ProductDraft } from '../DraftContext';

/**
 * Generate a slug from a product name
 * @param name The product name
 * @returns A URL-friendly slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Generate a random SKU
 * @param prefix Optional prefix for the SKU
 * @returns A random SKU string
 */
export function generateSku(prefix: string = ''): string {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const formattedPrefix = prefix 
    ? prefix.substr(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') 
    : '';
  
  return `${formattedPrefix}${formattedPrefix ? '-' : ''}${randomPart}`;
}

/**
 * Calculate discount percentage between regular and sale price
 * @param regularPrice The regular price
 * @param salePrice The sale price
 * @returns The discount percentage or 0 if invalid
 */
export function calculateDiscountPercentage(regularPrice?: number, salePrice?: number): number {
  if (!regularPrice || !salePrice || regularPrice <= 0 || salePrice >= regularPrice) {
    return 0;
  }
  
  return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
}

/**
 * Calculate price based on cost and markup
 * @param costPrice The cost price
 * @param markupPercentage The markup percentage
 * @returns The calculated regular price
 */
export function calculatePrice(costPrice: number, markupPercentage: number): number {
  if (!costPrice || !markupPercentage) {
    return 0;
  }
  
  return costPrice * (1 + markupPercentage / 100);
}

/**
 * Check if a draft is valid for publishing
 * @param draft The product draft
 * @returns An object with validation status and error messages
 */
export function validateDraft(draft: ProductDraft | null): { 
  valid: boolean; 
  errors: string[];
  steps: Record<string, boolean>;
} {
  if (!draft) {
    return { 
      valid: false, 
      errors: ['Draft not found'], 
      steps: {} 
    };
  }
  
  const errors: string[] = [];
  const steps: Record<string, boolean> = {
    'basic-info': true,
    'images': true,
    'pricing': true,
    'attributes': true,
    'promotions': true
  };
  
  // Basic info validation
  if (!draft.name) {
    errors.push('Product name is required');
    steps['basic-info'] = false;
  }
  
  if (!draft.slug) {
    errors.push('Product slug is required');
    steps['basic-info'] = false;
  }
  
  if (!draft.categoryId) {
    errors.push('Product category is required');
    steps['basic-info'] = false;
  }
  
  // Pricing validation
  if (!draft.regularPrice || draft.regularPrice <= 0) {
    errors.push('Regular price is required and must be greater than 0');
    steps['pricing'] = false;
  }
  
  // Sale price validation
  if (draft.onSale && (!draft.salePrice || draft.salePrice >= draft.regularPrice)) {
    errors.push('Sale price must be lower than regular price when on sale');
    steps['pricing'] = false;
  }
  
  // Flash deal validation
  if (draft.isFlashDeal && (!draft.flashDealEnd || new Date(draft.flashDealEnd) <= new Date())) {
    errors.push('Flash deal end date must be in the future');
    steps['promotions'] = false;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    steps
  };
}

/**
 * Prepare draft data for API submission
 * @param draft The product draft
 * @returns A cleaned-up draft object ready for submission
 */
export function prepareDraftForSubmission(draft: ProductDraft): Partial<ProductDraft> {
  // Make a copy of the draft
  const submissionData = { ...draft };
  
  // Remove non-persistable properties
  delete submissionData.createdAt;
  delete submissionData.lastModified;
  
  // Clean up dates for API submission
  if (submissionData.specialSaleStart instanceof Date) {
    submissionData.specialSaleStart = submissionData.specialSaleStart.toISOString();
  }
  
  if (submissionData.specialSaleEnd instanceof Date) {
    submissionData.specialSaleEnd = submissionData.specialSaleEnd.toISOString();
  }
  
  if (submissionData.flashDealEnd instanceof Date) {
    submissionData.flashDealEnd = submissionData.flashDealEnd.toISOString();
  }
  
  return submissionData;
}