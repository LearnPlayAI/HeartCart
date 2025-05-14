/**
 * Draft Context
 * 
 * Provides context for managing product draft state and operations
 * across the product management system.
 */

import React, { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

// Define the product draft interface
export interface ProductDraft {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price?: number;
  costPrice?: number;
  status: 'draft' | 'published';
  categoryId?: number | null;
  imageUrls?: string[];
  mainImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
  attributes?: any[];
}

// Define the context interface
interface DraftContextType {
  drafts: ProductDraft[];
  isLoading: boolean;
  isCreating: boolean;
  selectedDraftId: number | null;
  currentDraft: ProductDraft | null;
  createDraft: () => Promise<number>;
  loadDraft: (id: number) => void;
  publishDraft: (id: number) => Promise<boolean>;
  discardDraft: (id: number) => Promise<boolean>;
  refreshDrafts: () => void;
}

// Create the context
const DraftContext = createContext<DraftContextType | null>(null);

// Provider props interface
interface DraftProviderProps {
  children: ReactNode;
}

// Provider component
export function DraftProvider({ children }: DraftProviderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  // Fetch all drafts
  const { 
    data: drafts = [], 
    isLoading: isDraftsLoading,
    refetch: refreshDrafts
  } = useQuery({
    queryKey: ['/api/product-drafts'],
    queryFn: async () => {
      const response = await apiRequest('/api/product-drafts');
      return response;
    }
  });

  // Fetch selected draft details
  const { 
    data: currentDraft, 
    isLoading: isDraftLoading 
  } = useQuery({
    queryKey: [`/api/product-drafts/${selectedDraftId}`],
    queryFn: async () => {
      if (!selectedDraftId) return null;
      const response = await apiRequest(`/api/product-drafts/${selectedDraftId}`);
      return response;
    },
    enabled: !!selectedDraftId
  });

  // Create a new draft
  const createDraftMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/product-drafts', {
        method: 'POST',
        data: {
          name: 'New Product',
          slug: 'new-product',
          status: 'draft'
        }
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
      toast({
        title: 'Draft Created',
        description: 'New product draft has been created successfully.'
      });
      return data.id;
    },
    onError: (error: any) => {
      toast({
        title: 'Draft Creation Failed',
        description: error.message || 'Failed to create a new draft.',
        variant: 'destructive'
      });
    }
  });

  // Publish a draft
  const publishDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      const response = await apiRequest(`/api/product-drafts/${draftId}/publish`, {
        method: 'POST'
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
      if (data.productId) {
        toast({
          title: 'Draft Published',
          description: 'Product has been published successfully.'
        });
        // Navigate to the product edit page
        navigate(`/admin/products/${data.productId}/edit`);
      }
      return true;
    },
    onError: (error: any) => {
      toast({
        title: 'Publishing Failed',
        description: error.message || 'Failed to publish the draft.',
        variant: 'destructive'
      });
      return false;
    }
  });

  // Discard a draft
  const discardDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      const response = await apiRequest(`/api/product-drafts/${draftId}`, {
        method: 'DELETE'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
      if (selectedDraftId) {
        setSelectedDraftId(null);
      }
      toast({
        title: 'Draft Discarded',
        description: 'Product draft has been discarded.'
      });
      return true;
    },
    onError: (error: any) => {
      toast({
        title: 'Discard Failed',
        description: error.message || 'Failed to discard the draft.',
        variant: 'destructive'
      });
      return false;
    }
  });

  // Load a draft
  const loadDraft = (id: number) => {
    setSelectedDraftId(id);
  };

  // Create a new draft and return its ID
  const createDraft = async (): Promise<number> => {
    const result = await createDraftMutation.mutateAsync();
    if (result && result.id) {
      setSelectedDraftId(result.id);
      return result.id;
    }
    return -1;
  };

  // Publish a draft
  const publishDraft = async (id: number): Promise<boolean> => {
    return await publishDraftMutation.mutateAsync(id);
  };

  // Discard a draft
  const discardDraft = async (id: number): Promise<boolean> => {
    return await discardDraftMutation.mutateAsync(id);
  };

  // Context value
  const contextValue: DraftContextType = {
    drafts,
    isLoading: isDraftsLoading || isDraftLoading,
    isCreating: createDraftMutation.isPending,
    selectedDraftId,
    currentDraft,
    createDraft,
    loadDraft,
    publishDraft,
    discardDraft,
    refreshDrafts
  };

  return (
    <DraftContext.Provider value={contextValue}>
      {children}
    </DraftContext.Provider>
  );
}

// Hook to use the draft context
export const useDraft = () => {
  const context = useContext(DraftContext);
  if (!context) {
    throw new Error('useDraft must be used within a DraftProvider');
  }
  return context;
};