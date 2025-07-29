import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Types for AI Models
interface AIModel {
  modelName: string;
  isWorking: boolean;
  description: string;
}

interface AIModelsResponse {
  success: boolean;
  data: {
    models: AIModel[];
    currentModel: string;
    isDefault: boolean;
  };
}

// Hook to fetch AI models with status
export function useAIModels() {
  return useQuery<AIModelsResponse>({
    queryKey: ['/api/ai/models'],
    refetchInterval: 30000, // Refresh every 30 seconds to check model status
  });
}

// Hook to update AI model
export function useUpdateAIModel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (modelName: string) => {
      const response = await apiRequest('POST', '/api/ai/models/update', { modelName });
      return response;
    },
    onSuccess: (data, modelName) => {
      // Invalidate AI models cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/ai/models'] });
      
      toast({
        title: "AI Model Updated",
        description: `Successfully switched to ${modelName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update AI model",
        variant: "destructive",
      });
    },
  });
}

// Hook to test AI model connectivity
export function useTestAIModel() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (modelName: string) => {
      const response = await apiRequest('POST', '/api/ai/models/test', { modelName });
      return response;
    },
    onSuccess: (data, modelName) => {
      const isWorking = data.data?.isWorking;
      toast({
        title: isWorking ? "Model Working" : "Model Not Responding",
        description: data.data?.message || `${modelName} connectivity test completed`,
        variant: isWorking ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test model connectivity",
        variant: "destructive",
      });
    },
  });
}