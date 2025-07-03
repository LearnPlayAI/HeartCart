import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, Save, ArrowRight, AlertTriangle, 
  Trash2, X, Check, Info 
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ProductDraftData, WizardStepId, WIZARD_STEPS, 
  STEP_NUMBER_MAP, ProductFormSharedProps 
} from './types';
import { StepBasicInfo, StepImages, StepDetails, StepReview } from './steps';
import { Progress } from '@/components/ui/progress';

// Default empty draft structure
const DEFAULT_DRAFT: ProductDraftData = {
  name: '',
  description: '',
  slug: '',
  categoryId: null,
  regularPrice: null,
  salePrice: null,
  costPrice: null,
  onSale: false,
  stockLevel: 0,
  isActive: true,
  isFeatured: false,
  attributes: [],
  imageUrls: [],
  imageObjectKeys: [],
  mainImageIndex: 0,
  discountLabel: '',
  specialSaleText: '',
  specialSaleStart: null,
  specialSaleEnd: null,
  isFlashDeal: false,
  flashDealEnd: null,
  dimensions: '',
  weight: '',
  catalogId: null,
  supplierId: null,
  completedSteps: [],
  draftStatus: 'draft',
  wizardProgress: {
    'basic-info': false,
    'images': false,
    'details': false,
    'review': false
  }
};

export const ProductForm: React.FC<ProductFormSharedProps> = ({ 
  editMode = false, 
  productId,
  catalogId,
  initialDraftId
}) => {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Component state - initialDraftId will be used if provided (for edit mode)
  const [currentStep, setCurrentStep] = useState<WizardStepId>(WizardStepId.BasicInfo);
  const [draftId, setDraftId] = useState<number | null>(initialDraftId || null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Get catalog and supplier data for dropdowns
  const { data: catalogsData } = useQuery({
    queryKey: ['/api/catalogs'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/catalogs');
      return response;
    }
  });
  
  const { data: suppliersData } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/suppliers');
      return response;
    }
  });
  
  // Create a new draft
  const createDraftMutation = useMutation({
    mutationFn: async (initialData: ProductDraftData) => {
      console.log('Creating new product draft:', initialData);
      
      // Format request according to API expectations
      const requestData = {
        draftData: initialData,
        step: STEP_NUMBER_MAP[WizardStepId.BasicInfo],
        catalogId: initialData.catalogId
      };
      
      const response = await apiRequest('POST', '/api/product-drafts', requestData);
      return response;
    },
    onSuccess: (data) => {
      if (data.success && data.data?.id) {
        setDraftId(data.data.id);
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', data.data.id] });
        
      } else {
        toast({
          title: 'Error',
          description: data.error?.message || 'Could not create product draft',
          variant: 'destructive'
        });
        console.error('Failed to create draft:', data);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Unknown error creating draft',
        variant: 'destructive'
      });
    }
  });
  
  // Fetch draft data
  const { 
    data: draftResponse, 
    isLoading: isDraftLoading,
    isError: isDraftError
  } = useQuery({
    queryKey: ['/api/product-drafts', draftId],
    queryFn: async () => {
      if (!draftId) return { success: false, data: null };
      const response = await apiRequest('GET', `/api/product-drafts/${draftId}`);
      return response;
    },
    enabled: !!draftId,
  });
  
  // Update draft
  const updateDraftMutation = useMutation({
    mutationFn: async ({ stepId, stepData }: { stepId: WizardStepId; stepData: Partial<ProductDraftData> }) => {
      if (!draftId) throw new Error('No draft ID available');
      
      // Format according to API expectations
      const requestData = {
        draftData: {
          ...stepData,
          wizardProgress: {
            ...(draftResponse?.data?.wizardProgress || {}),
            [stepId]: true
          },
          completedSteps: Array.from(new Set([
            ...(draftResponse?.data?.completedSteps || []),
            stepId
          ]))
        },
        step: STEP_NUMBER_MAP[stepId]
      };
      
      console.log(`Updating step ${stepId}:`, requestData);
      
      const response = await apiRequest('PATCH', `/api/product-drafts/${draftId}/wizard-step`, requestData);
      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', draftId] });
        
      } else {
        toast({
          title: 'Error',
          description: data.error?.message || 'Failed to save changes',
          variant: 'destructive'
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Unknown error saving draft',
        variant: 'destructive'
      });
    }
  });
  
  // Delete draft
  const deleteDraftMutation = useMutation({
    mutationFn: async () => {
      if (!draftId) throw new Error('No draft ID available');
      const response = await apiRequest('DELETE', `/api/product-drafts/${draftId}`);
      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        
        setLocation('/admin/catalog');
      } else {
        toast({
          title: 'Error',
          description: data.error?.message || 'Failed to delete draft',
          variant: 'destructive'
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Unknown error deleting draft',
        variant: 'destructive'
      });
    }
  });
  
  // Publish draft
  const publishDraftMutation = useMutation({
    mutationFn: async () => {
      if (!draftId) throw new Error('No draft ID available');
      const response = await apiRequest('POST', `/api/product-drafts/${draftId}/publish`);
      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        
        setLocation('/admin/catalog');
      } else {
        toast({
          title: 'Error',
          description: data.error?.message || 'Failed to publish product',
          variant: 'destructive'
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Unknown error publishing product',
        variant: 'destructive'
      });
    }
  });

  // Initialize wizard
  useEffect(() => {
    // Make sure we have user and catalog data
    if (!user || !catalogsData?.data || !suppliersData?.data) return;
    
    // If we don't have a draft yet, create one
    // Skip this if we already have a draftId (either from initialDraftId or from previous creation)
    if (!draftId) {
      // Use the passed in catalogId or default to the first one in the list
      const defaultCatalogId = catalogId || catalogsData.data[0]?.id || 1;
      const defaultSupplierId = suppliersData.data[0]?.id || null;
      
      const initialDraft: ProductDraftData = {
        ...DEFAULT_DRAFT,
        catalogId: defaultCatalogId,
        supplierId: defaultSupplierId,
      };
      
      // If we're editing, add the original product ID
      if (editMode && productId) {
        initialDraft.originalProductId = productId;
      }
      
      createDraftMutation.mutate(initialDraft);
    }
  }, [user, catalogsData, suppliersData, draftId, editMode, productId, catalogId]);
  
  // Calculate progress whenever draft data changes
  useEffect(() => {
    if (draftResponse?.data) {
      const { wizardProgress } = draftResponse.data;
      const completedSteps = Object.values(wizardProgress || {}).filter(Boolean).length;
      const progressPercentage = (completedSteps / WIZARD_STEPS.length) * 100;
      setProgress(progressPercentage);
    }
  }, [draftResponse]);
  
  // Handle step change
  const handleStepChange = (stepId: string) => {
    setCurrentStep(stepId as WizardStepId);
  };
  
  // Handle saving step data
  const handleSaveStep = (stepData: Partial<ProductDraftData>, advance = false) => {
    updateDraftMutation.mutate({
      stepId: currentStep,
      stepData
    }, {
      onSuccess: () => {
        if (advance) {
          handleNext();
        }
      }
    });
  };
  
  // Handle moving to next step
  const handleNext = () => {
    const currentIndex = WIZARD_STEPS.findIndex(step => step.id === currentStep);
    if (currentIndex < WIZARD_STEPS.length - 1) {
      setCurrentStep(WIZARD_STEPS[currentIndex + 1].id);
    }
  };
  
  // Handle publishing the product
  const handlePublish = () => {
    publishDraftMutation.mutate();
  };
  
  // Handle deleting the draft
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };
  
  // Check if a step is completed
  const isStepCompleted = (stepId: WizardStepId) => {
    if (!draftResponse?.data?.wizardProgress) return false;
    return !!draftResponse.data.wizardProgress[stepId];
  };
  
  // Loading state
  if (isDraftLoading || createDraftMutation.isPending) {
    return (
      <Card className="w-full p-4">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">
            {editMode ? 'Loading product data...' : 'Setting up new product...'}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Error state
  if (isDraftError || (!draftId && !createDraftMutation.isPending)) {
    return (
      <Card className="w-full p-4">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
          <h3 className="text-xl font-bold mb-2">Error Loading Product</h3>
          <p className="text-center text-muted-foreground mb-4">
            We couldn't load or create the product draft. Please try again.
          </p>
          <Button onClick={() => setLocation('/admin/catalog')}>
            Return to Catalog
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Get the draft data or use default values
  const draft = draftResponse?.data || DEFAULT_DRAFT;
  
  // Render the current step component
  const renderStepComponent = () => {
    switch (currentStep) {
      case WizardStepId.BasicInfo:
        return (
          <StepBasicInfo
            draft={draft}
            onSave={handleSaveStep}
            onNext={handleNext}
            isLoading={updateDraftMutation.isPending}
          />
        );
      case WizardStepId.Images:
        return (
          <StepImages
            draft={draft}
            onSave={handleSaveStep}
            onNext={handleNext}
            isLoading={updateDraftMutation.isPending}
          />
        );
      case WizardStepId.Details:
        return (
          <StepDetails
            draft={draft}
            onSave={handleSaveStep}
            onNext={handleNext}
            isLoading={updateDraftMutation.isPending}
          />
        );
      case WizardStepId.Review:
        return (
          <StepReview
            draft={draft}
            onSave={handleSaveStep}
            onNext={handleNext}
            isLoading={updateDraftMutation.isPending}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto">
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">
              {editMode ? 'Edit Product' : 'Create New Product'}
            </h1>
            <div className="flex items-center mt-2">
              <Progress value={progress} className="h-2 flex-1 mr-3" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {Math.round(progress)}% Complete
              </span>
            </div>
          </div>
          
          <Tabs 
            value={currentStep} 
            onValueChange={handleStepChange}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 mb-6">
              {WIZARD_STEPS.map((step) => (
                <TabsTrigger 
                  key={step.id} 
                  value={step.id}
                  disabled={updateDraftMutation.isPending || publishDraftMutation.isPending}
                  className="relative py-3"
                >
                  <div className="flex items-center">
                    {isStepCompleted(step.id) ? (
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 mr-2" />
                    )}
                    <span>{step.label}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="mb-4 px-1">
              <p className="text-sm text-muted-foreground">
                <Info className="inline h-4 w-4 mr-1" />
                {WIZARD_STEPS.find(step => step.id === currentStep)?.description}
              </p>
            </div>
            
            <div className="min-h-[400px]">
              {renderStepComponent()}
            </div>
          </Tabs>
          
          <div className="flex justify-between border-t mt-6 pt-6">
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleteDraftMutation.isPending}
              className="text-destructive border-destructive hover:bg-destructive/10"
            >
              {deleteDraftMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            <div className="flex gap-2">
              {currentStep !== WizardStepId.Review ? (
                <Button
                  onClick={handleNext}
                  disabled={updateDraftMutation.isPending}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handlePublish}
                  disabled={publishDraftMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {publishDraftMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  {editMode ? 'Update Product' : 'Create Product'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this draft and all product data. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteDraftMutation.mutate()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteDraftMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};