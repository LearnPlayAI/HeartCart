/**
 * Product Wizard Context
 * 
 * This file provides context and state management for the product wizard.
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

// Step configuration with labels and validation rules
interface StepConfig {
  label: string;
  description: string;
  validation: (data: ProductWizardData) => boolean;
}

// Configuration for each wizard step
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

// Check if the current step's data is valid
export const isStepValid = (step: WizardStep, data: ProductWizardData): boolean => {
  return getStepConfig(step).validation(data);
};

// Check if navigation to a step is allowed
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
    uploadedImages: []
  },
  isFormDirty: false,
  isLoading: false
};

// Context creation
const ProductWizardContext = createContext<{
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
} | undefined>(undefined);

// Reducer for state management
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

// Provider component
interface ProductWizardProviderProps {
  children: ReactNode;
  initialData?: Partial<ProductWizardData>;
  catalogId?: number;
  supplierId?: number;
}

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

// Custom hook for accessing the context
export const useProductWizard = () => {
  const context = useContext(ProductWizardContext);
  
  if (context === undefined) {
    throw new Error('useProductWizard must be used within a ProductWizardProvider');
  }
  
  return context;
};