/**
 * Product Wizard Context
 * 
 * This file provides the state management context for the product wizard.
 * It uses React Context API with useReducer for complex state management.
 */

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import {
  ProductWizardState,
  WizardStep,
  ProductWizardData,
  WizardAction,
  WizardActionType,
  ProductStatus,
  UploadedImage,
  ProductAttribute
} from './types';

// Initial data state
const initialProductData: ProductWizardData = {
  name: '',
  slug: '',
  description: '',
  categoryId: null,
  price: 0,
  costPrice: 0,
  salePrice: null,
  discount: 0,
  discountLabel: '',
  minimumPrice: 0,
  
  imageUrl: null,
  additionalImages: [],
  uploadedImages: [],
  
  sku: '',
  brand: '',
  minimumOrder: 1,
  tags: [],
  shortDescription: '',
  
  selectedAttributes: [],
  requiredAttributeIds: [],
  
  isFlashDeal: false,
  flashDealStart: null,
  flashDealEnd: null,
  freeShipping: false,
  isFeatured: false,
  specialSaleText: '',
  specialSaleStart: null,
  specialSaleEnd: null,
  
  status: ProductStatus.DRAFT
};

// Initial wizard state
const initialState: ProductWizardState = {
  currentStep: WizardStep.BASIC_INFO,
  isLoading: false,
  isDirty: false,
  isSubmitting: false,
  validationErrors: {},
  
  catalogId: null,
  supplierId: null,
  
  productData: initialProductData
};

// Context setup
type ProductWizardContextType = {
  state: ProductWizardState;
  dispatch: React.Dispatch<WizardAction>;
};

const ProductWizardContext = createContext<ProductWizardContextType | undefined>(undefined);

// Wizard state reducer
function wizardReducer(state: ProductWizardState, action: WizardAction): ProductWizardState {
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
        isDirty: true
      };
      
    case WizardActionType.SET_VALIDATION_ERRORS:
      return {
        ...state,
        validationErrors: action.payload
      };
      
    case WizardActionType.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
      
    case WizardActionType.SET_SUBMITTING:
      return {
        ...state,
        isSubmitting: action.payload
      };
      
    case WizardActionType.RESET_WIZARD:
      return {
        ...initialState,
        catalogId: state.catalogId,
        supplierId: state.supplierId
      };
      
    case WizardActionType.SET_DIRTY:
      return {
        ...state,
        isDirty: action.payload
      };
      
    case WizardActionType.INITIALIZE_WITH_CATALOG:
      return {
        ...state,
        catalogId: action.payload.catalogId,
        supplierId: action.payload.supplierId
      };
      
    case WizardActionType.INITIALIZE_WITH_PRODUCT:
      return {
        ...state,
        productData: {
          ...initialProductData,
          ...action.payload
        },
        isDirty: false
      };
      
    case WizardActionType.ADD_UPLOADED_IMAGE:
      // If this is the first image, set it as main
      const isMain = state.productData.uploadedImages.length === 0 ? true : action.payload.isMain;
      const newImage = { ...action.payload, isMain };
      
      return {
        ...state,
        productData: {
          ...state.productData,
          uploadedImages: [...state.productData.uploadedImages, newImage],
          // Update imageUrl if this is the main image
          imageUrl: isMain ? newImage.url : state.productData.imageUrl
        },
        isDirty: true
      };
      
    case WizardActionType.REMOVE_UPLOADED_IMAGE: {
      // Filter out the removed image
      const updatedImages = state.productData.uploadedImages.filter(img => 
        typeof action.payload === 'number' 
          ? img.id !== action.payload 
          : img.url !== action.payload
      );
      
      // Check if we've removed the main image
      const removedMainImage = state.productData.uploadedImages.find(img => 
        img.isMain && (
          typeof action.payload === 'number' 
            ? img.id === action.payload 
            : img.url === action.payload
        )
      );
      
      // Set a new main image if we removed the current one and there are other images
      let newMainImageUrl = state.productData.imageUrl;
      if (removedMainImage && updatedImages.length > 0) {
        // Set the first image as main
        updatedImages[0].isMain = true;
        newMainImageUrl = updatedImages[0].url;
      } else if (removedMainImage) {
        // No images left
        newMainImageUrl = null;
      }
      
      return {
        ...state,
        productData: {
          ...state.productData,
          uploadedImages: updatedImages,
          imageUrl: newMainImageUrl
        },
        isDirty: true
      };
    }
      
    case WizardActionType.SET_MAIN_IMAGE: {
      // Update isMain flag for all images
      const updatedImages = state.productData.uploadedImages.map(img => {
        const isMain = typeof action.payload === 'number' 
          ? img.id === action.payload 
          : img.url === action.payload;
          
        return { ...img, isMain };
      });
      
      // Find the new main image
      const newMainImage = updatedImages.find(img => img.isMain);
      
      return {
        ...state,
        productData: {
          ...state.productData,
          uploadedImages: updatedImages,
          imageUrl: newMainImage ? newMainImage.url : null
        },
        isDirty: true
      };
    }
      
    case WizardActionType.REORDER_IMAGES:
      return {
        ...state,
        productData: {
          ...state.productData,
          uploadedImages: action.payload
        },
        isDirty: true
      };
      
    case WizardActionType.ADD_PRODUCT_ATTRIBUTE:
      return {
        ...state,
        productData: {
          ...state.productData,
          selectedAttributes: [...state.productData.selectedAttributes, action.payload]
        },
        isDirty: true
      };
      
    case WizardActionType.REMOVE_PRODUCT_ATTRIBUTE: {
      // Remove the attribute
      const updatedAttributes = state.productData.selectedAttributes.filter(
        attr => attr.attributeId !== action.payload
      );
      
      // Also remove from required attributes if it was there
      const updatedRequiredAttributes = state.productData.requiredAttributeIds.filter(
        id => id !== action.payload
      );
      
      return {
        ...state,
        productData: {
          ...state.productData,
          selectedAttributes: updatedAttributes,
          requiredAttributeIds: updatedRequiredAttributes
        },
        isDirty: true
      };
    }
      
    case WizardActionType.TOGGLE_REQUIRED_ATTRIBUTE: {
      const { attributeId, isRequired } = action.payload;
      
      // Update the required attributes list
      let requiredAttributeIds = [...state.productData.requiredAttributeIds];
      
      if (isRequired && !requiredAttributeIds.includes(attributeId)) {
        // Add to required attributes
        requiredAttributeIds.push(attributeId);
      } else if (!isRequired) {
        // Remove from required attributes
        requiredAttributeIds = requiredAttributeIds.filter(id => id !== attributeId);
      }
      
      return {
        ...state,
        productData: {
          ...state.productData,
          requiredAttributeIds
        },
        isDirty: true
      };
    }
      
    case WizardActionType.UPDATE_ATTRIBUTE_OPTIONS: {
      // Find and update the attribute's options
      const updatedAttributes = state.productData.selectedAttributes.map(attr => {
        if (attr.attributeId === action.payload.attributeId) {
          return {
            ...attr,
            options: action.payload.options
          };
        }
        return attr;
      });
      
      return {
        ...state,
        productData: {
          ...state.productData,
          selectedAttributes: updatedAttributes
        },
        isDirty: true
      };
    }
      
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
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  
  // Initialize with catalog context if provided
  useEffect(() => {
    if (catalogId && supplierId) {
      dispatch({
        type: WizardActionType.INITIALIZE_WITH_CATALOG,
        payload: { catalogId, supplierId }
      });
    }
  }, [catalogId, supplierId]);
  
  // Initialize with product data if provided
  useEffect(() => {
    if (initialData) {
      dispatch({
        type: WizardActionType.INITIALIZE_WITH_PRODUCT,
        payload: initialData as ProductWizardData
      });
    }
  }, [initialData]);
  
  // Auto-save draft functionality would be implemented here
  useEffect(() => {
    // Skip initial render or when not dirty
    if (!state.isDirty) return;
    
    // Debounced auto-save logic would go here
    // For now, just log that we would save
    console.log('Would auto-save draft:', state.productData);
    
    // In actual implementation:
    // const saveTimeout = setTimeout(() => saveProductDraft(state.productData), 2000);
    // return () => clearTimeout(saveTimeout);
  }, [state.productData, state.isDirty]);
  
  return (
    <ProductWizardContext.Provider value={{ state, dispatch }}>
      {children}
    </ProductWizardContext.Provider>
  );
};

// Custom hook for accessing the wizard context
export function useProductWizard() {
  const context = useContext(ProductWizardContext);
  
  if (context === undefined) {
    throw new Error('useProductWizard must be used within a ProductWizardProvider');
  }
  
  return context;
}

// Utility functions for the wizard
export function getStepConfig() {
  return [
    {
      id: WizardStep.BASIC_INFO,
      label: 'Basic Information',
      description: 'Enter the essential details about your product'
    },
    {
      id: WizardStep.PRODUCT_IMAGES,
      label: 'Product Images',
      description: 'Upload and manage product images'
    },
    {
      id: WizardStep.ADDITIONAL_INFO,
      label: 'Additional Information',
      description: 'Add detailed product attributes and specifications'
    },
    {
      id: WizardStep.REVIEW_SAVE,
      label: 'Review & Save',
      description: 'Review all product details before saving'
    }
  ];
}

// Navigation helper functions
export function canNavigateToStep(state: ProductWizardState, step: WizardStep): boolean {
  const currentStepIndex = getStepConfig().findIndex(s => s.id === state.currentStep);
  const targetStepIndex = getStepConfig().findIndex(s => s.id === step);
  
  // Can always go back or to current step
  if (targetStepIndex <= currentStepIndex) {
    return true;
  }
  
  // Can only go to next step if current step is valid
  return targetStepIndex === currentStepIndex + 1 && isStepValid(state, state.currentStep);
}

// Step validation
export function isStepValid(state: ProductWizardState, step: WizardStep): boolean {
  const { productData } = state;
  
  switch (step) {
    case WizardStep.BASIC_INFO:
      return (
        !!productData.name &&
        !!productData.slug &&
        !!productData.categoryId &&
        productData.price > 0 &&
        productData.costPrice >= 0
      );
      
    case WizardStep.PRODUCT_IMAGES:
      // At least one image is required
      return productData.uploadedImages.length > 0;
      
    case WizardStep.ADDITIONAL_INFO:
      // SKU is required
      return !!productData.sku;
      
    case WizardStep.REVIEW_SAVE:
      // All steps must be valid before review
      return (
        isStepValid(state, WizardStep.BASIC_INFO) &&
        isStepValid(state, WizardStep.PRODUCT_IMAGES) &&
        isStepValid(state, WizardStep.ADDITIONAL_INFO)
      );
      
    default:
      return false;
  }
}