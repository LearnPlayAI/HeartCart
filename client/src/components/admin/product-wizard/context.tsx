/**
 * Product Wizard Context
 * 
 * Provides state management and business logic for the product creation wizard.
 * Manages step transitions, validation, and API interactions.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { slugify } from '@/utils/string-utils';

// Define step structure
export interface WizardStep {
  id: string;
  label: string;
  description?: string;
}

// Define all wizard steps
export const WIZARD_STEPS: WizardStep[] = [
  { id: 'basic-info', label: 'Basic Info' },
  { id: 'images', label: 'Images' },
  { id: 'additional-info', label: 'Additional Info' },
  { id: 'review', label: 'Review & Save' },
];

// State structure for the wizard
export interface ProductWizardState {
  // Basic info
  productId: number | null;
  name: string;
  slug: string;
  sku: string;
  brand: string | null;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  
  // Pricing & inventory
  costPrice: number;
  markupPercentage: number;
  regularPrice: number;
  salePrice: number | null;
  saleStartDate: string | null;
  saleEndDate: string | null;
  stockLevel: number;
  lowStockThreshold: number;
  backorderEnabled: boolean;
  
  // Status flags
  isActive: boolean;
  isDraft: boolean;
  isFeatured: boolean;
  isNew: boolean;
  
  // Images
  imageUrls: string[];
  imageObjectKeys: string[];
  mainImageIndex: number;
  
  // Physical properties
  isPhysical: boolean;
  weight: number | null;
  weightUnit: string;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string;
  
  // Shipping & availability
  freeShipping: boolean;
  publishDate: string | null;
  expiryDate: string | null;
  
  // Tags
  tags: string[];
}

// Default initial state
const defaultInitialState: ProductWizardState = {
  // Basic info
  productId: null,
  name: '',
  slug: '',
  sku: '',
  brand: null,
  description: null,
  categoryId: null,
  categoryName: null,
  
  // Pricing & inventory
  costPrice: 0,
  markupPercentage: 30, // Default markup percentage
  regularPrice: 0,
  salePrice: null,
  saleStartDate: null,
  saleEndDate: null,
  stockLevel: 0,
  lowStockThreshold: 5,
  backorderEnabled: false,
  
  // Status flags
  isActive: true,
  isDraft: true,
  isFeatured: false,
  isNew: true,
  
  // Images
  imageUrls: [],
  imageObjectKeys: [],
  mainImageIndex: -1, // -1 means no main image selected
  
  // Physical properties
  isPhysical: true,
  weight: null,
  weightUnit: 'kg',
  length: null,
  width: null,
  height: null,
  dimensionUnit: 'cm',
  
  // Shipping & availability
  freeShipping: false,
  publishDate: null,
  expiryDate: null,
  
  // Tags
  tags: [],
};

// Catalog context type
export interface CatalogContext {
  id: number;
  name: string;
  defaultTags: string[];
  defaultShippingInfo?: {
    weight?: number;
    weightUnit?: string;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
      unit?: string;
    };
    freeShipping?: boolean;
  };
}

// Product wizard context interface
interface ProductWizardContextType {
  state: ProductWizardState;
  updateField: <K extends keyof ProductWizardState>(
    field: K,
    value: ProductWizardState[K]
  ) => void;
  currentStep: string;
  goToStep: (stepId: string) => void;
  canGoToStep: (stepId: string) => boolean;
  completedSteps: string[];
  markStepComplete: (stepId: string) => void;
  validateStep: (stepId: string) => boolean;
  submitStatus: 'idle' | 'submitting' | 'success' | 'error';
  isSubmitting: boolean;
  createProduct: () => Promise<boolean>;
  updateProduct: () => Promise<boolean>;
  catalogId: number | null;
  catalogContext: CatalogContext | null;
  imageOperationInProgress: boolean;
  setImageOperationInProgress: (inProgress: boolean) => void;
}

// Create context
const ProductWizardContext = createContext<ProductWizardContextType | undefined>(undefined);

// Props interface for the context provider
interface ProductWizardProviderProps {
  children: ReactNode;
  initialValues?: Partial<ProductWizardState>;
  initialStep?: string;
  catalogId?: number;
  onComplete?: (productId: number) => void;
  onError?: (error: Error) => void;
}

// Context provider component
export const ProductWizardProvider: React.FC<ProductWizardProviderProps> = ({
  children,
  initialValues = {},
  initialStep = WIZARD_STEPS[0].id,
  catalogId = null,
  onComplete,
  onError,
}) => {
  const { toast } = useToast();
  const [state, setState] = useState<ProductWizardState>({
    ...defaultInitialState,
    ...initialValues,
  });
  const [currentStep, setCurrentStep] = useState<string>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [catalogContext, setCatalogContext] = useState<CatalogContext | null>(null);
  const [imageOperationInProgress, setImageOperationInProgress] = useState(false);
  
  // Load catalog data if catalogId is provided
  useEffect(() => {
    const loadCatalogData = async () => {
      if (!catalogId) return;
      
      try {
        const response = await axios.get(`/api/catalogs/${catalogId}`);
        if (response.data && response.data.success) {
          setCatalogContext(response.data.data);
          
          // Apply catalog defaults to state if product is new
          if (!state.productId) {
            setState(prevState => ({
              ...prevState,
              catalogId,
            }));
          }
        }
      } catch (error) {
        console.error('Failed to load catalog data:', error);
      }
    };
    
    loadCatalogData();
  }, [catalogId]);
  
  // Auto-populate slug when name changes, if slug is empty or auto-generated
  useEffect(() => {
    if (state.name && (!state.slug || state.slug === slugify(state.name.slice(0, -1)))) {
      updateField('slug', slugify(state.name));
    }
  }, [state.name]);
  
  // Auto-calculate regular price based on cost price and markup
  useEffect(() => {
    if (state.costPrice > 0 && state.markupPercentage >= 0) {
      const calculatedPrice = state.costPrice * (1 + state.markupPercentage / 100);
      updateField('regularPrice', Math.round(calculatedPrice * 100) / 100); // Round to 2 decimal places
    }
  }, [state.costPrice, state.markupPercentage]);
  
  // Helper function to update a field in the state
  const updateField = <K extends keyof ProductWizardState>(
    field: K,
    value: ProductWizardState[K]
  ) => {
    setState(prevState => ({
      ...prevState,
      [field]: value,
    }));
  };
  
  // Navigate to a specific step
  const goToStep = (stepId: string) => {
    if (canGoToStep(stepId)) {
      setCurrentStep(stepId);
    } else {
      toast({
        title: 'Cannot proceed',
        description: 'Please complete the current step before proceeding.',
        variant: 'destructive',
      });
    }
  };
  
  // Check if we can navigate to a specific step
  const canGoToStep = (stepId: string): boolean => {
    const currentStepIndex = WIZARD_STEPS.findIndex(step => step.id === currentStep);
    const targetStepIndex = WIZARD_STEPS.findIndex(step => step.id === stepId);
    
    // Can always go back
    if (targetStepIndex < currentStepIndex) {
      return true;
    }
    
    // Can only go forward if all previous steps are completed
    if (targetStepIndex > currentStepIndex) {
      const previousSteps = WIZARD_STEPS.slice(0, targetStepIndex).map(step => step.id);
      return previousSteps.every(step => completedSteps.includes(step));
    }
    
    // Can always stay on current step
    return true;
  };
  
  // Mark a step as completed
  const markStepComplete = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prevSteps => [...prevSteps, stepId]);
    }
  };
  
  // Validate a specific step
  const validateStep = (stepId: string): boolean => {
    switch (stepId) {
      case 'basic-info':
        return Boolean(
          state.name &&
          state.slug &&
          state.costPrice > 0 &&
          state.regularPrice > 0
        );
        
      case 'images':
        // Images step is optional, but if there are images, there must be a main image
        return state.imageUrls.length === 0 || state.mainImageIndex >= 0;
        
      case 'additional-info':
        // Additional info step is optional
        return true;
        
      case 'review':
        // Review step requires all previous steps to be completed
        return WIZARD_STEPS.slice(0, 3).map(step => step.id).every(step => 
          completedSteps.includes(step)
        );
        
      default:
        return false;
    }
  };
  
  // Create a new product
  const createProduct = async (): Promise<boolean> => {
    try {
      setSubmitStatus('submitting');
      
      const payload = {
        ...state,
        imageObjectKeys: state.imageObjectKeys,
        mainImageIndex: state.mainImageIndex,
      };
      
      const response = await axios.post('/api/products', payload);
      
      if (response.data && response.data.success) {
        setSubmitStatus('success');
        
        const newProductId = response.data.data.id;
        updateField('productId', newProductId);
        updateField('isDraft', false);
        
        toast({
          title: 'Product created',
          description: 'Product has been successfully created.',
        });
        
        if (onComplete) {
          onComplete(newProductId);
        }
        
        return true;
      } else {
        throw new Error(response.data.error || 'Failed to create product');
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      setSubmitStatus('error');
      
      toast({
        title: 'Failed to create product',
        description: error.message || 'An error occurred during product creation.',
        variant: 'destructive',
      });
      
      if (onError) {
        onError(error);
      }
      
      return false;
    }
  };
  
  // Update an existing product
  const updateProduct = async (): Promise<boolean> => {
    if (!state.productId) {
      console.error('Cannot update: Product ID is missing');
      return false;
    }
    
    try {
      setSubmitStatus('submitting');
      
      const payload = {
        ...state,
        imageObjectKeys: state.imageObjectKeys,
        mainImageIndex: state.mainImageIndex,
      };
      
      const response = await axios.put(`/api/products/${state.productId}`, payload);
      
      if (response.data && response.data.success) {
        setSubmitStatus('success');
        
        toast({
          title: 'Product updated',
          description: 'Product has been successfully updated.',
        });
        
        if (onComplete) {
          onComplete(state.productId);
        }
        
        return true;
      } else {
        throw new Error(response.data.error || 'Failed to update product');
      }
    } catch (error: any) {
      console.error('Error updating product:', error);
      setSubmitStatus('error');
      
      toast({
        title: 'Failed to update product',
        description: error.message || 'An error occurred during product update.',
        variant: 'destructive',
      });
      
      if (onError) {
        onError(error);
      }
      
      return false;
    }
  };
  
  // Context value to be provided
  const contextValue: ProductWizardContextType = {
    state,
    updateField,
    currentStep,
    goToStep,
    canGoToStep,
    completedSteps,
    markStepComplete,
    validateStep,
    submitStatus,
    isSubmitting: submitStatus === 'submitting',
    createProduct,
    updateProduct,
    catalogId,
    catalogContext,
    imageOperationInProgress,
    setImageOperationInProgress,
  };

  return (
    <ProductWizardContext.Provider value={contextValue}>
      {children}
    </ProductWizardContext.Provider>
  );
};

// Custom hook to use the product wizard context
export const useProductWizardContext = () => {
  const context = useContext(ProductWizardContext);
  if (context === undefined) {
    throw new Error('useProductWizardContext must be used within a ProductWizardProvider');
  }
  return context;
};