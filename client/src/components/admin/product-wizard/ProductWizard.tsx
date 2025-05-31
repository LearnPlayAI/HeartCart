import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Save, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';

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
  // Basic product information
  name: string;
  description: string | null;
  slug: string;
  sku: string | null;
  brand: string | null;
  categoryId: number | null;
  supplierUrl?: string | null;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  isActive: boolean;
  isFeatured: boolean;
  catalogId: number | null;
  
  // Pricing information
  regularPrice: number | null;
  salePrice: number | null;
  costPrice: number | null;
  onSale: boolean;
  markupPercentage: number | null;
  minimumPrice: number | null;
  
  // Images
  imageUrls: string[];
  imageObjectKeys: string[];
  mainImageIndex: number;
  
  // Inventory
  stockLevel: number | null;
  lowStockThreshold: number | null;
  backorderEnabled: boolean;
  
  // Rating and reviews for marketplace appearance
  rating?: number | null;
  review_count?: number | null;
  
  // Attributes
  attributes: Array<{
    attributeId: number;
    value: string | string[] | null;
  }>;
  attributesData?: Array<{
    attributeId: number;
    attributeName: string;
    displayName: string;
    attributeType: string;
    isRequired: boolean;
    options?: Array<{
      id: number;
      value: string;
      displayValue: string;
      metadata?: any;
    }>;
    selectedOptions?: number[]; 
    textValue?: string | null;
  }>;
  
  // Supplier information
  supplierId: number | null;
  
  // Physical properties
  weight: string | null;
  dimensions: string | null;
  
  // Promotions
  discountLabel: string | null;
  specialSaleText: string | null;
  // Store dates as strings for SAST timezone correctness (not as Date objects)
  specialSaleStart: string | null;
  specialSaleEnd: string | null;
  isFlashDeal: boolean;
  flashDealEnd: string | null;
  
  // Tax information
  taxable: boolean;
  taxClass: string;
  
  // SEO metadata
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  canonicalUrl: string | null;
  tags?: string[];
  
  // Publication information
  publishedAt?: Date | null;
  publishedVersion?: number;
  
  // AI-generated content flags
  hasAIDescription?: boolean;
  hasAISeo?: boolean;
  
  // Shipping information
  freeShipping?: boolean;
  shippingClass?: string;
  
  // System fields
  originalProductId: number | null;
  createdBy: number;
  createdAt?: Date;
  draftStatus: string;
  lastModified: Date;
  completedSteps: string[];
  wizardProgress: Record<string, boolean>;
  
  // Detailed audit information
  lastReviewer?: number | null;
  rejectionReason?: string | null;
  
  // Version control
  version?: number;
  
  // Change history
  changeHistory?: Array<{
    timestamp: Date;
    userId: number;
    fields: string[];
    changedFrom: any;
    changedTo: any;
    notes?: string;
  }>;
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
  const [currentProductName, setCurrentProductName] = useState<string>('');

  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

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
        // Set the internal draft ID to prevent further creation attempts
        setInternalDraftId(data.data.id);
        
        // Also ensure the hasDraftBeenCreated flag remains true
        hasDraftBeenCreated.current = true;
        
        // Invalidate any queries related to this draft
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', data.data.id] });
        
        // Notify the user
        
        
        console.log(`Draft created successfully with ID: ${data.data.id}`);
      } else {
        // Reset the flag if creation failed to allow retrying
        hasDraftBeenCreated.current = false;
        
        toast({
          title: 'Error',
          description: data.error?.message || 'Could not create product draft',
          variant: 'destructive',
        });
        console.error('Failed to create draft:', data);
      }
    },
    onError: (error: any) => {
      // Reset the creation flag to allow retry
      hasDraftBeenCreated.current = false;
      
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

  // Update currentProductName when draft data loads
  useEffect(() => {
    if (draftData?.success && draftData?.data?.name) {
      setCurrentProductName(draftData.data.name);
    }
  }, [draftData]);

  // Callback function to update product name in real-time
  const onProductNameChange = (name: string) => {
    setCurrentProductName(name);
  };

  // Update a specific wizard step
  const updateStepMutation = useMutation({
    mutationFn: async ({ step, stepData }: { step: ProductDraftStep; stepData: any }) => {
      if (!draftId) throw new Error('No draft ID available');
      
      // Format the data according to server validation schema
      const requestData = {
        step: STEP_MAP[step], // Convert string step to number (0-6)
        draftData: stepData
      };
      
      console.log(`Updating step ${step} (${STEP_MAP[step]}) with data:`, requestData);
      
      // Enhanced logging to debug sales promotions issue
      if (step === 'sales-promotions') {
        console.log(`Sales promotions data being sent:`, {
          step: step,
          stepNumber: STEP_MAP[step],
          data: stepData,
          // Add explicit logging for the fields that were not persisting
          discountLabel: stepData.discountLabel,
          specialSaleText: stepData.specialSaleText,
          specialSaleStart: stepData.specialSaleStart,
          specialSaleEnd: stepData.specialSaleEnd,
          isFlashDeal: stepData.isFlashDeal,
          flashDealEnd: stepData.flashDealEnd,
          // Rating and review count fields
          rating: stepData.rating,
          review_count: stepData.review_count
        });
      }
      
      const response = await apiRequest('PATCH', `/api/product-drafts/${draftId}/wizard-step`, requestData);
      const responseData = await response.json();
      
      // Log response for debugging
      console.log(`Server response for step ${step}:`, responseData);
      
      return responseData;
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', draftId] });
        
        
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



  // Publish a draft to create/update the actual product
  const publishDraftMutation = useMutation({
    mutationFn: async () => {
      if (!draftId) throw new Error('No draft ID available');
      const response = await apiRequest('POST', `/api/product-drafts/${draftId}/publish`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        
        
        // Determine redirect destination based on context
        const currentPath = window.location.pathname;
        const referrer = document.referrer;
        
        // Check if we came from the pricing page
        // Also check if there's a flag in sessionStorage indicating we came from pricing
        const cameFromPricing = referrer.includes('/admin/pricing') || 
                               currentPath.includes('/admin/pricing') ||
                               sessionStorage.getItem('cameFromPricing') === 'true';
        
        if (cameFromPricing) {
          // Clear the flag
          sessionStorage.removeItem('cameFromPricing');
          // Invalidate products query to refresh pricing data
          queryClient.invalidateQueries({ queryKey: ['/api/products'] });
          // Redirect back to pricing page
          setLocation('/admin/pricing');
        } else {
          // Check if we came from a catalog context (either current URL or referrer)
          const catalogMatch = currentPath.match(/\/admin\/catalogs\/(\d+)/) || 
                              referrer.match(/\/admin\/catalogs\/(\d+)\/products/);
          
          if (catalogMatch) {
            // If we came from a catalog context, redirect back to that catalog
            const catalogId = catalogMatch[1];
            setLocation(`/admin/catalogs/${catalogId}/products`);
          } else if (draft?.catalogId) {
            // If we have a catalog ID in the draft, redirect to that catalog
            setLocation(`/admin/catalogs/${draft.catalogId}/products`);
          } else {
            // Default fallback to general product management
            setLocation('/admin/products');
          }
        }
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

  // Initialize the wizard - using a ref to track whether we've initiated a draft creation
  const hasDraftBeenCreated = React.useRef(false);
  
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
    // Only create a draft if we don't have a draftId AND we haven't already initiated draft creation
    if (!draftId && !internalDraftId && !hasDraftBeenCreated.current) {
      // Set the flag to true to prevent multiple creation attempts
      hasDraftBeenCreated.current = true;
      
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
        tags: [],
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
      
      console.log("Initiating draft creation - one time only");
      createDraftMutation.mutate(initialData);
    }
  }, [draftId, internalDraftId, user, isLoadingUser, catalogsData, suppliersData]);

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

  // Handle saving and publishing from the basic info step
  const handleSaveAndPublish = (stepData: any) => {
    setIsPublishing(true);
    
    // First save the step data using the existing handleSaveStep function
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
    
    // Update the step first, then publish using the existing publish function
    updateStepMutation.mutate({
      step: currentStep,
      stepData: formattedData,
    }, {
      onSuccess: () => {
        // After successfully saving the step, use the existing publish function
        handlePublish();
      },
      onError: (error) => {
        console.error('Failed to save step before publishing:', error);
        toast({
          title: 'Error',
          description: 'Failed to save changes before publishing',
          variant: 'destructive',
        });
        setIsPublishing(false);
      }
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

  // Handle saving step data with optional auto-advancement
  const handleStepSave = (stepData: any, autoAdvance: boolean = false) => {
    if (autoAdvance) {
      setIsAutoAdvancing(true);
    }
    updateStepMutation.mutate({ step: currentStep, stepData });
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

  const StepProgress = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between overflow-x-auto">
        {WIZARD_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = isStepCompleted(step.id);
          const isCurrent = currentStep === step.id;
          const isLast = index === WIZARD_STEPS.length - 1;
          
          return (
            <div key={step.id} className="flex items-center min-w-0">
              <div 
                className={`flex items-center cursor-pointer transition-all duration-200 ${
                  isCurrent ? 'transform scale-105' : ''
                }`}
                onClick={() => handleStepChange(step.id)}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-200
                  ${isCurrent 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                    : isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-600 hover:border-gray-400'
                  }
                `}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    stepNumber
                  )}
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <div className={`text-sm font-medium truncate ${
                    isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </div>
                  <div className="text-xs text-gray-400 hidden sm:block">
                    {step.description || `Step ${stepNumber}`}
                  </div>
                </div>
              </div>
              
              {/* Connector line */}
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-4 transition-colors duration-200 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <StepProgress />
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">
          {editMode && currentProductName ? `Edit: ${currentProductName}` : editMode ? 'Edit Product' : 'Add New Product'}
        </h2>

        <Tabs value={currentStep} onValueChange={handleStepChange} className="w-full">
          {/* Mobile-friendly content area */}
          {WIZARD_STEPS.map((step) => (
            <TabsContent key={step.id} value={step.id} className="pt-4">
              <CurrentStepComponent
                draft={draft as ProductDraft}
                onSave={handleStepSave}
                onSaveAndPublish={step.id === 'basic-info' ? handleSaveAndPublish : undefined}
                onProductNameChange={step.id === 'basic-info' ? onProductNameChange : undefined}
                isLoading={updateStepMutation.isPending}
                isPublishing={isPublishing}
              />
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-between mt-6 pt-4 border-t">
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
      </div>
    </>
  );
};

