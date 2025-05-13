/**
 * Product Wizard Context
 * 
 * This module provides a React context for managing the state and logic
 * of the product creation/editing wizard.
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import slugify from 'slugify';

// Define the steps of the wizard
export const WIZARD_STEPS = [
  'basic-info',
  'images',
  'additional-info',
  'review'
] as const;

export type WizardStep = typeof WIZARD_STEPS[number];

// Define the state interface for the product wizard
export interface ProductWizardState {
  // Basic product info
  productId?: number;
  name: string;
  slug: string;
  description: string;
  costPrice: number;
  regularPrice: number;
  salePrice?: number;
  minimumPrice?: number;
  markupPercentage: number;
  sku: string;
  stockLevel: number;
  minOrderQty: number;
  brand?: string;
  tags: string[];
  
  // Category and catalog info
  categoryId?: number;
  categoryName?: string;
  catalogId?: number;
  catalogName?: string;
  supplierId?: number;
  supplierName?: string;
  
  // Images
  imageUrls: string[];
  tempImagePaths: string[];
  mainImageIndex: number;
  
  // Additional info
  isActive: boolean;
  isPhysical: boolean;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  weightUnit: 'g' | 'kg' | 'oz' | 'lb';
  dimensionUnit: 'cm' | 'mm' | 'in';
  freeShipping: boolean;
  isFeatured: boolean;
  
  // Special promotions
  hasFlashDeal: boolean;
  flashDealStartDate?: string;
  flashDealEndDate?: string;
  flashDealPrice?: number;
  
  // Status tracking
  isDraft: boolean;
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  
  // Extras
  attributeValues: Record<string, any>;
  notes?: string;
}

// Define validation error interface
export interface ProductWizardErrors {
  [key: string]: string;
}

// Define catalog context data for default values
export interface CatalogContextData {
  defaultMarkupPercentage: number;
  freeShipping: boolean;
  categoryId?: number;
  supplierName?: string;
  supplierContactInfo?: string;
}

// Define the context value interface
interface ProductWizardContextValue {
  state: ProductWizardState;
  updateState: (update: Partial<ProductWizardState>) => void;
  resetState: () => void;
  createProduct: () => Promise<number | undefined>;
  updateProduct: () => Promise<boolean>;
  errors: ProductWizardErrors;
  currentStep: WizardStep;
  goToStep: (step: WizardStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  isValid: (step?: WizardStep) => boolean;
  validateStep: (step?: WizardStep) => boolean;
  setError: (field: string, message: string) => void;
  clearError: (field: string) => void;
  isSubmitting: boolean;
  catalogContext: CatalogContextData | null;
  isCatalogContextLoading: boolean;
}

// Default state
const defaultState: ProductWizardState = {
  name: '',
  slug: '',
  description: '',
  costPrice: 0,
  regularPrice: 0,
  markupPercentage: 40, // Default markup percentage
  sku: '',
  stockLevel: 0,
  minOrderQty: 1,
  tags: [],
  imageUrls: [],
  tempImagePaths: [],
  mainImageIndex: -1,
  isActive: true,
  isPhysical: true,
  weightUnit: 'g',
  dimensionUnit: 'cm',
  freeShipping: false,
  isFeatured: false,
  hasFlashDeal: false,
  isDraft: false,
  currentStep: 'basic-info',
  completedSteps: [],
  attributeValues: {}
};

// Create the context
const ProductWizardContext = createContext<ProductWizardContextValue | undefined>(undefined);

// Create the provider component
export const ProductWizardProvider: React.FC<{
  children: ReactNode;
  initialState?: Partial<ProductWizardState>;
  catalogId?: number;
}> = ({ children, initialState, catalogId }) => {
  const [state, setState] = useState<ProductWizardState>({
    ...defaultState,
    ...initialState,
    catalogId
  });
  const [errors, setErrors] = useState<ProductWizardErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch catalog context if catalogId is provided
  const {
    data: catalogContext,
    isLoading: isCatalogContextLoading
  } = useQuery({
    queryKey: ['catalog-context', catalogId],
    queryFn: async () => {
      if (!catalogId) return null;
      
      const response = await fetch(`/api/catalogs/${catalogId}/context`);
      if (!response.ok) {
        throw new Error('Failed to fetch catalog context');
      }
      
      const data = await response.json();
      return data.data as CatalogContextData;
    },
    enabled: !!catalogId
  });

  // Apply catalog defaults when context is loaded
  useEffect(() => {
    if (catalogContext && !initialState?.productId) {
      setState(prev => ({
        ...prev,
        markupPercentage: catalogContext.defaultMarkupPercentage || prev.markupPercentage,
        freeShipping: catalogContext.freeShipping,
        categoryId: catalogContext.categoryId,
        supplierName: catalogContext.supplierName
      }));
    }
  }, [catalogContext, initialState]);

  // Auto-generate slug when name changes
  useEffect(() => {
    if (state.name && (!state.slug || state.slug === slugify(state.name.substring(0, state.name.length - 1), { lower: true }))) {
      setState(prev => ({
        ...prev,
        slug: slugify(state.name, { lower: true })
      }));
    }
  }, [state.name]);

  // Update state function
  const updateState = useCallback((update: Partial<ProductWizardState>) => {
    setState(prev => ({
      ...prev,
      ...update
    }));
    
    // Clear any errors for updated fields
    if (update && Object.keys(update).length > 0) {
      setErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(update).forEach(key => {
          delete newErrors[key];
        });
        return newErrors;
      });
    }
  }, []);

  // Reset state function
  const resetState = useCallback(() => {
    setState(defaultState);
    setErrors({});
  }, []);

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductWizardState) => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create product');
      }
      
      const data = await response.json();
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (productData: ProductWizardState) => {
      if (!productData.productId) {
        throw new Error('Product ID is required for updates');
      }
      
      const response = await fetch(`/api/products/${productData.productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update product');
      }
      
      const data = await response.json();
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  // Create product function
  const createProduct = useCallback(async (): Promise<number | undefined> => {
    try {
      setIsSubmitting(true);
      
      // Validate all steps first
      if (!validateStep()) {
        setIsSubmitting(false);
        return undefined;
      }
      
      const result = await createProductMutation.mutateAsync(state);
      
      if (result && result.id) {
        // Update state with the new product ID
        updateState({ productId: result.id });
        return result.id;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error creating product:', error);
      return undefined;
    } finally {
      setIsSubmitting(false);
    }
  }, [state, updateState, createProductMutation]);

  // Update product function
  const updateProduct = useCallback(async (): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      
      if (!state.productId) {
        console.error('Cannot update product: No product ID');
        return false;
      }
      
      await updateProductMutation.mutateAsync(state);
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [state, updateProductMutation]);

  // Navigation functions
  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({
      ...prev,
      currentStep: step
    }));
  }, []);

  const goToNextStep = useCallback(() => {
    const currentIndex = WIZARD_STEPS.indexOf(state.currentStep);
    if (currentIndex < WIZARD_STEPS.length - 1) {
      const nextStep = WIZARD_STEPS[currentIndex + 1];
      
      // Add current step to completed steps if not already there
      setState(prev => ({
        ...prev,
        currentStep: nextStep,
        completedSteps: prev.completedSteps.includes(prev.currentStep)
          ? prev.completedSteps
          : [...prev.completedSteps, prev.currentStep]
      }));
    }
  }, [state.currentStep]);

  const goToPreviousStep = useCallback(() => {
    const currentIndex = WIZARD_STEPS.indexOf(state.currentStep);
    if (currentIndex > 0) {
      const previousStep = WIZARD_STEPS[currentIndex - 1];
      setState(prev => ({
        ...prev,
        currentStep: previousStep
      }));
    }
  }, [state.currentStep]);

  // Validation functions
  const validateStep = useCallback((step?: WizardStep): boolean => {
    const stepToValidate = step || state.currentStep;
    const newErrors: ProductWizardErrors = {};
    
    if (stepToValidate === 'basic-info') {
      // Validate basic info
      if (!state.name) {
        newErrors.name = 'Product name is required';
      } else if (state.name.length < 3) {
        newErrors.name = 'Product name must be at least 3 characters';
      }
      
      if (!state.slug) {
        newErrors.slug = 'Product slug is required';
      } else if (!/^[a-z0-9-]+$/.test(state.slug)) {
        newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
      }
      
      if (state.costPrice <= 0) {
        newErrors.costPrice = 'Cost price must be greater than zero';
      }
      
      if (state.regularPrice <= 0) {
        newErrors.regularPrice = 'Regular price must be greater than zero';
      } else if (state.regularPrice < state.costPrice) {
        newErrors.regularPrice = 'Regular price cannot be less than cost price';
      }
      
      if (state.salePrice !== undefined && state.salePrice > 0) {
        if (state.salePrice >= state.regularPrice) {
          newErrors.salePrice = 'Sale price must be less than regular price';
        }
      }
      
      if (state.markupPercentage <= 0) {
        newErrors.markupPercentage = 'Markup percentage must be greater than zero';
      }
    } else if (stepToValidate === 'images') {
      // Validate images
      if (state.imageUrls.length === 0 && state.tempImagePaths.length === 0) {
        newErrors.imageUrls = 'At least one product image is required';
      }
    } else if (stepToValidate === 'additional-info') {
      // Validate additional info
      if (state.isPhysical && state.weight !== undefined && state.weight <= 0) {
        newErrors.weight = 'Weight must be greater than zero';
      }
      
      if (state.hasFlashDeal) {
        if (!state.flashDealPrice) {
          newErrors.flashDealPrice = 'Flash deal price is required';
        } else if (state.flashDealPrice >= state.regularPrice) {
          newErrors.flashDealPrice = 'Flash deal price must be less than regular price';
        }
        
        if (!state.flashDealStartDate) {
          newErrors.flashDealStartDate = 'Start date is required for flash deals';
        }
        
        if (!state.flashDealEndDate) {
          newErrors.flashDealEndDate = 'End date is required for flash deals';
        } else if (state.flashDealStartDate && new Date(state.flashDealEndDate) <= new Date(state.flashDealStartDate)) {
          newErrors.flashDealEndDate = 'End date must be after start date';
        }
      }
    } else if (stepToValidate === 'review') {
      // Validate all previous steps
      const isBasicInfoValid = validateStep('basic-info');
      const isImagesValid = validateStep('images');
      const isAdditionalInfoValid = validateStep('additional-info');
      
      return isBasicInfoValid && isImagesValid && isAdditionalInfoValid;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [state]);

  // Check if step is valid (without updating errors)
  const isValid = useCallback((step?: WizardStep): boolean => {
    const stepToValidate = step || state.currentStep;
    
    if (stepToValidate === 'basic-info') {
      return (
        !!state.name &&
        state.name.length >= 3 &&
        !!state.slug &&
        /^[a-z0-9-]+$/.test(state.slug) &&
        state.costPrice > 0 &&
        state.regularPrice > 0 &&
        state.regularPrice >= state.costPrice &&
        (state.salePrice === undefined || state.salePrice <= 0 || state.salePrice < state.regularPrice) &&
        state.markupPercentage > 0
      );
    } else if (stepToValidate === 'images') {
      return state.imageUrls.length > 0 || state.tempImagePaths.length > 0;
    } else if (stepToValidate === 'additional-info') {
      if (state.isPhysical && state.weight !== undefined && state.weight <= 0) {
        return false;
      }
      
      if (state.hasFlashDeal) {
        if (!state.flashDealPrice || state.flashDealPrice >= state.regularPrice) {
          return false;
        }
        
        if (!state.flashDealStartDate || !state.flashDealEndDate) {
          return false;
        }
        
        if (new Date(state.flashDealEndDate) <= new Date(state.flashDealStartDate)) {
          return false;
        }
      }
      
      return true;
    } else if (stepToValidate === 'review') {
      return isValid('basic-info') && isValid('images') && isValid('additional-info');
    }
    
    return true;
  }, [state]);

  // Error management functions
  const setError = useCallback((field: string, message: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: message
    }));
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Combine everything into the context value
  const contextValue: ProductWizardContextValue = {
    state,
    updateState,
    resetState,
    createProduct,
    updateProduct,
    errors,
    currentStep: state.currentStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    isValid,
    validateStep,
    setError,
    clearError,
    isSubmitting,
    catalogContext,
    isCatalogContextLoading
  };

  return (
    <ProductWizardContext.Provider value={contextValue}>
      {children}
    </ProductWizardContext.Provider>
  );
};

// Create a hook to use the context
export const useProductWizardContext = () => {
  const context = useContext(ProductWizardContext);
  
  if (context === undefined) {
    throw new Error('useProductWizardContext must be used within a ProductWizardProvider');
  }
  
  return context;
};