/**
 * Additional Product Information Step
 * 
 * This component implements Step 3 of the product wizard,
 * collecting additional details like SKU, brand, minimum order,
 * tags, attributes, and sales configuration.
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, Clock, Loader2, Tag, 
  Tags, Star, TruckIcon, Sparkles, BellDot 
} from 'lucide-react';

import { useProductWizard } from '../context';
import { WizardActionType } from '../types';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger, 
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface AdditionalInfoStepProps {
  className?: string;
}

const AdditionalInfoStep: React.FC<AdditionalInfoStepProps> = ({ className }) => {
  const { state, dispatch } = useProductWizard();
  const { productData } = state;
  
  // State for tag input
  const [tagInput, setTagInput] = useState('');
  
  // Fetch attributes
  const { data: attributesResponse, isLoading: isAttributesLoading } = useQuery({
    queryKey: ['/api/attributes'],
    queryFn: async () => {
      const res = await fetch('/api/attributes');
      if (!res.ok) throw new Error('Failed to fetch attributes');
      return res.json();
    }
  });
  
  const attributes = attributesResponse?.data || [];
  
  // Handle field change
  const handleFieldChange = (field: string, value: any) => {
    // Numeric field conversion
    if (['minimumOrder'].includes(field)) {
      value = value === '' ? 1 : Number(value);
    }
    
    dispatch({
      type: WizardActionType.UPDATE_PRODUCT_DATA,
      payload: { [field]: value }
    });
  };
  
  // Handle date fields
  const handleDateChange = (field: string, date: Date | null) => {
    dispatch({
      type: WizardActionType.UPDATE_PRODUCT_DATA,
      payload: { [field]: date }
    });
  };
  
  // Handle tag addition
  const handleAddTag = () => {
    if (tagInput.trim() && !productData.tags?.includes(tagInput.trim())) {
      const newTags = [...(productData.tags || []), tagInput.trim()];
      handleFieldChange('tags', newTags);
      setTagInput('');
    }
  };
  
  // Handle tag removal
  const handleRemoveTag = (tag: string) => {
    const newTags = (productData.tags || []).filter(t => t !== tag);
    handleFieldChange('tags', newTags);
  };
  
  // Handle tag input keypress
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };
  
  // Generate AI tag suggestions
  const generateTagSuggestions = async () => {
    // This would be implemented with the AI service
    // For now, we'll just show a placeholder implementation
    alert('AI Tag Suggestion feature will be implemented soon!');
  };
  
  if (isAttributesLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2">Loading data...</span>
      </div>
    );
  }
  
  return (
    <div className={className}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Additional Product Information</h2>
        <p className="text-muted-foreground">
          Add product details, attributes, and sales configuration.
        </p>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SKU */}
              <FormItem>
                <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter product SKU"
                    value={productData.sku || ''}
                    onChange={(e) => handleFieldChange('sku', e.target.value)}
                  />
                </FormControl>
                <FormDescription>
                  A unique identifier for your product
                </FormDescription>
              </FormItem>
              
              {/* Brand */}
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter product brand"
                    value={productData.brand || ''}
                    onChange={(e) => handleFieldChange('brand', e.target.value)}
                  />
                </FormControl>
                <FormDescription>
                  The manufacturer or brand name
                </FormDescription>
              </FormItem>
              
              {/* Minimum Order */}
              <FormItem>
                <FormLabel>Minimum Order Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    value={productData.minimumOrder || ''}
                    onChange={(e) => handleFieldChange('minimumOrder', e.target.value)}
                  />
                </FormControl>
                <FormDescription>
                  Minimum quantity customers must order
                </FormDescription>
              </FormItem>
            </div>
            
            {/* Short Description */}
            <FormItem>
              <FormLabel>Short Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief summary of the product..."
                  rows={2}
                  value={productData.shortDescription || ''}
                  onChange={(e) => handleFieldChange('shortDescription', e.target.value)}
                />
              </FormControl>
              <FormDescription>
                A concise summary shown in product listings (max 200 characters)
              </FormDescription>
            </FormItem>
            
            {/* Tags */}
            <FormItem>
              <FormLabel>Product Tags</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    placeholder="Add a tag (press Enter)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                  />
                </FormControl>
                <Button type="button" onClick={handleAddTag} size="sm">
                  <Tag className="h-4 w-4 mr-2" />
                  Add
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={generateTagSuggestions}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Suggest
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Generate AI tag suggestions based on product info
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {(productData.tags || []).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="px-2 py-1">
                    {tag}
                    <button 
                      type="button"
                      className="ml-2 text-muted-foreground hover:text-foreground"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
                {(productData.tags || []).length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No tags added yet</p>
                )}
              </div>
              <FormDescription>
                Tags help customers find your product
              </FormDescription>
            </FormItem>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Sales Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Flash Sale Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Flash Deal</h4>
                    <p className="text-sm text-muted-foreground">
                      Time-limited promotion with special visibility
                    </p>
                  </div>
                  <Switch
                    checked={productData.isFlashDeal || false}
                    onCheckedChange={(checked) => handleFieldChange('isFlashDeal', checked)}
                  />
                </div>
                
                {productData.isFlashDeal && (
                  <div className="space-y-4 pt-2">
                    {/* Flash Deal Start */}
                    <FormItem>
                      <FormLabel>Flash Deal Start</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {productData.flashDealStart ? (
                                new Date(productData.flashDealStart).toLocaleDateString()
                              ) : (
                                <span>Pick a start date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={productData.flashDealStart ? new Date(productData.flashDealStart) : undefined}
                            onSelect={(date) => handleDateChange('flashDealStart', date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                    
                    {/* Flash Deal End */}
                    <FormItem>
                      <FormLabel>Flash Deal End</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {productData.flashDealEnd ? (
                                new Date(productData.flashDealEnd).toLocaleDateString()
                              ) : (
                                <span>Pick an end date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={productData.flashDealEnd ? new Date(productData.flashDealEnd) : undefined}
                            onSelect={(date) => handleDateChange('flashDealEnd', date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  </div>
                )}
              </div>
              
              {/* Special Sale Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Special Sale</h4>
                    <p className="text-sm text-muted-foreground">
                      Custom promotion with special messaging
                    </p>
                  </div>
                  <Switch
                    checked={!!productData.specialSaleText}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        handleFieldChange('specialSaleText', '');
                      } else {
                        handleFieldChange('specialSaleText', 'Special Offer!');
                      }
                    }}
                  />
                </div>
                
                {productData.specialSaleText && (
                  <div className="space-y-4 pt-2">
                    {/* Special Sale Text */}
                    <FormItem>
                      <FormLabel>Special Sale Text</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Special Offer!"
                          value={productData.specialSaleText}
                          onChange={(e) => handleFieldChange('specialSaleText', e.target.value)}
                        />
                      </FormControl>
                    </FormItem>
                    
                    {/* Special Sale Start */}
                    <FormItem>
                      <FormLabel>Special Sale Start</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {productData.specialSaleStart ? (
                                new Date(productData.specialSaleStart).toLocaleDateString()
                              ) : (
                                <span>Pick a start date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={productData.specialSaleStart ? new Date(productData.specialSaleStart) : undefined}
                            onSelect={(date) => handleDateChange('specialSaleStart', date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                    
                    {/* Special Sale End */}
                    <FormItem>
                      <FormLabel>Special Sale End</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {productData.specialSaleEnd ? (
                                new Date(productData.specialSaleEnd).toLocaleDateString()
                              ) : (
                                <span>Pick an end date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={productData.specialSaleEnd ? new Date(productData.specialSaleEnd) : undefined}
                            onSelect={(date) => handleDateChange('specialSaleEnd', date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  </div>
                )}
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              {/* Feature Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Free Shipping */}
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Free Shipping</FormLabel>
                    <FormDescription>
                      Offer free shipping for this product
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={productData.freeShipping || false}
                      onCheckedChange={(checked) => handleFieldChange('freeShipping', checked)}
                    />
                  </FormControl>
                </FormItem>
                
                {/* Featured Product */}
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Featured Product</FormLabel>
                    <FormDescription>
                      Show in featured products section
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={productData.isFeatured || false}
                      onCheckedChange={(checked) => handleFieldChange('isFeatured', checked)}
                    />
                  </FormControl>
                </FormItem>
              </div>
              
              {/* Product Status */}
              <FormItem className="pt-4">
                <FormLabel>Product Status</FormLabel>
                <Select
                  value={productData.status || 'draft'}
                  onValueChange={(value) => handleFieldChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft (Not Visible)</SelectItem>
                    <SelectItem value="inactive">Inactive (Hidden)</SelectItem>
                    <SelectItem value="active">Active (Visible)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Control the visibility of this product
                </FormDescription>
              </FormItem>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdditionalInfoStep;