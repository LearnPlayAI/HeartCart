/**
 * Additional Info Step Component for Product Wizard
 * 
 * This component handles the third step of the product creation process,
 * focusing on additional product details and specifications.
 */

import { useState } from 'react';
import { useProductWizardContext } from '../context';
import { ContextualHelp } from '../contextual-help';
import { ArrowLeftCircle, ArrowRightCircle, CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export const AdditionalInfoStep = () => {
  const { 
    state, 
    updateState, 
    goToPreviousStep, 
    goToNextStep,
    validateStep,
    errors,
  } = useProductWizardContext();
  
  const [activeTab, setActiveTab] = useState<string>('specifications');

  // Handle form submission to go to next step
  const handleContinue = () => {
    if (validateStep('additional-info')) {
      goToNextStep();
    }
  };

  // Format date as ISO string for the datetime input
  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Additional Product Information</h2>
        <p className="text-muted-foreground">
          Enter additional details and specifications for your product to help customers make informed decisions.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="specifications">Specifications</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="visibility">Visibility</TabsTrigger>
        </TabsList>

        {/* Specifications Tab */}
        <TabsContent value="specifications" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is-physical"
                checked={state.isPhysical}
                onCheckedChange={(checked) => updateState({ isPhysical: !!checked })}
              />
              <Label htmlFor="is-physical">This is a physical product</Label>
            </div>

            {state.isPhysical && (
              <div className="grid gap-6 sm:grid-cols-2 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      min="0"
                      value={state.weight || ''}
                      onChange={(e) => updateState({ weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="0.00"
                      className={errors.weight ? 'border-red-500' : ''}
                    />

                    <Select
                      value={state.weightUnit}
                      onValueChange={(value) => updateState({ weightUnit: value as 'g' | 'kg' | 'oz' | 'lb' })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">Grams</SelectItem>
                        <SelectItem value="kg">Kilograms</SelectItem>
                        <SelectItem value="oz">Ounces</SelectItem>
                        <SelectItem value="lb">Pounds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {errors.weight && <p className="text-sm text-red-500">{errors.weight}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Dimensions (Optional)</Label>
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={state.length || ''}
                      onChange={(e) => updateState({ length: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Length"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={state.width || ''}
                      onChange={(e) => updateState({ width: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Width"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={state.height || ''}
                      onChange={(e) => updateState({ height: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Height"
                    />
                    <Select
                      value={state.dimensionUnit}
                      onValueChange={(value) => updateState({ dimensionUnit: value as 'cm' | 'mm' | 'in' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="mm">mm</SelectItem>
                        <SelectItem value="in">in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 mt-4">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Enter tags separated by commas. These help with product discovery in search results.
              </p>
              <Input
                id="tags"
                value={state.tags.join(', ')}
                onChange={(e) => {
                  const tagsArray = e.target.value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag !== '');
                  updateState({ tags: tagsArray });
                }}
                placeholder="e.g. cotton, summer, casual"
              />
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="notes">Internal Notes (Not visible to customers)</Label>
              <Textarea
                id="notes"
                value={state.notes || ''}
                onChange={(e) => updateState({ notes: e.target.value })}
                placeholder="Add any internal notes about this product here"
                className="min-h-[100px]"
              />
            </div>
          </div>
        </TabsContent>

        {/* Shipping Tab */}
        <TabsContent value="shipping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Options</CardTitle>
              <CardDescription>
                Configure how this product will be shipped to customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="free-shipping" className="text-base">Free Shipping</Label>
                  <p className="text-sm text-muted-foreground">
                    Offer free shipping for this product regardless of order value
                  </p>
                </div>
                <Switch
                  id="free-shipping"
                  checked={state.freeShipping}
                  onCheckedChange={(checked) => updateState({ freeShipping: checked })}
                />
              </div>
              
              {/* Other shipping options could be added here */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promotions Tab */}
        <TabsContent value="promotions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Flash Deal</CardTitle>
              <CardDescription>
                Configure a time-limited flash deal for this product
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="flash-deal" className="text-base">Enable Flash Deal</Label>
                  <p className="text-sm text-muted-foreground">
                    Create urgency with a limited-time special price
                  </p>
                </div>
                <Switch
                  id="flash-deal"
                  checked={state.hasFlashDeal}
                  onCheckedChange={(checked) => updateState({ hasFlashDeal: checked })}
                />
              </div>
              
              {state.hasFlashDeal && (
                <div className="grid gap-4 mt-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="flash-deal-price" className="required">Flash Deal Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">R</span>
                      <Input
                        id="flash-deal-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={state.flashDealPrice || ''}
                        onChange={(e) => updateState({ 
                          flashDealPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
                        placeholder="0.00"
                        className={`pl-8 ${errors.flashDealPrice ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.flashDealPrice && (
                      <p className="text-sm text-red-500">{errors.flashDealPrice}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="flash-deal-start" className="required">Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${errors.flashDealStartDate ? 'border-red-500' : ''}`}
                          >
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {state.flashDealStartDate ? (
                              format(new Date(state.flashDealStartDate), 'PP')
                            ) : (
                              <span>Select date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={state.flashDealStartDate ? new Date(state.flashDealStartDate) : undefined}
                            onSelect={(date) => updateState({
                              flashDealStartDate: date ? date.toISOString() : undefined
                            })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.flashDealStartDate && (
                        <p className="text-sm text-red-500">{errors.flashDealStartDate}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="flash-deal-end" className="required">End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${errors.flashDealEndDate ? 'border-red-500' : ''}`}
                          >
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {state.flashDealEndDate ? (
                              format(new Date(state.flashDealEndDate), 'PP')
                            ) : (
                              <span>Select date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={state.flashDealEndDate ? new Date(state.flashDealEndDate) : undefined}
                            onSelect={(date) => updateState({
                              flashDealEndDate: date ? date.toISOString() : undefined
                            })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.flashDealEndDate && (
                        <p className="text-sm text-red-500">{errors.flashDealEndDate}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visibility Tab */}
        <TabsContent value="visibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Visibility</CardTitle>
              <CardDescription>
                Control how and where this product appears in your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is-active" className="text-base">Product Active</Label>
                  <p className="text-sm text-muted-foreground">
                    When active, the product will be visible and available for purchase
                  </p>
                </div>
                <Switch
                  id="is-active"
                  checked={state.isActive}
                  onCheckedChange={(checked) => updateState({ isActive: checked })}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is-featured" className="text-base">Featured Product</Label>
                  <p className="text-sm text-muted-foreground">
                    Featured products appear in special sections on your homepage
                  </p>
                </div>
                <Switch
                  id="is-featured"
                  checked={state.isFeatured}
                  onCheckedChange={(checked) => updateState({ isFeatured: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Separator />
      
      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={goToPreviousStep}
          className="flex items-center gap-2"
        >
          <ArrowLeftCircle className="h-4 w-4" />
          <span>Back to Images</span>
        </Button>
        
        <Button
          type="button"
          onClick={handleContinue}
          className="flex items-center gap-2"
        >
          <span>Continue to Review</span>
          <ArrowRightCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AdditionalInfoStep;