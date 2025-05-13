/**
 * ProductWizardContext
 * 
 * This module provides a React context to manage the state for the product creation wizard.
 * It handles multi-step form validation, navigation between steps, and state persistence.
 */

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { generateSlug, generateSku } from '@/utils/string-utils';

// Calculate markup percentage based on cost and selling price
function calculateMarkupPercentage(costPrice: number, sellingPrice: number): number {
  if (!costPrice || costPrice <= 0 || !sellingPrice) return 40; // Default markup
  const markup = ((sellingPrice - costPrice) / costPrice) * 100;
  return Math.round(markup);
}

// Define the steps in the wizard
export type WizardStep = 'basic-info' | 'images' | 'additional-info' | 'review';

// Define the state interface for the wizard
interface ProductWizardState {
  // Product ID (only set when editing existing product)
  productId?: number;
  
  // Core product info
  name: string;
  slug: string;
  sku: string;
  description: string;
  brand: string;
  categoryId: number | null;
  isActive: boolean;
  isFeatured: boolean;
  
  // Pricing
  costPrice: number;
  regularPrice: number;
  salePrice: number | null;
  onSale: boolean;
  markupPercentage: number;
  
  // Images
  imageUrls: string[];
  imageObjectKeys: string[];
  mainImageIndex: number;
  
  // Inventory
  stockLevel: number;
  lowStockThreshold: number;
  backorderEnabled: boolean;
  
  // Attributes
  attributes: any[];
  attributeValues: any[]; // For attribute-based pricing, weight, dimensions
  
  // Product details
  supplier: string | null;
  weight: number | null;
  dimensions: string | null;
  
  // Sales & Promotions
  discountLabel: string | null;
  specialSaleText: string | null;
  specialSaleStart: Date | null;
  specialSaleEnd: Date | null;
  
  // Shipping
  taxable: boolean;
  taxClass: string;
  shippingRequired: boolean;
  shippingWeight: number | null;
  shippingDimensions: {
    length: number | null;
    width: number | null;
    height: number | null;
  };
  
  // SEO
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  
  // Wizard state
  currentStep: WizardStep;
  completedSteps: Record<WizardStep, boolean>;
  validSteps: Record<WizardStep, boolean>;
  
  // Catalog context
  catalogId: number | null;
  catalogName: string | null;
}

// Initial state for the wizard
const defaultInitialState: ProductWizardState = {
  // Product ID (only set when editing)
  productId: undefined,
  
  // Core product info
  name: '',
  slug: '',
  sku: '',
  description: '',
  brand: '',
  categoryId: null,
  isActive: true,
  isFeatured: false,
  
  // Pricing
  costPrice: 0,
  regularPrice: 0,
  salePrice: null,
  onSale: false,
  markupPercentage: 40, // Default markup
  
  // Images
  imageUrls: [],
  imageObjectKeys: [],
  mainImageIndex: 0,
  
  // Inventory
  stockLevel: 0,
  lowStockThreshold: 5,
  backorderEnabled: false,
  
  // Attributes
  attributes: [],
  attributeValues: [], // For attribute-based pricing config
  
  // Product details
  supplier: null,
  weight: null,
  dimensions: null,
  
  // Sales & Promotions
  discountLabel: null,
  specialSaleText: null,
  specialSaleStart: null,
  specialSaleEnd: null,
  
  // Shipping
  taxable: true,
  taxClass: 'standard',
  shippingRequired: true,
  shippingWeight: null,
  shippingDimensions: {
    length: null,
    width: null,
    height: null,
  },
  
  // SEO
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  
  // Wizard state
  currentStep: 'basic-info',
  completedSteps: {
    'basic-info': false,
    'images': false,
    'additional-info': false,
    'review': false,
  },
  validSteps: {
    'basic-info': false,
    'images': false,
    'additional-info': false,
    'review': false,
  },
  
  // Catalog context
  catalogId: null,
  catalogName: null,
};

// Action types for the reducer
type ProductWizardAction =
  | { type: 'SET_FIELD'; field: keyof ProductWizardState; value: any }
  | { type: 'SET_CURRENT_STEP'; step: WizardStep }
  | { type: 'MARK_STEP_COMPLETE'; step: WizardStep }
  | { type: 'MARK_STEP_VALID'; step: WizardStep; isValid: boolean }
  | { type: 'ADD_IMAGE'; url: string; objectKey: string }
  | { type: 'REMOVE_IMAGE'; index: number }
  | { type: 'SET_MAIN_IMAGE'; index: number }
  | { type: 'REORDER_IMAGES'; newOrder: number[] }
  | { type: 'ADD_ATTRIBUTE'; attribute: any }
  | { type: 'UPDATE_ATTRIBUTE'; index: number; attribute: any }
  | { type: 'REMOVE_ATTRIBUTE'; index: number }
  | { type: 'RESET_WIZARD' };

// Reducer function for state management
const productWizardReducer = (
  state: ProductWizardState,
  action: ProductWizardAction
): ProductWizardState => {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        [action.field]: action.value,
      };
    
    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.step,
      };
    
    case 'MARK_STEP_COMPLETE':
      return {
        ...state,
        completedSteps: {
          ...state.completedSteps,
          [action.step]: true,
        },
      };
    
    case 'MARK_STEP_VALID':
      return {
        ...state,
        validSteps: {
          ...state.validSteps,
          [action.step]: action.isValid,
        },
      };
    
    case 'ADD_IMAGE': {
      // Enhanced URL normalization with thorough checks
      let normalizedUrl = action.url || '';
      
      // Step 1: Strip origin if it's already included to avoid double origins
      if (typeof window !== 'undefined') {
        const originPattern = new RegExp(`^${window.location.origin}`);
        normalizedUrl = normalizedUrl.replace(originPattern, '');
      }
      
      // Step 2: Make absolute path if it's relative
      if (!normalizedUrl.startsWith('http') && !normalizedUrl.startsWith('data:')) {
        // Ensure it has a leading slash
        normalizedUrl = normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`;
        
        // Add origin if in browser context
        if (typeof window !== 'undefined') {
          normalizedUrl = `${window.location.origin}${normalizedUrl}`;
        }
      }
      
      // Handle special cases of API URL paths
      if (normalizedUrl.includes('/api/files/temp/')) {
        // Standardize temp file URL format
        const fileName = normalizedUrl.split('/').pop();
        if (fileName && typeof window !== 'undefined') {
          normalizedUrl = `${window.location.origin}/temp/${fileName}`;
        }
      }
      
      console.log('Adding image to context with normalized URL:', normalizedUrl);
      console.log('Object key:', action.objectKey);
      
      return {
        ...state,
        imageUrls: [...state.imageUrls, normalizedUrl],
        imageObjectKeys: [...state.imageObjectKeys, action.objectKey || ''],
        // If this is the first image, automatically mark it as the main image
        ...(state.imageUrls.length === 0 ? { mainImageIndex: 0 } : {})
      };
    }
    
    case 'REMOVE_IMAGE': {
      const newUrls = [...state.imageUrls];
      const newKeys = [...state.imageObjectKeys];
      newUrls.splice(action.index, 1);
      newKeys.splice(action.index, 1);
      
      // If we're removing the main image, reset main index to 0 if there are still images
      let mainIndex = state.mainImageIndex;
      if (action.index === state.mainImageIndex) {
        mainIndex = newUrls.length > 0 ? 0 : -1;
      } else if (action.index < state.mainImageIndex) {
        // Adjust main index if removing an image before it
        mainIndex--;
      }
      
      return {
        ...state,
        imageUrls: newUrls,
        imageObjectKeys: newKeys,
        mainImageIndex: mainIndex,
      };
    }
    
    case 'SET_MAIN_IMAGE':
      return {
        ...state,
        mainImageIndex: action.index,
      };
    
    case 'REORDER_IMAGES': {
      const newUrls: string[] = [];
      const newKeys: string[] = [];
      let newMainIndex = state.mainImageIndex;
      
      // Create new arrays based on the new order
      action.newOrder.forEach((oldIndex, newIndex) => {
        newUrls[newIndex] = state.imageUrls[oldIndex];
        newKeys[newIndex] = state.imageObjectKeys[oldIndex];
        
        // Update main image index if needed
        if (oldIndex === state.mainImageIndex) {
          newMainIndex = newIndex;
        }
      });
      
      return {
        ...state,
        imageUrls: newUrls,
        imageObjectKeys: newKeys,
        mainImageIndex: newMainIndex,
      };
    }
    
    case 'ADD_ATTRIBUTE':
      return {
        ...state,
        attributes: [...state.attributes, action.attribute],
      };
    
    case 'UPDATE_ATTRIBUTE': {
      const newAttributes = [...state.attributes];
      newAttributes[action.index] = action.attribute;
      return {
        ...state,
        attributes: newAttributes,
      };
    }
    
    case 'REMOVE_ATTRIBUTE': {
      const newAttributes = [...state.attributes];
      newAttributes.splice(action.index, 1);
      return {
        ...state,
        attributes: newAttributes,
      };
    }
    
    case 'RESET_WIZARD':
      return {
        ...defaultInitialState,
        // Preserve context during reset
        catalogId: state.catalogId,
        catalogName: state.catalogName,
        productId: state.productId,
      };
    
    default:
      return state;
  }
};

// Create the context
interface ProductWizardContextType {
  state: ProductWizardState;
  setField: (field: keyof ProductWizardState, value: any) => void;
  setCurrentStep: (step: WizardStep) => void;
  markStepComplete: (step: WizardStep) => void;
  markStepValid: (step: WizardStep, isValid: boolean) => void;
  nextStep: () => void;
  previousStep: () => void;
  addImage: (url: string, objectKey: string) => void;
  removeImage: (index: number) => void;
  setMainImage: (index: number) => void;
  reorderImages: (newOrder: number[]) => void;
  addAttribute: (attribute: any) => void;
  updateAttribute: (index: number, attribute: any) => void;
  removeAttribute: (index: number) => void;
  resetWizard: () => void;
  validateCurrentStep: () => boolean;
  isStepComplete: (step: WizardStep) => boolean;
  isStepValid: (step: WizardStep) => boolean;
  generateDefaults: (productName: string) => void;
  updatePrices: (costPrice: number, markupPercentage: number) => void;
  saveProductDraft: () => void;
  loadProductDraft: () => boolean;
  clearProductDraft: () => void;
}

const ProductWizardContext = createContext<ProductWizardContextType | undefined>(undefined);

// Provider component
interface ProductWizardProviderProps {
  children: ReactNode;
  initialState?: Partial<ProductWizardState>;
}

export const ProductWizardProvider: React.FC<ProductWizardProviderProps> = ({
  children,
  initialState = {},
}) => {
  // Initialize with saved draft if available, otherwise use defaults
  const getInitialState = () => {
    // If we're editing a product (i.e., initialState.productId is set), we'll load from API
    // and skip the draft
    if (initialState.productId) {
      return { ...defaultInitialState, ...initialState };
    }
    
    // Otherwise, check for a draft
    const savedDraft = localStorage.getItem('product_wizard_draft');
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        // Merge the saved draft with any passed initialState and defaults
        return { ...defaultInitialState, ...parsedDraft, ...initialState };
      } catch (error) {
        console.error('Error parsing saved product draft:', error);
        return { ...defaultInitialState, ...initialState };
      }
    }
    return { ...defaultInitialState, ...initialState };
  };

  const [state, dispatch] = useReducer(
    productWizardReducer,
    getInitialState()
  );
  
  // Load product data if we're editing
  React.useEffect(() => {
    const loadProductData = async () => {
      if (state.productId) {
        try {
          const response = await fetch(`/api/products/${state.productId}`);
          if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.data) {
              const product = data.data;
              
              // Update all fields with product data
              console.log('Loaded product data for editing:', product);
              
              dispatch({ type: 'SET_FIELD', field: 'name', value: product.name || '' });
              dispatch({ type: 'SET_FIELD', field: 'slug', value: product.slug || '' });
              dispatch({ type: 'SET_FIELD', field: 'sku', value: product.sku || generateSku(product.name) });
              dispatch({ type: 'SET_FIELD', field: 'description', value: product.description || '' });
              dispatch({ type: 'SET_FIELD', field: 'brand', value: product.brand || '' });
              dispatch({ type: 'SET_FIELD', field: 'categoryId', value: product.categoryId });
              dispatch({ type: 'SET_FIELD', field: 'isActive', value: product.isActive ?? true });
              dispatch({ type: 'SET_FIELD', field: 'isFeatured', value: product.isFeatured ?? false });
              
              // Pricing - API returns price instead of regularPrice
              dispatch({ type: 'SET_FIELD', field: 'costPrice', value: product.costPrice || 0 });
              dispatch({ type: 'SET_FIELD', field: 'regularPrice', value: product.price || 0 });
              dispatch({ type: 'SET_FIELD', field: 'salePrice', value: product.salePrice || null });
              dispatch({ type: 'SET_FIELD', field: 'onSale', value: product.salePrice ? true : false });
              dispatch({ type: 'SET_FIELD', field: 'markupPercentage', value: calculateMarkupPercentage(product.costPrice, product.price) });
              
              // Load images if available
              if (product.images && product.images.length > 0) {
                // Extract image URLs and object keys
                const imageUrls = product.images.map(img => img.url);
                const imageObjectKeys = product.images.map(img => img.objectKey);
                
                // Find main image index
                const mainImageIndex = product.images.findIndex(img => img.isMain) || 0;
                
                dispatch({ type: 'SET_FIELD', field: 'imageUrls', value: imageUrls });
                dispatch({ type: 'SET_FIELD', field: 'imageObjectKeys', value: imageObjectKeys });
                dispatch({ type: 'SET_FIELD', field: 'mainImageIndex', value: mainImageIndex >= 0 ? mainImageIndex : 0 });
              }
              
              // Inventory - API returns stock instead of stockLevel
              dispatch({ type: 'SET_FIELD', field: 'stockLevel', value: product.stock || 0 });
              dispatch({ type: 'SET_FIELD', field: 'lowStockThreshold', value: product.lowStockThreshold || 5 });
              dispatch({ type: 'SET_FIELD', field: 'backorderEnabled', value: product.backorderEnabled ?? false });
              
              // Attributes - load existing attributes and attribute values
              if (product.attributes) {
                dispatch({ type: 'SET_FIELD', field: 'attributes', value: product.attributes || [] });
              }
              
              if (product.attributeValues) {
                dispatch({ type: 'SET_FIELD', field: 'attributeValues', value: product.attributeValues || [] });
              }
              
              // Product details
              dispatch({ type: 'SET_FIELD', field: 'supplier', value: product.supplier || null });
              dispatch({ type: 'SET_FIELD', field: 'weight', value: product.weight || null });
              dispatch({ type: 'SET_FIELD', field: 'dimensions', value: product.dimensions || null });
              
              // Sales & Promotions
              dispatch({ type: 'SET_FIELD', field: 'discountLabel', value: product.discountLabel || null });
              dispatch({ type: 'SET_FIELD', field: 'specialSaleText', value: product.specialSaleText || null });
              
              // Convert date strings to Date objects if they exist
              if (product.specialSaleStart) {
                dispatch({ 
                  type: 'SET_FIELD', 
                  field: 'specialSaleStart', 
                  value: new Date(product.specialSaleStart) 
                });
              }
              
              if (product.specialSaleEnd) {
                dispatch({ 
                  type: 'SET_FIELD', 
                  field: 'specialSaleEnd', 
                  value: new Date(product.specialSaleEnd) 
                });
              }
              
              // Shipping
              dispatch({ type: 'SET_FIELD', field: 'taxable', value: product.taxable ?? true });
              dispatch({ type: 'SET_FIELD', field: 'taxClass', value: product.taxClass || 'standard' });
              dispatch({ type: 'SET_FIELD', field: 'shippingRequired', value: product.shippingRequired ?? true });
              dispatch({ type: 'SET_FIELD', field: 'shippingWeight', value: product.shippingWeight || null });
              
              // Shipping dimensions
              if (product.shippingDimensions) {
                dispatch({ 
                  type: 'SET_FIELD', 
                  field: 'shippingDimensions', 
                  value: {
                    length: product.shippingDimensions.length || null,
                    width: product.shippingDimensions.width || null,
                    height: product.shippingDimensions.height || null,
                  } 
                });
              }
              
              // SEO
              dispatch({ type: 'SET_FIELD', field: 'metaTitle', value: product.metaTitle || '' });
              dispatch({ type: 'SET_FIELD', field: 'metaDescription', value: product.metaDescription || '' });
              dispatch({ type: 'SET_FIELD', field: 'metaKeywords', value: product.metaKeywords || '' });
              
              // Mark basic info step as valid
              dispatch({ type: 'MARK_STEP_VALID', step: 'basic-info', isValid: true });
              dispatch({ type: 'MARK_STEP_COMPLETE', step: 'basic-info' });
              
              // Mark images step as valid if there are images
              if (product.images && product.images.length > 0) {
                dispatch({ type: 'MARK_STEP_VALID', step: 'images', isValid: true });
                dispatch({ type: 'MARK_STEP_COMPLETE', step: 'images' });
              }
              
              console.log('Loaded product data for editing:', product);
            }
          } else {
            console.error('Failed to load product data for editing');
          }
        } catch (error) {
          console.error('Error loading product data for editing:', error);
        }
      }
    };
    
    loadProductData();
  }, [state.productId]);
  
  // Action dispatchers
  const setField = useCallback((field: keyof ProductWizardState, value: any) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);
  
  const setCurrentStep = useCallback((step: WizardStep) => {
    dispatch({ type: 'SET_CURRENT_STEP', step });
  }, []);
  
  const markStepComplete = useCallback((step: WizardStep) => {
    dispatch({ type: 'MARK_STEP_COMPLETE', step });
  }, []);
  
  const markStepValid = useCallback((step: WizardStep, isValid: boolean) => {
    dispatch({ type: 'MARK_STEP_VALID', step, isValid });
  }, []);
  
  const addImage = useCallback((url: string, objectKey: string) => {
    dispatch({ type: 'ADD_IMAGE', url, objectKey });
  }, []);
  
  const removeImage = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_IMAGE', index });
  }, []);
  
  const setMainImage = useCallback((index: number) => {
    dispatch({ type: 'SET_MAIN_IMAGE', index });
  }, []);
  
  const reorderImages = useCallback((newOrder: number[]) => {
    dispatch({ type: 'REORDER_IMAGES', newOrder });
  }, []);
  
  const addAttribute = useCallback((attribute: any) => {
    dispatch({ type: 'ADD_ATTRIBUTE', attribute });
  }, []);
  
  const updateAttribute = useCallback((index: number, attribute: any) => {
    dispatch({ type: 'UPDATE_ATTRIBUTE', index, attribute });
  }, []);
  
  const removeAttribute = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_ATTRIBUTE', index });
  }, []);
  
  const resetWizard = useCallback(() => {
    dispatch({ type: 'RESET_WIZARD' });
  }, []);
  
  // Wizard step navigation
  const nextStep = useCallback(() => {
    const currentIndex = ['basic-info', 'images', 'additional-info', 'review'].indexOf(state.currentStep);
    if (currentIndex < 3) {
      const nextStep = ['basic-info', 'images', 'additional-info', 'review'][currentIndex + 1] as WizardStep;
      dispatch({ type: 'SET_CURRENT_STEP', step: nextStep });
    }
  }, [state.currentStep]);
  
  const previousStep = useCallback(() => {
    const currentIndex = ['basic-info', 'images', 'additional-info', 'review'].indexOf(state.currentStep);
    if (currentIndex > 0) {
      const prevStep = ['basic-info', 'images', 'additional-info', 'review'][currentIndex - 1] as WizardStep;
      dispatch({ type: 'SET_CURRENT_STEP', step: prevStep });
    }
  }, [state.currentStep]);
  
  // Step validation
  const validateCurrentStep = useCallback((): boolean => {
    const stepValidators: Record<WizardStep, () => boolean> = {
      'basic-info': () => {
        // Convert string values to numbers properly to fix validation with numeric fields
        const costPrice = typeof state.costPrice === 'string' ? parseFloat(state.costPrice) : state.costPrice;
        const regularPrice = typeof state.regularPrice === 'string' ? parseFloat(state.regularPrice) : state.regularPrice;
        const salePrice = typeof state.salePrice === 'string' ? parseFloat(state.salePrice) : state.salePrice;
        
        // Check required fields with proper number handling
        const isValid = Boolean(
          state.name &&
          state.slug &&
          costPrice > 0 &&
          regularPrice > 0 &&
          (!state.onSale || (state.onSale && salePrice && salePrice > 0))
        );
        
        console.log('Basic Info validation:', { 
          isValid, 
          name: state.name, 
          slug: state.slug, 
          costPrice, 
          regularPrice, 
          onSale: state.onSale, 
          salePrice 
        });
        
        dispatch({ type: 'MARK_STEP_VALID', step: 'basic-info', isValid });
        dispatch({ type: 'MARK_STEP_COMPLETE', step: 'basic-info' });
        return isValid;
      },
      'images': () => {
        // Images are optional but we mark the step as complete
        dispatch({ type: 'MARK_STEP_VALID', step: 'images', isValid: true });
        dispatch({ type: 'MARK_STEP_COMPLETE', step: 'images' });
        return true;
      },
      'additional-info': () => {
        // Most fields are optional here
        const isValid = true;
        dispatch({ type: 'MARK_STEP_VALID', step: 'additional-info', isValid });
        dispatch({ type: 'MARK_STEP_COMPLETE', step: 'additional-info' });
        return isValid;
      },
      'review': () => {
        // Convert string values to numbers properly to fix validation with numeric fields
        const costPrice = typeof state.costPrice === 'string' ? parseFloat(state.costPrice) : state.costPrice;
        const regularPrice = typeof state.regularPrice === 'string' ? parseFloat(state.regularPrice) : state.regularPrice;
        const salePrice = typeof state.salePrice === 'string' ? parseFloat(state.salePrice) : state.salePrice;
        
        // Final validation before submission
        const isBasicInfoValid = Boolean(
          state.name &&
          state.slug &&
          costPrice > 0 &&
          regularPrice > 0 &&
          (!state.onSale || (state.onSale && salePrice && salePrice > 0))
        );
        
        const isValid = isBasicInfoValid;
        
        console.log('Review validation:', { 
          isValid, 
          name: state.name, 
          slug: state.slug, 
          costPrice, 
          regularPrice, 
          onSale: state.onSale, 
          salePrice 
        });
        
        dispatch({ type: 'MARK_STEP_VALID', step: 'review', isValid });
        dispatch({ type: 'MARK_STEP_COMPLETE', step: 'review' });
        return isValid;
      }
    };
    
    return stepValidators[state.currentStep]();
  }, [state]);
  
  // Helper methods
  const isStepComplete = useCallback((step: WizardStep): boolean => {
    return state.completedSteps[step];
  }, [state.completedSteps]);
  
  const isStepValid = useCallback((step: WizardStep): boolean => {
    return state.validSteps[step];
  }, [state.validSteps]);
  
  // Generate defaults for new products
  const generateDefaults = useCallback((productName: string) => {
    const slug = generateSlug(productName);
    const sku = generateSku(productName);
    
    dispatch({ type: 'SET_FIELD', field: 'slug', value: slug });
    dispatch({ type: 'SET_FIELD', field: 'sku', value: sku });
    dispatch({ type: 'SET_FIELD', field: 'metaTitle', value: productName });
  }, []);
  
  // Update prices based on cost and markup
  const updatePrices = useCallback((costPrice: number, markupPercentage: number) => {
    if (costPrice <= 0) return;
    
    const regularPrice = Math.ceil(costPrice * (1 + markupPercentage / 100));
    
    dispatch({ type: 'SET_FIELD', field: 'regularPrice', value: regularPrice });
    
    // If on sale, adjust sale price to maintain same discount percentage
    if (state.onSale && state.salePrice !== null && state.regularPrice > 0) {
      const currentDiscount = 1 - (state.salePrice / state.regularPrice);
      const newSalePrice = Math.ceil(regularPrice * (1 - currentDiscount));
      dispatch({ type: 'SET_FIELD', field: 'salePrice', value: newSalePrice });
    }
  }, [state.onSale, state.salePrice, state.regularPrice]);
  
  // Auto-save functions
  const saveProductDraft = useCallback(() => {
    try {
      const draftData = JSON.stringify(state);
      localStorage.setItem('product_wizard_draft', draftData);
      console.log('Product draft saved automatically');
      return true;
    } catch (error) {
      console.error('Error saving product draft:', error);
      return false;
    }
  }, [state]);

  const loadProductDraft = useCallback(() => {
    try {
      const savedDraft = localStorage.getItem('product_wizard_draft');
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        // Apply saved draft to current state
        Object.keys(parsedDraft).forEach(key => {
          if (key in state) {
            dispatch({ 
              type: 'SET_FIELD', 
              field: key as keyof ProductWizardState, 
              value: parsedDraft[key] 
            });
          }
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading product draft:', error);
      return false;
    }
  }, [state]);

  const clearProductDraft = useCallback(() => {
    localStorage.removeItem('product_wizard_draft');
    console.log('Product draft cleared');
  }, []);

  // Set up auto-save on state changes
  React.useEffect(() => {
    // Don't save if state is at default values or if we're just initializing
    if (state.name || state.description || state.imageUrls.length > 0) {
      const timer = setTimeout(() => {
        saveProductDraft();
      }, 2000); // Auto-save 2 seconds after changes stop
      
      return () => clearTimeout(timer);
    }
  }, [state, saveProductDraft]);
  
  // Create context value
  const value = {
    state,
    setField,
    setCurrentStep,
    markStepComplete,
    markStepValid,
    nextStep,
    previousStep,
    addImage,
    removeImage,
    setMainImage,
    reorderImages,
    addAttribute,
    updateAttribute,
    removeAttribute,
    resetWizard,
    validateCurrentStep,
    isStepComplete,
    isStepValid,
    generateDefaults,
    updatePrices,
    saveProductDraft,
    loadProductDraft,
    clearProductDraft,
  };
  
  return (
    <ProductWizardContext.Provider value={value}>
      {children}
    </ProductWizardContext.Provider>
  );
};

// Hook for using the context
export const useProductWizardContext = (): ProductWizardContextType => {
  const context = useContext(ProductWizardContext);
  if (!context) {
    throw new Error('useProductWizardContext must be used within a ProductWizardProvider');
  }
  return context;
};