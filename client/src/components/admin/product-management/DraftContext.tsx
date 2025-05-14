/**
 * Draft Context
 * 
 * This component provides a context for managing product drafts,
 * including creating, loading, and updating drafts.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useParams, useLocation, useNavigate } from 'wouter';

// Define the draft type
export interface ProductDraft {
  id?: number;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  price?: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  sku?: string | null;
  brand?: string | null;
  categoryId?: number | null;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  onSale?: boolean;
  salePrice?: number | null;
  weight?: number | null;
  dimensions?: string | null;
  taxRatePercentage?: number | null;
  imageUrls?: string[];
  mainImageIndex?: number | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  canonicalUrl?: string | null;
  published?: boolean;
  publishedProductId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

// Context interface
interface DraftContextType {
  draft: ProductDraft | null;
  loading: boolean;
  error: string | null;
  createDraft: () => Promise<ProductDraft | null>;
  loadDraft: (draftId: number) => Promise<void>;
  updateDraft: (updates: Partial<ProductDraft>) => Promise<void>;
  saveDraft: () => Promise<void>;
  publishDraft: () => Promise<void>;
  deleteDraft: () => Promise<void>;
}

// Create context with default values
const DraftContext = createContext<DraftContextType>({
  draft: null,
  loading: false,
  error: null,
  createDraft: async () => null,
  loadDraft: async () => {},
  updateDraft: async () => {},
  saveDraft: async () => {},
  publishDraft: async () => {},
  deleteDraft: async () => {},
});

// Context provider props
interface DraftProviderProps {
  children: ReactNode;
  initialDraftId?: number;
}

// Provider component
export function DraftProvider({ children, initialDraftId }: DraftProviderProps) {
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Load initial draft if ID is provided
  useEffect(() => {
    if (initialDraftId) {
      loadDraft(initialDraftId).catch(err => {
        console.error('Error loading initial draft:', err);
        toast({
          title: 'Error Loading Draft',
          description: 'Could not load the product draft. Please try again.',
          variant: 'destructive',
        });
      });
    }
  }, [initialDraftId]);
  
  // Create a new draft
  const createDraft = async (): Promise<ProductDraft | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest('/api/product-drafts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Product',
          slug: 'new-product',
          description: '',
          shortDescription: '',
          price: 0,
        }),
      });
      
      if (response.success && response.data) {
        setDraft(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create draft');
      }
    } catch (err) {
      console.error('Create draft error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Load a draft by ID
  const loadDraft = async (draftId: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest(`/api/product-drafts/${draftId}`);
      
      if (response.success && response.data) {
        setDraft(response.data);
      } else {
        throw new Error(response.message || 'Failed to load draft');
      }
    } catch (err) {
      console.error('Load draft error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  // Update draft with partial data
  const updateDraft = async (updates: Partial<ProductDraft>): Promise<void> => {
    setDraft(prev => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  };
  
  // Save the current draft to the server
  const saveDraft = async (): Promise<void> => {
    if (!draft || !draft.id) {
      setError('No draft to save');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await apiRequest(`/api/product-drafts/${draft.id}`, {
        method: 'PATCH',
        body: JSON.stringify(draft),
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to save draft');
      }
      
      // Update with any server-side changes
      if (response.data) {
        setDraft(response.data);
      }
    } catch (err) {
      console.error('Save draft error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Publish the draft as a live product
  const publishDraft = async (): Promise<void> => {
    if (!draft || !draft.id) {
      setError('No draft to publish');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await apiRequest(`/api/product-drafts/${draft.id}/publish`, {
        method: 'POST',
      });
      
      if (response.success && response.data) {
        setDraft(response.data);
        
        toast({
          title: 'Product Published',
          description: 'The product has been published successfully.',
        });
        
        // If there's a published product ID, redirect to the product
        if (response.data.publishedProductId) {
          setLocation(`/admin/products/${response.data.publishedProductId}`);
        }
      } else {
        throw new Error(response.message || 'Failed to publish product');
      }
    } catch (err) {
      console.error('Publish draft error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      toast({
        title: 'Publish Error',
        description: err instanceof Error ? err.message : 'Could not publish the product.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Delete the current draft
  const deleteDraft = async (): Promise<void> => {
    if (!draft || !draft.id) {
      setError('No draft to delete');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await apiRequest(`/api/product-drafts/${draft.id}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        setDraft(null);
        
        toast({
          title: 'Draft Deleted',
          description: 'The product draft has been deleted.',
        });
        
        // Redirect to the products list
        setLocation('/admin/product-management');
      } else {
        throw new Error(response.message || 'Failed to delete draft');
      }
    } catch (err) {
      console.error('Delete draft error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      toast({
        title: 'Delete Error',
        description: err instanceof Error ? err.message : 'Could not delete the draft.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Context value
  const contextValue: DraftContextType = {
    draft,
    loading,
    error,
    createDraft,
    loadDraft,
    updateDraft,
    saveDraft,
    publishDraft,
    deleteDraft,
  };
  
  return (
    <DraftContext.Provider value={contextValue}>
      {children}
    </DraftContext.Provider>
  );
}

// Custom hook to use the draft context
export function useDraftContext() {
  const context = useContext(DraftContext);
  
  if (!context) {
    throw new Error('useDraftContext must be used within a DraftProvider');
  }
  
  return context;
}