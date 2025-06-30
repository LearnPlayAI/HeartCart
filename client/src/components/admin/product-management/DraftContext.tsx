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

// Define the draft type based on the database schema
export interface ProductDraft {
  id?: number;
  originalProductId?: number | null;
  draftStatus: string;
  createdBy?: number;
  createdAt?: string;
  lastModified?: string;
  
  // Basic product information
  name: string;
  slug: string;
  sku?: string | null;
  description?: string | null;
  brand?: string | null;
  categoryId?: number | null;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  isActive?: boolean;
  isFeatured?: boolean;
  
  // Pricing information
  costPrice?: number | null;
  regularPrice?: number | null;
  salePrice?: number | null;
  onSale?: boolean;
  markupPercentage?: number | null;
  
  // Images
  imageUrls?: string[];
  imageObjectKeys?: string[];
  mainImageIndex?: number | null;
  
  // Inventory
  stockLevel?: number | null;
  lowStockThreshold?: number | null;
  backorderEnabled?: boolean;
  
  // Attributes (stored as JSON)
  attributes?: any[];
  
  // Supplier information
  supplierId?: number | null;
  
  // Physical properties
  weight?: string | null;
  dimensions?: string | null;
  
  // Promotions
  discountLabel?: string | null;
  specialSaleText?: string | null;
  specialSaleStart?: string | null;
  specialSaleEnd?: string | null;
  isFlashDeal?: boolean;
  
  // SEO
  metaTitle?: string | null;
  metaDescription?: string | null;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
  
  // Wizard progress
  wizardProgress?: Record<string, boolean>;
  
  // Published info
  publishedProductId?: number | null;
}

// Context interface
interface DraftContextType {
  draft: ProductDraft | null;
  drafts: ProductDraft[];
  loading: boolean;
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  currentDraft: ProductDraft | null;
  selectedDraftId: number | null;
  createDraft: () => Promise<number | null>;
  loadDraft: (draftId: number) => Promise<void>;
  updateDraft: (updates: Partial<ProductDraft>) => Promise<void>;
  saveDraft: () => Promise<void>;
  publishDraft: (draftId: number) => Promise<boolean>;
  deleteDraft: () => Promise<void>;
  discardDraft: (draftId: number) => Promise<boolean>;
  refreshDrafts: () => Promise<void>;
}

// Create context with default values
const DraftContext = createContext<DraftContextType>({
  draft: null,
  drafts: [],
  loading: false,
  isLoading: false,
  isCreating: false,
  error: null,
  currentDraft: null,
  selectedDraftId: null,
  createDraft: async () => null,
  loadDraft: async () => {},
  updateDraft: async () => {},
  saveDraft: async () => {},
  publishDraft: async () => false,
  deleteDraft: async () => {},
  discardDraft: async () => false,
  refreshDrafts: async () => {},
});

// Context provider props
interface DraftProviderProps {
  children: ReactNode;
  initialDraftId?: number;
}

// Provider component
export function DraftProvider({ children, initialDraftId }: DraftProviderProps) {
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Alias for currentDraft
  const currentDraft = draft;
  
  // Load all drafts on mount
  useEffect(() => {
    refreshDrafts().catch(err => {
      console.error('Error loading drafts:', err);
    });
  }, []);
  
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
      
      // Generate a unique timestamp and random number for SKU and name
      const timestamp = new Date().toISOString().slice(0, 10);
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      
      // The minimum required data for creating a draft 
      // following the database schema requirements
      const response = await apiRequest('/api/product-drafts', {
        method: 'POST',
        body: JSON.stringify({
          name: `New Product ${timestamp}-${randomNum}`,
          slug: `new-product-${timestamp.replace(/-/g, '')}-${randomNum}`,
          draftStatus: 'draft',
          // Use camelCase property names to match the server-side model
          regularPrice: 0,
          costPrice: 0,
          stockLevel: 0,
          sku: `SKU-${timestamp.replace(/-/g, '')}-${randomNum}`,
          wizardProgress: {
            "basic-info": false,
            "images": false,
            "pricing": false,
            "attributes": false,
            "additional-info": false,
            "seo": false
          },
          // Set default values for required fields to avoid null issues
          imageUrls: [],
          imageObjectKeys: [],
          attributes: [],
          mainImageIndex: 0,
          isActive: true,
          completedSteps: []
        }),
      });
      
      if (response.success && response.data) {
        const newDraft = response.data;
        setDraft(newDraft);
        
        // Update drafts list with the new draft
        setDrafts(prev => [newDraft, ...prev]);
        
        
        
        return newDraft;
      } else {
        throw new Error(response.message || 'Failed to create draft');
      }
    } catch (err) {
      console.error('Create draft error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      toast({
        title: 'Error Creating Draft',
        description: 'Could not create a new product draft. Please try again.',
        variant: 'destructive',
      });
      
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
  
  // Publish a draft as a live product - for internal use
  const publishDraftInternal = async (draftId: number): Promise<boolean> => {
    if (!draftId) {
      setError('No draft ID to publish');
      return false;
    }
    
    try {
      setLoading(true);
      
      const response = await apiRequest(`/api/product-drafts/${draftId}/publish`, {
        method: 'POST',
      });
      
      if (response.success && response.data) {
        // Update the draft with published status
        setDraft(response.data);
        
        // Update in drafts list
        setDrafts(prev => prev.map(d => d.id === draftId ? response.data : d));
        
        
        
        // If there's a published product ID, redirect to the product
        if (response.data.publishedProductId) {
          setLocation(`/admin/products/${response.data.publishedProductId}`);
        }
        
        return true;
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
      
      return false;
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
  
  // Fetch all drafts
  const refreshDrafts = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get current user first to ensure we're logged in
      const userResponse = await apiRequest('/api/user');
      
      if (!userResponse.success || !userResponse.data) {
        throw new Error('User not authenticated. Please log in first.');
      }
      
      const response = await apiRequest('/api/product-drafts');
      
      if (response.success && response.data) {
        // Sort drafts by lastModified date, newest first
        const sortedDrafts = [...response.data].sort((a, b) => {
          const dateA = new Date(a.lastModified || a.createdAt || 0);
          const dateB = new Date(b.lastModified || b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
        
        setDrafts(sortedDrafts);
      } else {
        throw new Error(response.message || 'Failed to fetch drafts');
      }
    } catch (err) {
      console.error('Error loading drafts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Only show toast if not a 401 error (handled by auth system)
      if (!(err instanceof Error && err.message.includes('User not authenticated'))) {
        toast({
          title: 'Error Loading Drafts',
          description: 'Could not load product drafts. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a draft (used for discarding)
  const discardDraft = async (draftId: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the delete endpoint since we're discarding the entire draft
      const response = await apiRequest(`/api/product-drafts/${draftId}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        // If this is the current draft, clear it
        if (draft?.id === draftId) {
          setDraft(null);
        }
        
        // Remove from the drafts list
        setDrafts(prev => prev.filter(d => d.id !== draftId));
        
        // Refresh the drafts list
        await refreshDrafts();
        
        
        
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete draft');
      }
    } catch (err) {
      console.error('Error deleting draft:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      toast({
        title: 'Error Deleting Draft',
        description: err instanceof Error ? err.message : 'Could not delete the draft.',
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Override the createDraft to return id
  const createDraftWithId = async (): Promise<number | null> => {
    setIsCreating(true);
    try {
      const result = await createDraft();
      if (result && result.id) {
        setSelectedDraftId(result.id);
        // Add to drafts list
        setDrafts(prev => [result, ...prev]);
        return result.id;
      }
      return null;
    } finally {
      setIsCreating(false);
    }
  };
  
  // Publish a draft from the DraftList
  const publishDraftWithReturn = async (draftId: number): Promise<boolean> => {
    try {
      if (!draftId) {
        setError('No draft ID provided');
        return false;
      }
      
      return await publishDraftInternal(draftId);
    } catch (err) {
      console.error('Error in publishDraftWithReturn:', err);
      return false;
    }
  };
  
  // Context value
  const contextValue: DraftContextType = {
    draft,
    drafts,
    loading,
    isLoading,
    isCreating,
    error,
    currentDraft,
    selectedDraftId,
    createDraft: createDraftWithId,
    loadDraft,
    updateDraft,
    saveDraft,
    publishDraft: publishDraftWithReturn,
    deleteDraft,
    discardDraft,
    refreshDrafts,
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