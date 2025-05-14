/**
 * Product Management Module
 * 
 * This file exports all components and utilities for the product management system.
 */

// Main Components
export { ProductWizard } from './ProductWizard';
export { DraftProvider, useDraft } from './DraftContext';
export { WizardNavigation } from './WizardNavigation';

// Step Components
export { default as BasicInfoStep } from './steps/BasicInfoStep';
export { default as ImagesStep } from './steps/ImagesStep';
export { default as PricingStep } from './steps/PricingStep';
export { default as AttributesStep } from './steps/AttributesStep';
export { default as PromotionsStep } from './steps/PromotionsStep';
export { default as ReviewStep } from './steps/ReviewStep';

// Utility Components
export { AiDescriptionSuggestions } from './components/AiDescriptionSuggestions';
export { AiSeoSuggestions } from './components/AiSeoSuggestions';

// Utilities
export * from './utils/draft-utils';
export * from './utils/ai-utils';