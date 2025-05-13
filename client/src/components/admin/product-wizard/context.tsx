/**
 * Product Wizard Context
 * 
 * This context provides state management for the product creation wizard.
 * It handles the step navigation, form data, validation, and saving.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UPLOAD_ENDPOINTS, moveTempFilesToProduct } from '@/utils/file-manager';

// Define the wizard steps
export const WIZARD_STEPS = [
  'basic-info',
  'images',
  'additional-info',
  'review'
] as const;

export type WizardStep = typeof WIZARD_STEPS[number];

// Interface for catalog context data
export interface CatalogContextData {
  id: number;
  name: string;
  description: string | null;
  supplierId: number;
  supplierName: string;
  defaultBrand: string | null;
  defaultCategory: {
    id: number;
    name: string;
  } | null;
  defaultTags: string[];
  defaultShippingInfo: {
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
  defaultPricing: {
    markupPercentage?: number;
    recommendedMarkup?: number;
  };
}

// Product wizard state interface
interface ProductWizardState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  
  // Product data
  productId?: number;
  catalogId?: number;
  
  // Basic info
  name: string;
  slug: string;
  description: string;
  sku: string;
  brand: string;
  categoryId: number | null;
  categoryName: string;
  
  // Pricing
  costPrice: number;
  markupPercentage: number;
  regularPrice: number;
  salePrice: number | null;
  saleStartDate: string | null;
  saleEndDate: string | null;
  
  // Inventory
  stockLevel: number;
  backorderEnabled: boolean;
  lowStockThreshold: number;
  
  // Images
  imageUrls: string[];
  imageObjectKeys: string[];
  tempImageObjectKeys: string[];
  mainImageIndex: number;
  
  // Additional info
  isPhysical: boolean;
  weight: number | null;
  weightUnit: string;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string;
  
  // Tags
  tags: string[];
  
  // Visibility
  isActive: boolean;
  isDraft: boolean;
  isFeatured: boolean;
  isNew: boolean;
  freeShipping: boolean;
  
  // Dates
  publishDate: string | null;
  expiryDate: string | null;
}

// Context interface
interface ProductWizardContextType {
  state: ProductWizardState;
  setState: React.Dispatch<React.SetStateAction<ProductWizardState>>;
  currentStep: WizardStep;
  goToStep: (step: WizardStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  updateField: <K extends keyof ProductWizardState>(field: K, value: ProductWizardState[K]) => void;
  isValid: (step?: WizardStep) => boolean;
  validateStep: (step?: WizardStep) => boolean;
  markStepComplete: (step: WizardStep) => void;
  markStepIncomplete: (step: WizardStep) => void;
  createProduct: () => Promise<number | undefined>;
  updateProduct: () => Promise<boolean>;
  isSubmitting: boolean;
  catalogContext: CatalogContextData | null;
  isCatalogContextLoading: boolean;
}

// Initial state
const initialWizardState: ProductWizardState = {
  currentStep: 'basic-info',
  completedSteps: [],
  
  name: '',
  slug: '',
  description: '',
  sku: '',
  brand: '',
  categoryId: null,
  categoryName: '',
  
  costPrice: 0,
  markupPercentage: 30, // Default markup percentage
  regularPrice: 0,
  salePrice: null,
  saleStartDate: null,
  saleEndDate: null,
  
  stockLevel: 1,
  backorderEnabled: false,
  lowStockThreshold: 5,
  
  imageUrls: [],
  imageObjectKeys: [],
  tempImageObjectKeys: [],
  mainImageIndex: 0,
  
  isPhysical: true,
  weight: null,
  weightUnit: 'kg',
  length: null,
  width: null,
  height: null,
  dimensionUnit: 'cm',
  
  tags: [],
  
  isActive: true,
  isDraft: false,
  isFeatured: false,
  isNew: true,
  freeShipping: false,
  
  publishDate: null,
  expiryDate: null
};

// Create context
const ProductWizardContext = createContext<ProductWizardContextType | undefined>(undefined);

// Provider props interface
interface ProductWizardProviderProps {
  children: React.ReactNode;
  initialState?: Partial<ProductWizardState>;
  catalogId?: number;
}

/**
 * Product Wizard Context Provider
 */
export const ProductWizardProvider: React.FC<ProductWizardProviderProps> = ({
  children,
  initialState,
  catalogId
}) => {
  // Initialize state with defaults and any provided initial state
  const [state, setState] = useState<ProductWizardState>({
    ...initialWizardState,
    ...initialState,
    catalogId
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch catalog context if catalogId is provided
  const { 
    data: catalogContext, 
    isLoading: isCatalogContextLoading 
  } = useQuery({
    queryKey: catalogId ? [`/api/catalogs/${catalogId}/context`] : null,
    queryFn: async () => {
      if (!catalogId) return null;
      const response = await fetch(`/api/catalogs/${catalogId}/context`);
      if (!response.ok) throw new Error('Failed to fetch catalog context');
      return response.json().then(res => res.data);
    },
    enabled: !!catalogId
  });
  
  // Apply catalog defaults when catalog context is loaded
  useEffect(() => {
    if (catalogContext && !state.productId) {
      setState(prevState => ({
        ...prevState,
        brand: catalogContext.defaultBrand || prevState.brand,
        categoryId: catalogContext.defaultCategory?.id || prevState.categoryId,
        categoryName: catalogContext.defaultCategory?.name || prevState.categoryName,
        tags: prevState.tags.length ? prevState.tags : catalogContext.defaultTags,
        markupPercentage: prevState.markupPercentage || catalogContext.defaultPricing?.markupPercentage || 30,
        weight: prevState.weight || catalogContext.defaultShippingInfo?.weight,
        weightUnit: prevState.weightUnit || catalogContext.defaultShippingInfo?.weightUnit || 'kg',
        length: prevState.length || catalogContext.defaultShippingInfo?.dimensions?.length,
        width: prevState.width || catalogContext.defaultShippingInfo?.dimensions?.width,
        height: prevState.height || catalogContext.defaultShippingInfo?.dimensions?.height,
        dimensionUnit: prevState.dimensionUnit || catalogContext.defaultShippingInfo?.dimensions?.unit || 'cm',
        freeShipping: prevState.freeShipping || catalogContext.defaultShippingInfo?.freeShipping || false
      }));
    }
  }, [catalogContext, state.productId]);
  
  // Mutations for creating and updating products
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create product');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      if (catalogId) {
        queryClient.invalidateQueries({ queryKey: [`/api/catalogs/${catalogId}/products`] });
      }
    }
  });
  
  const updateProductMutation = useMutation({
    mutationFn: async ({ productId, productData }: { productId: number, productData: any }) => {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update product');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${variables.productId}`] });
      if (catalogId) {
        queryClient.invalidateQueries({ queryKey: [`/api/catalogs/${catalogId}/products`] });
      }
    }
  });
  
  // Navigation functions
  const goToStep = useCallback((step: WizardStep) => {
    setState(prevState => ({
      ...prevState,
      currentStep: step
    }));
  }, []);
  
  const goToNextStep = useCallback(() => {
    setState(prevState => {
      const currentIndex = WIZARD_STEPS.indexOf(prevState.currentStep);
      const nextIndex = Math.min(currentIndex + 1, WIZARD_STEPS.length - 1);
      return {
        ...prevState,
        currentStep: WIZARD_STEPS[nextIndex]
      };
    });
  }, []);
  
  const goToPreviousStep = useCallback(() => {
    setState(prevState => {
      const currentIndex = WIZARD_STEPS.indexOf(prevState.currentStep);
      const prevIndex = Math.max(currentIndex - 1, 0);
      return {
        ...prevState,
        currentStep: WIZARD_STEPS[prevIndex]
      };
    });
  }, []);
  
  // Update a specific field in the state
  const updateField = useCallback(<K extends keyof ProductWizardState>(
    field: K,
    value: ProductWizardState[K]
  ) => {
    setState(prevState => ({
      ...prevState,
      [field]: value
    }));
  }, []);
  
  // Mark a step as complete or incomplete
  const markStepComplete = useCallback((step: WizardStep) => {
    setState(prevState => {
      if (prevState.completedSteps.includes(step)) {
        return prevState;
      }
      return {
        ...prevState,
        completedSteps: [...prevState.completedSteps, step]
      };
    });
  }, []);
  
  const markStepIncomplete = useCallback((step: WizardStep) => {
    setState(prevState => ({
      ...prevState,
      completedSteps: prevState.completedSteps.filter(s => s !== step)
    }));
  }, []);
  
  // Step validation functions
  const validateBasicInfoStep = useCallback((state: ProductWizardState): boolean => {
    if (!state.name || state.name.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Product name is required",
        variant: "destructive"
      });
      return false;
    }
    
    if (!state.slug || state.slug.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Product slug is required",
        variant: "destructive"
      });
      return false;
    }
    
    if (state.costPrice <= 0) {
      toast({
        title: "Validation Error",
        description: "Cost price must be greater than zero",
        variant: "destructive"
      });
      return false;
    }
    
    if (state.regularPrice <= 0) {
      toast({
        title: "Validation Error",
        description: "Regular price must be greater than zero",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  }, [toast]);
  
  const validateImagesStep = useCallback((state: ProductWizardState): boolean => {
    // Images are technically optional, but we'll warn if there are none
    if (state.imageUrls.length === 0) {
      toast({
        title: "Warning",
        description: "No images have been added. Products with images perform better.",
        variant: "warning"
      });
    }
    
    return true;
  }, [toast]);
  
  const validateAdditionalInfoStep = useCallback((state: ProductWizardState): boolean => {
    // If physical, validate physical properties
    if (state.isPhysical) {
      if (state.weight !== null && state.weight <= 0) {
        toast({
          title: "Validation Error",
          description: "Weight must be greater than zero",
          variant: "destructive"
        });
        return false;
      }
    }
    
    return true;
  }, [toast]);
  
  const validateReviewStep = useCallback((state: ProductWizardState): boolean => {
    // The review step is a summary, so we validate all previous steps
    const isBasicValid = validateBasicInfoStep(state);
    const isImagesValid = validateImagesStep(state);
    const isAdditionalValid = validateAdditionalInfoStep(state);
    
    return isBasicValid && isImagesValid && isAdditionalValid;
  }, [validateBasicInfoStep, validateImagesStep, validateAdditionalInfoStep]);
  
  // Validate a specific step or the current step
  const validateStep = useCallback((step?: WizardStep): boolean => {
    const stepToValidate = step || state.currentStep;
    
    let isValid = false;
    
    switch (stepToValidate) {
      case 'basic-info':
        isValid = validateBasicInfoStep(state);
        break;
      case 'images':
        isValid = validateImagesStep(state);
        break;
      case 'additional-info':
        isValid = validateAdditionalInfoStep(state);
        break;
      case 'review':
        isValid = validateReviewStep(state);
        break;
      default:
        isValid = false;
    }
    
    if (isValid) {
      markStepComplete(stepToValidate);
    } else {
      markStepIncomplete(stepToValidate);
    }
    
    return isValid;
  }, [
    state,
    validateBasicInfoStep,
    validateImagesStep,
    validateAdditionalInfoStep,
    validateReviewStep,
    markStepComplete,
    markStepIncomplete
  ]);
  
  // Check if a step is valid without displaying errors
  const isValid = useCallback((step?: WizardStep): boolean => {
    if (!step) {
      // Check all steps
      return WIZARD_STEPS.every(step => {
        switch (step) {
          case 'basic-info':
            return validateBasicInfoStep(state);
          case 'images':
            return validateImagesStep(state);
          case 'additional-info':
            return validateAdditionalInfoStep(state);
          case 'review':
            return validateReviewStep(state);
          default:
            return false;
        }
      });
    }
    
    switch (step) {
      case 'basic-info':
        return validateBasicInfoStep(state);
      case 'images':
        return validateImagesStep(state);
      case 'additional-info':
        return validateAdditionalInfoStep(state);
      case 'review':
        return validateReviewStep(state);
      default:
        return false;
    }
  }, [
    state,
    validateBasicInfoStep,
    validateImagesStep,
    validateAdditionalInfoStep,
    validateReviewStep
  ]);
  
  // Create or update product
  const createProduct = useCallback(async (): Promise<number | undefined> => {
    try {
      setIsSubmitting(true);
      
      // Validate all steps
      if (!isValid()) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in all steps before saving",
          variant: "destructive"
        });
        return undefined;
      }
      
      // Prepare product data
      const productData = {
        name: state.name,
        slug: state.slug,
        description: state.description,
        sku: state.sku,
        brand: state.brand,
        categoryId: state.categoryId,
        
        costPrice: state.costPrice,
        regularPrice: state.regularPrice,
        salePrice: state.salePrice,
        saleStartDate: state.saleStartDate,
        saleEndDate: state.saleEndDate,
        
        stockLevel: state.stockLevel,
        backorderEnabled: state.backorderEnabled,
        lowStockThreshold: state.lowStockThreshold,
        
        isPhysical: state.isPhysical,
        weight: state.weight,
        weightUnit: state.weightUnit,
        length: state.length,
        width: state.width,
        height: state.height,
        dimensionUnit: state.dimensionUnit,
        
        tags: state.tags,
        
        isActive: state.isActive && !state.isDraft,
        isDraft: state.isDraft,
        isFeatured: state.isFeatured,
        isNew: state.isNew,
        freeShipping: state.freeShipping,
        
        publishDate: state.publishDate,
        expiryDate: state.expiryDate,
        
        catalogId: state.catalogId,
        
        // Image data
        imageObjectKeys: state.tempImageObjectKeys,
        mainImageIndex: state.mainImageIndex
      };
      
      // Create the product
      const result = await createProductMutation.mutateAsync(productData);
      
      if (result.data?.id) {
        // Success
        toast({
          title: "Success",
          description: "Product created successfully",
        });
        
        // If there are temporary images, move them to the product
        if (state.tempImageObjectKeys.length > 0) {
          try {
            await moveTempFilesToProduct(result.data.id, state.tempImageObjectKeys);
          } catch (error) {
            console.error('Error moving temporary images:', error);
            toast({
              title: "Warning",
              description: "Product created, but there was an issue with moving image files",
              variant: "warning"
            });
          }
        }
        
        // Update state with the new product ID
        setState(prevState => ({
          ...prevState,
          productId: result.data.id
        }));
        
        return result.data.id;
      }
      
      return undefined;
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive"
      });
      return undefined;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    state,
    isValid,
    createProductMutation,
    toast
  ]);
  
  const updateProduct = useCallback(async (): Promise<boolean> => {
    if (!state.productId) {
      return false;
    }
    
    try {
      setIsSubmitting(true);
      
      // Validate all steps
      if (!isValid()) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in all steps before saving",
          variant: "destructive"
        });
        return false;
      }
      
      // Prepare product data
      const productData = {
        name: state.name,
        slug: state.slug,
        description: state.description,
        sku: state.sku,
        brand: state.brand,
        categoryId: state.categoryId,
        
        costPrice: state.costPrice,
        regularPrice: state.regularPrice,
        salePrice: state.salePrice,
        saleStartDate: state.saleStartDate,
        saleEndDate: state.saleEndDate,
        
        stockLevel: state.stockLevel,
        backorderEnabled: state.backorderEnabled,
        lowStockThreshold: state.lowStockThreshold,
        
        isPhysical: state.isPhysical,
        weight: state.weight,
        weightUnit: state.weightUnit,
        length: state.length,
        width: state.width,
        height: state.height,
        dimensionUnit: state.dimensionUnit,
        
        tags: state.tags,
        
        isActive: state.isActive && !state.isDraft,
        isDraft: state.isDraft,
        isFeatured: state.isFeatured,
        isNew: state.isNew,
        freeShipping: state.freeShipping,
        
        publishDate: state.publishDate,
        expiryDate: state.expiryDate,
        
        catalogId: state.catalogId,
        
        // Image data
        imageObjectKeys: [
          ...state.imageObjectKeys,
          ...state.tempImageObjectKeys
        ],
        mainImageIndex: state.mainImageIndex
      };
      
      // Update the product
      await updateProductMutation.mutateAsync({
        productId: state.productId,
        productData
      });
      
      // If there are temporary images, move them to the product
      if (state.tempImageObjectKeys.length > 0) {
        try {
          await moveTempFilesToProduct(state.productId, state.tempImageObjectKeys);
          
          // Clear temp image keys after moving
          setState(prevState => ({
            ...prevState,
            tempImageObjectKeys: [],
            imageObjectKeys: [
              ...prevState.imageObjectKeys,
              ...prevState.tempImageObjectKeys
            ]
          }));
        } catch (error) {
          console.error('Error moving temporary images:', error);
          toast({
            title: "Warning",
            description: "Product updated, but there was an issue with moving image files",
            variant: "warning"
          });
        }
      }
      
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      
      return true;
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    state,
    isValid,
    updateProductMutation,
    toast
  ]);
  
  // Context value
  const contextValue: ProductWizardContextType = {
    state,
    setState,
    currentStep: state.currentStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    updateField,
    isValid,
    validateStep,
    markStepComplete,
    markStepIncomplete,
    createProduct,
    updateProduct,
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

// Hook for using the context
export const useProductWizardContext = () => {
  const context = useContext(ProductWizardContext);
  if (!context) {
    throw new Error('useProductWizardContext must be used within a ProductWizardProvider');
  }
  return context;
};