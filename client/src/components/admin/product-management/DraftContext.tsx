/**
 * Draft Context
 * 
 * Provides context for managing product draft state and operations
 * across the product management system.
 */

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ProductDraft } from '@shared/schema';

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

const DraftContext = createContext<DraftContextType>({
  drafts: [],
  isLoading: false,
  isCreating: false,
  selectedDraftId: null,
  currentDraft: null,
  createDraft: async () => 0,
  loadDraft: () => {},
  publishDraft: async () => false,
  discardDraft: async () => false,
  refreshDrafts: () => {},
});

interface DraftProviderProps {
  children: ReactNode;
}

export function DraftProvider({ children }: DraftProviderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  
  // Fetch drafts
  const {
    data: drafts = [],
    isLoading,
    refetch: refreshDrafts,
  } = useQuery({
    queryKey: ['/api/product-drafts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/product-drafts');
      return response.data || [];
    },
  });
  
  // Fetch current draft if one is selected
  const { 
    data: currentDraft = null,
  } = useQuery({
    queryKey: [`/api/product-drafts/${selectedDraftId}`],
    queryFn: async () => {
      if (!selectedDraftId) return null;
      const response = await apiRequest('GET', `/api/product-drafts/${selectedDraftId}`);
      return response.data;
    },
    enabled: !!selectedDraftId,
  });
  
  // Create a new draft
  const createDraftMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/product-drafts', {});
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Draft Created",
        description: "A new product draft has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
      return data.id;
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Draft",
        description: error.message || "An error occurred while creating a new draft",
        variant: "destructive",
      });
    },
  });
  
  // Publish a draft
  const publishDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      const response = await apiRequest('POST', `/api/product-drafts/${draftId}/publish`);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Product Published",
        description: "The product has been successfully published to the store.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      return true;
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Publish",
        description: error.message || "The product could not be published. Please fix any validation errors and try again.",
        variant: "destructive",
      });
      return false;
    },
  });
  
  // Discard a draft
  const discardDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      const response = await apiRequest('DELETE', `/api/product-drafts/${draftId}`);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Draft Discarded",
        description: "The product draft has been discarded.",
      });
      if (selectedDraftId) {
        setSelectedDraftId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
      return true;
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Discard Draft",
        description: error.message || "An error occurred while discarding the draft",
        variant: "destructive",
      });
      return false;
    },
  });
  
  // Create a new draft
  const createDraft = useCallback(async () => {
    try {
      const data = await createDraftMutation.mutateAsync();
      setSelectedDraftId(data.id);
      return data.id;
    } catch (error) {
      console.error("Error creating draft:", error);
      return 0;
    }
  }, [createDraftMutation]);
  
  // Load a draft
  const loadDraft = useCallback((id: number) => {
    setSelectedDraftId(id);
  }, []);
  
  // Publish a draft
  const publishDraft = useCallback(async (id: number) => {
    try {
      return await publishDraftMutation.mutateAsync(id);
    } catch (error) {
      console.error("Error publishing draft:", error);
      return false;
    }
  }, [publishDraftMutation]);
  
  // Discard a draft
  const discardDraft = useCallback(async (id: number) => {
    try {
      return await discardDraftMutation.mutateAsync(id);
    } catch (error) {
      console.error("Error discarding draft:", error);
      return false;
    }
  }, [discardDraftMutation]);
  
  const value = {
    drafts,
    isLoading,
    isCreating: createDraftMutation.isPending,
    selectedDraftId,
    currentDraft,
    createDraft,
    loadDraft,
    publishDraft,
    discardDraft,
    refreshDrafts,
  };
  
  return (
    <DraftContext.Provider value={value}>
      {children}
    </DraftContext.Provider>
  );
}

export const useDraft = () => useContext(DraftContext);