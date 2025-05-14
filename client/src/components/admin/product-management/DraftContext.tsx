/**
 * Product Draft Context
 * 
 * This context provides draft state management for the product wizard.
 * It follows a database-first approach where all changes persist to the
 * database immediately for a single source of truth.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debounce } from '@/lib/utils';

// Types
export type WizardStep = 'basic-info' | 'images' | 'pricing' | 'attributes' | 'promotions' | 'review';

export interface ProductDraft {
  id: number;
  originalProductId?: number;
  name?: string;
  slug?: string;
  sku?: string;
  description?: string;
  brand?: string;
  categoryId?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  costPrice?: number;
  regularPrice?: number;
  salePrice?: number;
  onSale?: boolean;
  markupPercentage?: number;
  imageUrls?: string[];
  imageObjectKeys?: string[];
  mainImageIndex?: number;
  attributes?: any[];
  supplierId?: number;
  weight?: string;
  dimensions?: string;
  discountLabel?: string;
  specialSaleText?: string;
  specialSaleStart?: Date | string | null;
  specialSaleEnd?: Date | string | null;
  isFlashDeal?: boolean;
  flashDealEnd?: Date | string | null;
  taxable?: boolean;
  taxClass?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  wizardProgress?: {
    [key in WizardStep]?: boolean;
  };
  draftStatus?: 'draft' | 'review' | 'ready';
  createdBy?: number;
  createdAt?: Date | string;
  lastModified?: Date | string;
}

interface DraftContextType {
  // Draft data
  draft: ProductDraft | null;
  draftId: number | null;
  draftLoading: boolean;
  draftError: Error | null;
  
  // Step management
  currentStep: WizardStep;
  setCurrentStep: (step: WizardStep) => void;
  isStepValid: (step: WizardStep) => boolean;
  validateStep: (step: WizardStep) => Promise<boolean>;
  
  // Draft operations
  updateDraft: <K extends keyof ProductDraft>(field: K, value: ProductDraft[K]) => void;
  updateDraftStep: (step: WizardStep, data: Partial<ProductDraft>) => Promise<void>;
  publishDraft: () => Promise<any>;
  discardDraft: () => Promise<boolean>;
  
  // Image operations
  uploadImages: (files: File[]) => Promise<void>;
  removeImage: (index: number) => Promise<void>;
  reorderImages: (newOrder: number[]) => Promise<void>;
  setMainImage: (index: number) => Promise<void>;
  
  // Helper functions
  refreshDraft: () => void;
  isDirty: boolean;
  isSaving: boolean;
  resetDirtyState: () => void;
}

const DraftContext = createContext<DraftContextType | undefined>(undefined);

interface DraftProviderProps {
  children: ReactNode;
  draftId?: number | null;
  productId?: number | null;
}

export const DraftProvider: React.FC<DraftProviderProps> = ({ 
  children, 
  draftId: initialDraftId, 
  productId 
}) => {
  // State
  const [draftId, setDraftId] = useState<number | null>(initialDraftId || null);
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic-info');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Query client for cache invalidation
  const queryClient = useQueryClient();
  
  // Fetch draft data
  const { 
    data: draftData,
    isLoading: draftLoading,
    error: draftError,
    refetch: refreshDraft
  } = useQuery({
    queryKey: ['product-draft', draftId],
    queryFn: async () => {
      if (!draftId) {
        return null;
      }
      
      const response = await fetch(`/api/product-drafts/${draftId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch draft');
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    },
    enabled: !!draftId
  });
  
  // Create draft mutation
  const { mutateAsync: createDraft } = useMutation({
    mutationFn: async () => {
      const payload: any = { draftStatus: 'draft' };
      
      if (productId) {
        payload.originalProductId = productId;
      }
      
      const response = await fetch('/api/product-drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create draft');
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    },
    onSuccess: (newDraft) => {
      if (newDraft?.id) {
        setDraftId(newDraft.id);
      }
    }
  });
  
  // Update draft mutation
  const { mutateAsync: updateDraftMutation } = useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: number; 
      data: Partial<ProductDraft> 
    }) => {
      setIsSaving(true);
      
      const response = await fetch(`/api/product-drafts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update draft');
      }
      
      const responseData = await response.json();
      return responseData.success ? responseData.data : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-draft', draftId] });
      setIsDirty(false);
    },
    onSettled: () => {
      setIsSaving(false);
    }
  });
  
  // Update step data mutation
  const { mutateAsync: updateStepMutation } = useMutation({
    mutationFn: async ({ 
      id, 
      step, 
      data 
    }: { 
      id: number; 
      step: WizardStep; 
      data: Partial<ProductDraft> 
    }) => {
      setIsSaving(true);
      
      const response = await fetch(`/api/product-drafts/${id}/step/${step}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update step: ${step}`);
      }
      
      const responseData = await response.json();
      return responseData.success ? responseData.data : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-draft', draftId] });
      setIsDirty(false);
    },
    onSettled: () => {
      setIsSaving(false);
    }
  });
  
  // Publish draft mutation
  const { mutateAsync: publishDraftMutation } = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/product-drafts/${id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to publish draft');
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
  
  // Discard draft mutation
  const { mutateAsync: discardDraftMutation } = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/product-drafts/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to discard draft');
      }
      
      return true;
    }
  });
  
  // Initialize draft if needed
  useEffect(() => {
    const initializeDraft = async () => {
      if (!draftId && !draftLoading) {
        try {
          await createDraft();
        } catch (error) {
          console.error('Failed to create draft:', error);
        }
      }
    };
    
    initializeDraft();
  }, [draftId, draftLoading, createDraft]);
  
  // Debounced update function
  const debouncedUpdate = useCallback(
    debounce(async (id: number, data: Partial<ProductDraft>) => {
      try {
        await updateDraftMutation({ id, data });
      } catch (error) {
        console.error('Failed to update draft:', error);
      }
    }, 500),
    [updateDraftMutation]
  );
  
  // Helper function to update draft data
  const updateDraft = useCallback(<K extends keyof ProductDraft>(
    field: K, 
    value: ProductDraft[K]
  ) => {
    if (!draftId) return;
    
    setIsDirty(true);
    
    // Update local state immediately for responsive UI
    const newDraft = { ...draftData, [field]: value };
    queryClient.setQueryData(['product-draft', draftId], newDraft);
    
    // Send update to server with debounce
    debouncedUpdate(draftId, { [field]: value });
  }, [draftId, draftData, queryClient, debouncedUpdate]);
  
  // Function to update an entire step at once
  const updateDraftStep = useCallback(async (
    step: WizardStep, 
    data: Partial<ProductDraft>
  ) => {
    if (!draftId) return;
    
    try {
      setIsDirty(true);
      
      // Update wizard progress
      const wizardProgress = {
        ...(draftData?.wizardProgress || {}),
        [step]: true
      };
      
      // Combine step data with progress update
      const updateData = {
        ...data,
        wizardProgress
      };
      
      await updateStepMutation({ 
        id: draftId, 
        step, 
        data: updateData 
      });
      
      // Mark step as complete and move to next step if needed
    } catch (error) {
      console.error(`Failed to update step ${step}:`, error);
    }
  }, [draftId, draftData, updateStepMutation]);
  
  // Function to validate a specific step
  const validateStep = useCallback(async (step: WizardStep): Promise<boolean> => {
    if (!draftId) return false;
    
    try {
      const response = await fetch(`/api/product-drafts/${draftId}/validation/${step}`);
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.success ? data.data.valid : false;
    } catch (error) {
      console.error(`Failed to validate step ${step}:`, error);
      return false;
    }
  }, [draftId]);
  
  // Function to check if a step is valid
  const isStepValid = useCallback((step: WizardStep): boolean => {
    if (!draftData?.wizardProgress) return false;
    return !!draftData.wizardProgress[step];
  }, [draftData]);
  
  // Function to publish the draft
  const publishDraft = useCallback(async () => {
    if (!draftId) return null;
    
    try {
      return await publishDraftMutation(draftId);
    } catch (error) {
      console.error('Failed to publish draft:', error);
      throw error;
    }
  }, [draftId, publishDraftMutation]);
  
  // Function to discard the draft
  const discardDraft = useCallback(async () => {
    if (!draftId) return false;
    
    try {
      return await discardDraftMutation(draftId);
    } catch (error) {
      console.error('Failed to discard draft:', error);
      return false;
    }
  }, [draftId, discardDraftMutation]);
  
  // Image upload function
  const uploadImages = useCallback(async (files: File[]) => {
    if (!draftId || !files.length) return;
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });
      
      const response = await fetch(`/api/product-drafts/${draftId}/images`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload images');
      }
      
      await queryClient.invalidateQueries({ queryKey: ['product-draft', draftId] });
    } catch (error) {
      console.error('Failed to upload images:', error);
    }
  }, [draftId, queryClient]);
  
  // Remove image function
  const removeImage = useCallback(async (index: number) => {
    if (!draftId) return;
    
    try {
      const response = await fetch(`/api/product-drafts/${draftId}/images/${index}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove image');
      }
      
      await queryClient.invalidateQueries({ queryKey: ['product-draft', draftId] });
    } catch (error) {
      console.error('Failed to remove image:', error);
    }
  }, [draftId, queryClient]);
  
  // Reorder images function
  const reorderImages = useCallback(async (newOrder: number[]) => {
    if (!draftId) return;
    
    try {
      const response = await fetch(`/api/product-drafts/${draftId}/images/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order: newOrder })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reorder images');
      }
      
      await queryClient.invalidateQueries({ queryKey: ['product-draft', draftId] });
    } catch (error) {
      console.error('Failed to reorder images:', error);
    }
  }, [draftId, queryClient]);
  
  // Set main image function
  const setMainImage = useCallback(async (index: number) => {
    if (!draftId) return;
    
    try {
      await updateDraftMutation({ 
        id: draftId, 
        data: { mainImageIndex: index } 
      });
    } catch (error) {
      console.error('Failed to set main image:', error);
    }
  }, [draftId, updateDraftMutation]);
  
  // Reset dirty state
  const resetDirtyState = useCallback(() => {
    setIsDirty(false);
  }, []);
  
  // Context value
  const value: DraftContextType = {
    draft: draftData,
    draftId,
    draftLoading,
    draftError,
    
    currentStep,
    setCurrentStep,
    isStepValid,
    validateStep,
    
    updateDraft,
    updateDraftStep,
    publishDraft,
    discardDraft,
    
    uploadImages,
    removeImage,
    reorderImages,
    setMainImage,
    
    refreshDraft,
    isDirty,
    isSaving,
    resetDirtyState
  };
  
  return (
    <DraftContext.Provider value={value}>
      {children}
    </DraftContext.Provider>
  );
};

// Custom hook for using the draft context
export const useDraft = () => {
  const context = useContext(DraftContext);
  
  if (context === undefined) {
    throw new Error('useDraft must be used within a DraftProvider');
  }
  
  return context;
};