import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AIModelsResponse = {
  available: string[];
  current: string;
  isDefault: boolean;
};

type AISettings = {
  id: number;
  settingName: string;
  settingValue: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function useAIModels() {
  return useQuery<AIModelsResponse>({
    queryKey: ["/api/admin/ai/models"],
    throwOnError: true,
  });
}

export function useAISettings() {
  return useQuery<AISettings[]>({
    queryKey: ["/api/admin/ai/settings"],
    throwOnError: true,
  });
}

export function useUpdateAIModel() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (modelName: string) => {
      const response = await apiRequest("POST", "/api/admin/ai/models", { modelName });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Warning",
          description: data.message,
          variant: "destructive",
        });
      }
      
      // Invalidate the AI models query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/models"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update AI model: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}