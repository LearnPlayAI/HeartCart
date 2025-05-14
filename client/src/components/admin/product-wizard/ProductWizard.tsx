import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Trash2, AlertTriangle } from 'lucide-react';
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
import BasicInfoStep from './steps/BasicInfoStep';
import ProductImagesStep from './steps/ProductImagesStep';
import { AdditionalInfoStep } from './steps/AdditionalInfoStep';
import { ReviewAndSaveStep } from './steps/ReviewAndSaveStep';

// Define the steps in the wizard
const WIZARD_STEPS = [
  { id: 'basic-info', label: 'Basic Info', component: BasicInfoStep },
  { id: 'images', label: 'Images', component: ProductImagesStep },
  { id: 'additional-info', label: 'Additional Info', component: AdditionalInfoStep },
  { id: 'review', label: 'Review & Save', component: ReviewAndSaveStep },
];

export interface ProductDraft {
  id?: number;
  name: string;
  description: string | null;
  slug: string;
  categoryId: number | null;
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
  originalProductId: number | null;
  createdBy: number;
  draftStatus: string;
  lastModified: Date;
  completedSteps: string[];
}

export type ProductDraftStep = 'basic-info' | 'images' | 'additional-info' | 'review';

interface ProductWizardProps {
  editMode?: boolean;
  productId?: number;
}

export const ProductWizard: React.FC<ProductWizardProps> = ({ editMode = false, productId }) => {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<ProductDraftStep>('basic-info');
  const [draftId, setDraftId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Create a new product draft or load an existing one for editing
  const createDraftMutation = useMutation({
    mutationFn: async (draftData: any) => {
      console.log('Submitting draft data:', draftData);
      
      // The server validation schema expects direct draft data, not wrapped with step and draftData fields
      // This matches the server's createProductDraftSchema, which extends insertProductDraftSchema
      const formattedData = {
        ...draftData,
        catalogId: draftData.catalogId || 1, // Default catalog ID if not provided
        supplierId: draftData.supplierId || null,
        attributes: draftData.attributes || [],
      };
      
      console.log('Formatted data for API:', formattedData);
      
      // Send the properly formatted data
      const response = await apiRequest('POST', '/api/product-drafts', formattedData);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.data && data.data.id) {
        setDraftId(data.data.id);
        // Initial fetch of draft data
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', data.data.id] });
        toast({
          title: 'Success',
          description: 'Product draft created successfully',
        });
      } else {
        toast({
          title: 'Warning',
          description: 'Response received but draft ID is missing',
          variant: 'destructive',
        });
        console.error('Failed to extract draft ID from response:', data);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create product draft: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
      console.error('Draft creation error:', error);
    },
  });

  // Fetch the current draft
  const { data: draftData, isLoading, isError } = useQuery({
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
    mutationFn: async ({ step, data }: { step: ProductDraftStep; data: any }) => {
      if (!draftId) throw new Error('No draft ID available');
      
      // Format the data according to the updateProductDraftWizardStepSchema
      // Looking at the validation schema, it expects { step: string, data: any }
      const requestData = {
        step,
        data
      };
      
      console.log(`Updating product draft step: ${step} with data:`, requestData);
      
      const response = await apiRequest('PATCH', `/api/product-drafts/${draftId}/wizard-step`, requestData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', draftId] });
      toast({
        title: 'Success',
        description: 'Product information saved',
      });
    },
    onError: (error) => {
      console.error('Update step error:', error);
      toast({
        title: 'Error',
        description: `Failed to update product draft: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Delete a draft
  const deleteDraftMutation = useMutation({
    mutationFn: async () => {
      if (!draftId) throw new Error('No draft ID available');
      const response = await apiRequest('DELETE', `/api/product-drafts/${draftId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Product draft deleted',
      });
      setLocation('/admin/catalog');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete product draft: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      toast({
        title: 'Success',
        description: `Product ${editMode ? 'updated' : 'created'} successfully`,
      });
      setLocation('/admin/catalog');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to publish product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

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

  // Initialize the wizard
  useEffect(() => {
    // Wait until we know the user's authenticated state
    if (isLoadingUser) return;
    
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
      const defaultCatalogId = catalogsData?.data?.[0]?.id || null;
      const defaultSupplierId = suppliersData?.data?.[0]?.id || null;
      
      // Create payload matching the API's expected format
      // This must match createProductDraftSchema from shared/validation-schemas.ts
      const initialData: any = {
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
        // Include catalog and supplier IDs to match server requirements
        catalogId: defaultCatalogId,
        supplierId: defaultSupplierId,
        completedSteps: [],
        draftStatus: 'draft',
        wizardProgress: {
          "basic-info": false, 
          "images": false, 
          "additional-info": false, 
          "review": false
        }
      };
      
      // If in edit mode, use the existing product ID
      if (editMode && productId) {
        initialData.originalProductId = productId;
      }
      
      // Send the draft data directly to the server
      console.log('Creating product draft with data:', initialData);
      createDraftMutation.mutate(initialData);
    }
  }, [draftId, editMode, productId, user, isLoadingUser, setLocation, toast, catalogsData, suppliersData]);

  // Handle step changes
  const handleStepChange = (step: string) => {
    setCurrentStep(step as ProductDraftStep);
  };

  // Handle saving the current step
  const handleSaveStep = (stepData: any) => {
    console.log('Saving step data:', stepData);
    
    // Format and validate data per step requirements before sending
    // The API route expects { step: string, data: any }
    // The server will handle partial updates based on the step
    const formattedData = {
      ...stepData,
      // Add the current step to completedSteps if not already there
      completedSteps: draftData?.data.completedSteps 
        ? Array.from(new Set([...draftData.data.completedSteps, currentStep]))
        : [currentStep],
      // Make sure catalog and supplier IDs are included
      catalogId: stepData.catalogId || draftData?.data.catalogId || 1,
      supplierId: stepData.supplierId || draftData?.data.supplierId || null,
    };
    
    console.log('Formatted step data for API:', formattedData);
    
    updateStepMutation.mutate({
      step: currentStep,
      data: formattedData,
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
    
    console.log('Publishing draft:', draftId);
    publishDraftMutation.mutate();
  };

  // Handle deleting the draft
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  // Determine if a step is completed
  const isStepCompleted = (step: string) => {
    // Handle different formats of completedSteps (string array or possibly undefined)
    if (!draftData?.data.completedSteps) return false;
    
    // Make sure we're working with an array
    const completedSteps = Array.isArray(draftData.data.completedSteps) 
      ? draftData.data.completedSteps 
      : [];
      
    return completedSteps.includes(step);
  };

  // Loading state
  if (isLoading || createDraftMutation.isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading product information...</span>
      </div>
    );
  }

  // Error state
  if (isError || !draftId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Error Loading Product</h3>
        <p className="mb-4">There was a problem loading the product information.</p>
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
        <TabsList className="grid grid-cols-4 mb-6">
          {WIZARD_STEPS.map((step) => (
            <TabsTrigger 
              key={step.id} 
              value={step.id}
              className={isStepCompleted(step.id) ? 'data-[state=active]:border-primary data-[state=active]:bg-primary/10 border-green-500 bg-green-100' : ''}
            >
              {step.label}
            </TabsTrigger>
          ))}
        </TabsList>

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
              onClick={() => {
                const currentIndex = WIZARD_STEPS.findIndex((step) => step.id === currentStep);
                if (currentIndex < WIZARD_STEPS.length - 1) {
                  setCurrentStep(WIZARD_STEPS[currentIndex + 1].id as ProductDraftStep);
                }
              }}
              variant="outline"
            >
              Next Step
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

