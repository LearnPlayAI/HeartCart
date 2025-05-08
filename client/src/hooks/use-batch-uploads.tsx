import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface BatchUpload {
  id: number;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  catalogId: number | null;
  userId: number | null;
  totalRecords: number | null;
  processedRecords: number | null;
  successCount: number | null;
  errorCount: number | null;
  warnings: any[] | null;
  fileOriginalName: string | null;
  fileName: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  pausedAt: string | null;
  resumedAt: string | null;
  lastProcessedRow: number | null;
  retryCount: number | null;
}

export interface BatchUploadError {
  id: number;
  batchUploadId: number;
  row: number | null;
  field: string | null;
  message: string;
  type: string;
  severity: string;
  createdAt: string;
}

export function useBatchUploads() {
  const { toast } = useToast();

  const {
    data: batchUploads,
    isLoading: isLoadingBatchUploads,
    error: batchUploadsError,
    refetch: refetchBatchUploads,
  } = useQuery({
    queryKey: ["/api/batch-upload"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const {
    mutateAsync: createBatchUpload,
    isPending: isCreatingBatchUpload,
  } = useMutation({
    mutationFn: async (data: { name: string; description?: string; catalogId?: number }) => {
      const response = await apiRequest("POST", "/api/batch-upload/start", data);
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Batch upload created",
        description: "The batch upload job has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/batch-upload"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating batch upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const {
    mutateAsync: uploadCsvFile,
    isPending: isUploadingCsv,
  } = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await apiRequest(
        "POST", 
        `/api/batch-upload/${id}/upload`,
        formData,
        { isFormData: true }
      );
      const result = await response.json();
      return result.data;
    },
    onSuccess: (data) => {
      toast({
        title: "CSV file uploaded",
        description: "The CSV file has been uploaded and is being processed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/batch-upload"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error uploading CSV file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const {
    mutateAsync: deleteBatchUpload,
    isPending: isDeletingBatchUpload,
  } = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/batch-upload/${id}`);
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Batch upload deleted",
        description: "The batch upload has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/batch-upload"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting batch upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getBatchUpload = async (id: number) => {
    const response = await apiRequest("GET", `/api/batch-upload/${id}`);
    const data = await response.json();
    return data.data;
  };

  const getBatchUploadErrors = async (id: number) => {
    const response = await apiRequest("GET", `/api/batch-upload/${id}/errors`);
    const data = await response.json();
    return data.data;
  };
  
  // Batch control operations

  // Batch control mutations
  const {
    mutateAsync: cancelBatchUpload,
    isPending: isCancellingBatch,
  } = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/batch-upload/${id}/cancel`);
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Batch cancelled",
        description: "The batch upload has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/batch-upload"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error cancelling batch",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const {
    mutateAsync: pauseBatchUpload,
    isPending: isPausingBatch,
  } = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/batch-upload/${id}/pause`);
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Batch paused",
        description: "The batch upload has been paused successfully. You can resume it later.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/batch-upload"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error pausing batch",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const {
    mutateAsync: resumeBatchUpload,
    isPending: isResumingBatch,
  } = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/batch-upload/${id}/resume`);
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Batch resumed",
        description: "The batch upload has been resumed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/batch-upload"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error resuming batch",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const {
    mutateAsync: retryBatchUpload,
    isPending: isRetryingBatch,
  } = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/batch-upload/${id}/retry`);
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Batch retry started",
        description: "The batch upload retry has started successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/batch-upload"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error retrying batch",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadTemplateCSV = async (catalogId?: number) => {
    try {
      const url = catalogId
        ? `/api/batch-upload/template/${catalogId}`
        : '/api/batch-upload/template';

      const response = await apiRequest("GET", url);
      if (!response.ok) {
        throw new Error('Failed to download template CSV');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = catalogId ? `catalog_${catalogId}_template.csv` : 'product_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast({
        title: "Template CSV downloaded",
        description: "The template CSV file has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error downloading template",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return {
    batchUploads,
    isLoadingBatchUploads,
    batchUploadsError,
    refetchBatchUploads,
    createBatchUpload,
    isCreatingBatchUpload,
    uploadCsvFile,
    isUploadingCsv,
    deleteBatchUpload,
    isDeletingBatchUpload,
    getBatchUpload,
    getBatchUploadErrors,
    downloadTemplateCSV,
    // Batch control functions
    cancelBatchUpload,
    isCancellingBatch,
    pauseBatchUpload,
    isPausingBatch,
    resumeBatchUpload,
    isResumingBatch,
    retryBatchUpload,
    isRetryingBatch,
  };
}