import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useParams, useLocation } from 'wouter';
import { ProductWizard } from '@/components/admin/product-wizard/ProductWizard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

const ProductWizardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch draft data
  const { 
    data: draftData, 
    isLoading: isDraftLoading, 
    error: draftError,
    refetch: refetchDraft
  } = useQuery({
    queryKey: ['/api/product-drafts', id],
    queryFn: async () => {
      if (!id) return { success: true, data: null };
      const response = await apiRequest('GET', `/api/product-drafts/${id}`);
      return response.json();
    },
    enabled: !!id,
  });
  
  // Show error toast if draft loading fails
  useEffect(() => {
    if (draftError) {
      toast({
        title: 'Error Loading Draft',
        description: 'Failed to load the product draft. Please try again.',
        variant: 'destructive',
      });
    }
  }, [draftError, toast]);
  
  // Navigate back to management page
  const handleBackToManagement = () => {
    navigate('/admin/product-management');
  };
  
  // Render loading state
  if (id && isDraftLoading) {
    return (
      <div className="container py-6 md:py-10 max-w-screen-xl space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackToManagement}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <Skeleton className="h-8 w-64" />
          </div>
        </div>
        
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  // Render error state
  if (id && draftError) {
    return (
      <div className="container py-6 md:py-10 max-w-screen-xl">
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackToManagement}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div className="p-6 bg-destructive/10 rounded-lg text-center space-y-4">
          <h2 className="text-xl font-bold">Failed to Load Product Draft</h2>
          <p>There was an error loading this product draft.</p>
          <div className="flex justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleBackToManagement}
            >
              Back to Management
            </Button>
            <Button 
              onClick={() => refetchDraft()} 
              className="gap-2"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // If no ID, or successful fetch
  return (
    <div className="container py-6 md:py-10 max-w-screen-xl space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBackToManagement}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Management
        </Button>
      </div>
      
      <ProductWizard 
        draftId={id ? parseInt(id) : undefined} 
        initialData={id ? draftData?.data : undefined}
      />
    </div>
  );
};

export default ProductWizardPage;