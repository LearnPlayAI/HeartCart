import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Trash2, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
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
import { BasicInfoStep } from './steps/BasicInfoStep';
import ProductImagesStep from './steps/ProductImagesStep';
import { AdditionalInfoStep } from './steps/AdditionalInfoStep';
import { AttributesStep } from './steps/AttributesStep';
import { SEOStep } from './steps/SEOStep';
import { SalesPromotionsStep } from './steps/SalesPromotionsStep';
import { ReviewAndSaveStep } from './steps/ReviewAndSaveStep';

// Define the steps in the wizard
const WIZARD_STEPS = [
  { id: 'basic-info', label: 'Basic Info', component: BasicInfoStep },
  { id: 'images', label: 'Images', component: ProductImagesStep },
  { id: 'additional-info', label: 'Additional Info', component: AdditionalInfoStep },
  { id: 'attributes', label: 'Attributes', component: AttributesStep },
  { id: 'seo', label: 'SEO', component: SEOStep },
  { id: 'sales-promotions', label: 'Sales & Promotions', component: SalesPromotionsStep },
  { id: 'review', label: 'Review & Save', component: ReviewAndSaveStep },
];

// Map step names to numeric values for the API
const STEP_MAP = {
  'basic-info': 0,
  'images': 1,
  'additional-info': 2,
  'attributes': 3,
  'seo': 4,
  'sales-promotions': 5,
  'review': 6
};

export interface ProductDraft {
  id?: number;
  name: string;
  description: string | null;
  slug: string;
  categoryId: number | null;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  regularPrice: number | null;
  salePrice: number | null;
  costPrice: number | null;
  onSale: boolean;
  stockLevel: number | null;
  isActive: boolean;
  isFeatured: boolean;
  attributes: Array<{
    attributeId: number;
    value: string | string[] | null;
  }>;
  imageUrls: string[];
  imageObjectKeys: string[];
  mainImageIndex: number;
  discountLabel: string | null;
  specialSaleText: string | null;
  specialSaleStart: Date | null;
  specialSaleEnd: Date | null;
  isFlashDeal: boolean;
  flashDealEnd: Date | null;
  dimensions: string | null;
  weight: string | null;
  // SEO fields
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  canonicalUrl: string | null;
  // System fields
  originalProductId: number | null;
  createdBy: number;
  draftStatus: string;
  lastModified: Date;
  completedSteps: string[];
  wizardProgress: Record<string, boolean>;
  catalogId: number | null;
  supplierId: number | null;
}

export type ProductDraftStep = 'basic-info' | 'images' | 'additional-info' | 'attributes' | 'seo' | 'sales-promotions' | 'review';

interface ProductWizardProps {
  draftId?: number;
  initialData?: ProductDraft;
  editMode?: boolean;
}

export const ProductWizard: React.FC<ProductWizardProps> = ({ draftId, initialData, editMode = false }) => {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<ProductDraftStep>('basic-info');
  const [internalDraftId, setInternalDraftId] = useState<number | null>(draftId || null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);

  // Get user information to ensure we're authenticated
  const { user, isLoading: isLoadingUser } = useAuth();
  
  // Get catalog and supplier information 
  const { data: catalogsData } = useQuery({
    queryKey: ['/api/catalogs'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/catalogs');
      return response.json();
    },
  });
  
  const { data: suppliersData } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/suppliers');
      return response.json();
    },
  });

  // Create a new product draft
  const createDraftMutation = useMutation({
    mutationFn: async (initialData: any) => {
      console.log('Creating product draft with data:', initialData);
      
      // Format the request according to the server's expected structure
      const requestData = {
        draftData: initialData,
        step: 0, // First step
        catalogId: initialData.catalogId
      };
      
      console.log('API Request: POST /api/product-drafts', requestData);
      const response = await apiRequest('POST', '/api/product-drafts', requestData);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.data && data.data.id) {
        setInternalDraftId(data.data.id);
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', data.data.id] });
        toast({
          title: 'Draft Created',
          description: 'Started working on your new product',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error?.message || 'Could not create product draft',
          variant: 'destructive',
        });
        console.error('Failed to create draft:', data);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to create product draft: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
      console.error('Draft creation error:', error);
    },
  });

  // Fetch the current draft
  const { data: draftData, isLoading: isDraftLoading, isError } = useQuery({
    queryKey: ['/api/product-drafts', draftId],
    queryFn: async () => {
      if (!draftId) return null;
      const response = await apiRequest('GET', `/api/product-drafts/${draftId}`);
      return response.json();
    },
    enabled: !!draftId,
  });

  // Update a specific wizard step
  const updateStepMutation = useMutation({
    mutationFn: async ({ step, stepData }: { step: ProductDraftStep; stepData: any }) => {
      if (!draftId) throw new Error('No draft ID available');
      
      // Format the data according to server validation schema
      const requestData = {
        draftData: stepData,
        step: STEP_MAP[step], // Convert string step to number (0-3)
      };
      
      console.log(`Updating step ${step} (${STEP_MAP[step]}) with data:`, requestData);
      
      const response = await apiRequest('PATCH', `/api/product-drafts/${draftId}/wizard-step`, requestData);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', draftId] });
        toast({
          title: 'Step Saved',
          description: 'Your changes have been saved',
        });
        
        // If auto-advancing, move to the next step
        if (isAutoAdvancing) {
          const currentIndex = WIZARD_STEPS.findIndex((step) => step.id === currentStep);
          if (currentIndex < WIZARD_STEPS.length - 1) {
            setCurrentStep(WIZARD_STEPS[currentIndex + 1].id as ProductDraftStep);
          }
          setIsAutoAdvancing(false);
        }
      } else {
        toast({
          title: 'Error',
          description: data.error?.message || 'Failed to save changes',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
      console.error('Update error:', error);
      setIsAutoAdvancing(false);
    },
  });

  // Delete a draft
  const deleteDraftMutation = useMutation({
    mutationFn: async () => {
      if (!draftId) throw new Error('No draft ID available');
      const response = await apiRequest('DELETE', `/api/product-drafts/${draftId}`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Deleted',
          description: 'Product draft has been discarded',
        });
        setLocation('/admin/catalog');
      } else {
        toast({
          title: 'Error',
          description: data.error?.message || 'Failed to delete draft',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Publish a draft to create/update the actual product
  const publishDraftMutation = useMutation({
    mutationFn: async () => {
      if (!draftId) throw new Error('No draft ID available');
      const response = await apiRequest('POST', `/api/product-drafts/${draftId}/publish`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Success',
          description: `Product ${editMode ? 'updated' : 'created'} successfully`,
        });
        setLocation('/admin/catalog');
      } else {
        toast({
          title: 'Error',
          description: data.error?.message || 'Failed to publish product',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to publish: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Initialize the wizard
  useEffect(() => {
    // Wait until we know the user's authenticated state and have catalog data
    if (isLoadingUser || !catalogsData || !suppliersData) return;
    
    // Make sure user is authenticated before creating a draft
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to create or edit products.',
        variant: 'destructive',
      });
      setLocation('/login?return=/admin/products');
      return;
    }
    
    // Create a new draft or load one for editing
    if (!draftId) {
      // Get default catalog and supplier if available
      const defaultCatalogId = catalogsData?.data?.[0]?.id || 1;
      const defaultSupplierId = suppliersData?.data?.[0]?.id || null;
      
      // Create initial draft data
      const initialData: Partial<ProductDraft> = {
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
        // SEO fields
        metaTitle: null,
        metaDescription: null,
        metaKeywords: null,
        canonicalUrl: null,
        // System fields
        originalProductId: null,
        catalogId: defaultCatalogId,
        supplierId: defaultSupplierId,
        completedSteps: [],
        draftStatus: 'draft',
        wizardProgress: {
          "basic-info": false, 
          "images": false, 
          "additional-info": false,
          "attributes": false,
          "seo": false,
          "sales-promotions": false,
          "review": false
        }
      };
      
      // originalProductId is already set in the initialData
      
      createDraftMutation.mutate(initialData);
    }
  }, [internalDraftId, editMode, user, isLoadingUser, catalogsData, suppliersData, setLocation, toast]);

  // Handle step changes
  const handleStepChange = (step: string) => {
    setCurrentStep(step as ProductDraftStep);
  };

  // Handle saving the current step
  const handleSaveStep = (stepData: any, advanceToNext = false) => {
    if (advanceToNext) {
      setIsAutoAdvancing(true);
    }
    
    // Update the draft with the new step data
    const formattedData = {
      ...stepData,
      completedSteps: Array.from(new Set([
        ...(draftData?.data.completedSteps || []), 
        currentStep
      ])),
      wizardProgress: {
        ...(draftData?.data.wizardProgress || {}),
        [currentStep]: true
      }
    };
    
    updateStepMutation.mutate({
      step: currentStep,
      stepData: formattedData,
    });
  };

  // Handle publishing the product
  const handlePublish = () => {
    if (!draftId) {
      toast({
        title: 'Error',
        description: 'No draft available to publish',
        variant: 'destructive',
      });
      return;
    }
    
    publishDraftMutation.mutate();
  };

  // Handle deleting the draft
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  // Determine if a step is completed
  const isStepCompleted = (step: string) => {
    const wizardProgress = draftData?.data?.wizardProgress || {};
    return !!wizardProgress[step];
  };

  // Handle moving to the next step
  const handleNextStep = () => {
    const currentIndex = WIZARD_STEPS.findIndex((step) => step.id === currentStep);
    if (currentIndex < WIZARD_STEPS.length - 1) {
      setCurrentStep(WIZARD_STEPS[currentIndex + 1].id as ProductDraftStep);
    }
  };

  // Loading state
  if (isDraftLoading || createDraftMutation.isPending || isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span className="text-lg">Loading product information...</span>
      </div>
    );
  }

  // Error state
  if (isError || (!draftId && !createDraftMutation.isPending)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Error Loading Product</h3>
        <p className="mb-4">There was a problem loading or creating the product draft.</p>
        <Button onClick={() => setLocation('/admin/catalog')}>Return to Catalog</Button>
      </div>
    );
  }

  // Render current step component
  const CurrentStepComponent = WIZARD_STEPS.find((step) => step.id === currentStep)?.component || BasicInfoStep;
  const draft = draftData?.data || {};

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">
        {editMode ? 'Edit Product' : 'Add New Product'}
      </h2>

      <Tabs value={currentStep} onValueChange={handleStepChange} className="w-full">
        {/* Mobile-optimized TabsList - scrollable on small screens */}
        <div className="overflow-x-auto pb-2 -mx-6 px-6">
          <TabsList className="grid grid-cols-7 mb-6 min-w-[700px] md:min-w-0">
            {WIZARD_STEPS.map((step) => (
              <TabsTrigger 
                key={step.id} 
                value={step.id}
                className="relative"
              >
                <span className="flex items-center">
                  {isStepCompleted(step.id) && (
                    <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" />
                  )}
                  {/* Hide label text on smallest screens, show icon only */}
                  <span className="hidden xs:inline">{step.label}</span>
                  {/* Show step number on smallest screens */}
                  <span className="inline xs:hidden">
                    {WIZARD_STEPS.findIndex(s => s.id === step.id) + 1}
                  </span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Mobile-friendly content area */}
        {WIZARD_STEPS.map((step) => (
          <TabsContent key={step.id} value={step.id} className="pt-4">
            <CurrentStepComponent
              draft={draft as ProductDraft}
              onSave={handleSaveStep}
              isLoading={updateStepMutation.isPending}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-between mt-6 pt-4 border-t">
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleteDraftMutation.isPending}
        >
          {deleteDraftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Trash2 className="mr-2 h-4 w-4" />
          Discard
        </Button>

        <div className="flex gap-2">
          {currentStep !== 'review' ? (
            <Button
              onClick={handleNextStep}
              variant="outline"
              className="flex items-center"
            >
              Next Step
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              disabled={publishDraftMutation.isPending}
              variant="default"
            >
              {publishDraftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {editMode ? 'Update Product' : 'Create Product'}
            </Button>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this draft and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDraftMutation.mutate()}>
              {deleteDraftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

