/**
 * Utility functions for the product manager
 */
import { ProductDraftData } from '../types';

/**
 * Formats a currency value as ZAR (South African Rand)
 */
export const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return 'R0.00';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2
  }).format(numValue);
};

/**
 * Converts a date string to a formatted date
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Validates a product draft and returns missing fields
 */
export const validateProductDraft = (draft: ProductDraftData): string[] => {
  const missingFields = [];
  
  if (!draft.name || draft.name.trim() === '') {
    missingFields.push('Product Name');
  }
  
  if (!draft.description || draft.description.trim() === '') {
    missingFields.push('Description');
  }
  
  if (!draft.categoryId) {
    missingFields.push('Category');
  }
  
  if (!draft.regularPrice) {
    missingFields.push('Regular Price');
  }
  
  if (!draft.costPrice) {
    missingFields.push('Cost Price');
  }
  
  if (!draft.imageUrls || draft.imageUrls.length === 0) {
    missingFields.push('Product Images');
  }
  
  return missingFields;
};

/**
 * Calculates the completion percentage of a product draft
 */
export const calculateCompletionPercentage = (draft: ProductDraftData): number => {
  const steps = draft.wizardProgress || {};
  const totalSteps = Object.keys(steps).length || 4; // Default to 4 steps if not defined
  const completedSteps = Object.values(steps).filter(Boolean).length;
  
  return Math.round((completedSteps / totalSteps) * 100);
};

/**
 * Creates a slug from a title
 */
export const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
};

/**
 * Formats a product type for display
 */
export const formatProductType = (type: string): string => {
  switch (type) {
    case 'physical':
      return 'Physical Product';
    case 'digital':
      return 'Digital Product';
    case 'service':
      return 'Service';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};