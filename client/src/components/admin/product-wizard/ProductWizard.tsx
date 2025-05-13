/**
 * Product Wizard Component
 * 
 * This is the main component that handles the product creation workflow.
 * It combines all the step components and manages the navigation between them.
 */

import { ProductWizardProvider, useProductWizardContext, WIZARD_STEPS } from './context';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { ImageStep } from './steps/ImageStep';
import { AdditionalInfoStep } from './steps/AdditionalInfoStep';
import { ReviewAndSaveStep } from './steps/ReviewAndSaveStep';
import { WizardNavigation } from './WizardNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// Wizard content component that displays the appropriate step based on the current state
const WizardContent = () => {
  const { state, isCatalogContextLoading } = useProductWizardContext();
  
  if (isCatalogContextLoading) {
    return <WizardLoadingSkeleton />;
  }
  
  return (
    <Tabs value={state.currentStep} className="w-full">
      <TabsContent value="basic-info" className="mt-0">
        <BasicInfoStep />
      </TabsContent>
      
      <TabsContent value="images" className="mt-0">
        <ImageStep />
      </TabsContent>
      
      <TabsContent value="additional-info" className="mt-0">
        <AdditionalInfoStep />
      </TabsContent>
      
      <TabsContent value="review" className="mt-0">
        <ReviewAndSaveStep />
      </TabsContent>
    </Tabs>
  );
};

// Loading skeleton for the wizard
const WizardLoadingSkeleton = () => {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      
      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapper component for the entire wizard
export interface ProductWizardProps {
  initialState?: any;
  catalogId?: number;
}

export const ProductWizard: React.FC<ProductWizardProps> = ({ 
  initialState, 
  catalogId 
}) => {
  return (
    <ProductWizardProvider initialState={initialState} catalogId={catalogId}>
      <div className="space-y-8">
        <Card>
          <CardContent className="p-6">
            <WizardNavigation steps={WIZARD_STEPS} />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <WizardContent />
          </CardContent>
        </Card>
      </div>
    </ProductWizardProvider>
  );
};