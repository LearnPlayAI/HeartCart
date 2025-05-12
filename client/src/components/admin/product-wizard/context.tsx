/**
 * Product Wizard Context
 * 
 * This module provides comprehensive context and state management for the product wizard.
 * It implements a React Context + useReducer pattern for maintaining wizard state across
 * multiple steps, handling validation, and managing the overall wizard flow.
 * 
 * The context provides:
 * - State management through a reducer pattern
 * - Step-based validation rules
 * - Navigation guards between steps
 * - Form state persistence
 * - Draft saving and loading capabilities
 * 
 * @module ProductWizardContext
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { 
  WizardState, 
  WizardAction, 
  WizardStep, 
  WizardActionType,
  ProductWizardData,
  UploadedImage
} from './types';

/**
 * Step configuration interface defining the metadata and validation for each wizard step
 * @interface StepConfig
 */
interface StepConfig {
  /** Display label for the step */
  label: string;
  /** Description text explaining the step's purpose */
  description: string;
  /** Validation function that checks if the step data is complete and valid */
  validation: (data: ProductWizardData) => boolean;
}

/**
 * Returns the configuration for a specific wizard step
 * @param {WizardStep} step - The wizard step to get configuration for
 * @returns {StepConfig} Configuration object for the requested step
 */
export const getStepConfig = (step: WizardStep): StepConfig => {
  const stepConfigs: Record<WizardStep, StepConfig> = {
    [WizardStep.BASIC_INFO]: {
      label: 'Basic Info',
      description: 'Enter essential product information',
      validation: (data) => !!(data.name && data.slug && data.price && data.categoryId)
    },
    [WizardStep.PRODUCT_IMAGES]: {
      label: 'Images',
      description: 'Upload product images',
      validation: (data) => data.uploadedImages.length > 0
    },
    [WizardStep.ADDITIONAL_INFO]: {
      label: 'Additional Info',
      description: 'Add specifications and details',
      validation: () => true // Optional section, always valid
    },
    [WizardStep.REVIEW_SAVE]: {
      label: 'Review & Save',
      description: 'Review and submit product',
      validation: () => true // Review step is always valid
    }
  };
  
  return stepConfigs[step];
};

/**
 * Validates if a step's data meets all requirements
 * 
 * @param {WizardStep} step - The step to validate
 * @param {ProductWizardData} data - The current product data
 * @returns {boolean} True if the step data is valid, false otherwise
 */
export const isStepValid = (step: WizardStep, data: ProductWizardData): boolean => {
  return getStepConfig(step).validation(data);
};

/**
 * Determines if navigation to a target step is allowed based on the current state
 * Navigation is only allowed if:
 * 1. Going backward (to a previous step)
 * 2. Going forward one step and the current step is valid
 * 3. Going to any step if all required steps up to that point are valid
 * 
 * @param {WizardStep} currentStep - The current active step
 * @param {WizardStep} targetStep - The step to navigate to
 * @param {ProductWizardData} data - The current product data
 * @returns {boolean} True if navigation is allowed, false otherwise
 */
export const canNavigateToStep = (
  currentStep: WizardStep,
  targetStep: WizardStep,
  data: ProductWizardData
): boolean => {
  // Can always move backward
  if (targetStep < currentStep) {
    return true;
  }
  
  // For forward navigation, check all previous steps
  for (let step = WizardStep.BASIC_INFO; step < targetStep; step++) {
    if (!isStepValid(step, data)) {
      return false;
    }
  }
  
  return true;
};

// Default initial state
const initialState: WizardState = {
  currentStep: WizardStep.BASIC_INFO,
  productData: {
    name: '',
    slug: '',
    description: '',
    price: 0,
    costPrice: 0,
    stock: 0, // Add default stock value
    uploadedImages: []
  },
  isFormDirty: false,
  isLoading: false
};

/**
 * React Context for the Product Wizard
 * Provides state and dispatch function to all child components
 */
const ProductWizardContext = createContext<{
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
} | undefined>(undefined);

/**
 * Reducer function that handles all state transitions in the wizard
 * Follows standard Redux-style reducer pattern with actions and immutable updates
 * 
 * @param {WizardState} state - Current wizard state
 * @param {WizardAction} action - Action to be performed
 * @returns {WizardState} New state after applying the action
 */
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case WizardActionType.SET_STEP:
      return {
        ...state,
        currentStep: action.payload
      };
      
    case WizardActionType.UPDATE_PRODUCT_DATA:
      return {
        ...state,
        productData: {
          ...state.productData,
          ...action.payload
        },
        isFormDirty: true
      };
      
    case WizardActionType.UPDATE_MULTIPLE_FIELDS:
      return {
        ...state,
        productData: {
          ...state.productData,
          ...action.payload
        },
        isFormDirty: true
      };
      
    case WizardActionType.SET_CATALOG_ID:
      return {
        ...state,
        catalogId: action.payload
      };
      
    case WizardActionType.SET_SUPPLIER_ID:
      return {
        ...state,
        supplierId: action.payload
      };
      
    case WizardActionType.ADD_UPLOADED_IMAGE:
      return {
        ...state,
        productData: {
          ...state.productData,
          uploadedImages: [...state.productData.uploadedImages, action.payload],
        },
        isFormDirty: true
      };
      
    case WizardActionType.REMOVE_UPLOADED_IMAGE:
      return {
        ...state,
        productData: {
          ...state.productData,
          uploadedImages: state.productData.uploadedImages.filter(img => {
            if (typeof action.payload === 'number') {
              return img.id !== action.payload;
            } else {
              return img.url !== action.payload;
            }
          }),
        },
        isFormDirty: true
      };
      
    case WizardActionType.SET_MAIN_IMAGE:
      return {
        ...state,
        productData: {
          ...state.productData,
          uploadedImages: state.productData.uploadedImages.map(img => {
            if ((typeof action.payload === 'number' && img.id === action.payload) ||
                (typeof action.payload === 'string' && img.url === action.payload)) {
              return { ...img, isMain: true };
            }
            return { ...img, isMain: false };
          }),
        },
        isFormDirty: true
      };
      
    case WizardActionType.REORDER_IMAGES:
      return {
        ...state,
        productData: {
          ...state.productData,
          uploadedImages: action.payload,
        },
        isFormDirty: true
      };
      
    case WizardActionType.RESET_WIZARD:
      return {
        ...initialState,
        catalogId: state.catalogId, // Preserve catalog ID if set
        supplierId: state.supplierId // Preserve supplier ID if set
      };
      
    default:
      return state;
  }
}

/**
 * Props interface for the ProductWizardProvider component
 * @interface ProductWizardProviderProps
 */
interface ProductWizardProviderProps {
  /** React child components */
  children: ReactNode;
  /** Optional initial data to pre-populate the wizard */
  initialData?: Partial<ProductWizardData>;
  /** Optional catalog ID if creating a product for a specific catalog */
  catalogId?: number;
  /** Optional supplier ID if creating a product for a specific supplier */
  supplierId?: number;
}

/**
 * Provider component that wraps the application with the ProductWizard context
 * Initializes the state with defaults and any provided initial data
 * 
 * @param {ReactNode} children - Child components that will have access to the context
 * @param {Partial<ProductWizardData>} initialData - Optional initial data for the product
 * @param {number} catalogId - Optional catalog ID for the product
 * @param {number} supplierId - Optional supplier ID for the product
 * @returns {JSX.Element} Provider component with context
 */
export const ProductWizardProvider: React.FC<ProductWizardProviderProps> = ({ 
  children, 
  initialData, 
  catalogId, 
  supplierId 
}) => {
  const mergedInitialState: WizardState = {
    ...initialState,
    productData: {
      ...initialState.productData,
      ...(initialData || {})
    },
    catalogId,
    supplierId,
    isFormDirty: false
  };
  
  const [state, dispatch] = useReducer(wizardReducer, mergedInitialState);
  
  return (
    <ProductWizardContext.Provider value={{ state, dispatch }}>
      {children}
    </ProductWizardContext.Provider>
  );
};

/**
 * Custom hook for accessing the ProductWizard context
 * Provides a convenient way to access the wizard state and dispatch functions
 * 
 * @returns {Object} The context object containing state and dispatch function
 * @throws {Error} If used outside of a ProductWizardProvider component
 */
export const useProductWizard = () => {
  const context = useContext(ProductWizardContext);
  
  if (context === undefined) {
    throw new Error('useProductWizard must be used within a ProductWizardProvider');
  }
  
  return context;
};