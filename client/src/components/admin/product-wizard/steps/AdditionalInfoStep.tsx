/**
 * Additional Info Step Component
 * 
 * Handles collection of additional product information including
 * physical properties, shipping information, and tags.
 */

import React, { useEffect } from 'react';
import { useProductWizardContext } from '../context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { 
  RulerIcon, 
  TruckIcon, 
  TagIcon, 
  CalendarIcon, 
  PlusCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';

const AdditionalInfoStep: React.FC = () => {
  const { 
    state, 
    updateField, 
    markStepComplete, 
    validateStep,
    catalogContext
  } = useProductWizardContext();
  
  // Local state for tag input
  const [tagInput, setTagInput] = React.useState('');
  
  // Auto-validate on mount to set completedSteps correctly
  useEffect(() => {
    const isValid = validateStep('additional-info');
    
    if (isValid) {
      markStepComplete('additional-info');
    }
  }, [validateStep, markStepComplete]);
  
  // Apply catalog context defaults when catalogContext changes
  useEffect(() => {
    if (catalogContext && !state.productId) {
      // Apply shipping defaults if they aren't already set
      if (catalogContext.defaultShippingInfo) {
        if (state.weight === null && catalogContext.defaultShippingInfo.weight) {
          updateField('weight', catalogContext.defaultShippingInfo.weight);
        }
        
        if (catalogContext.defaultShippingInfo.weightUnit) {
          updateField('weightUnit', catalogContext.defaultShippingInfo.weightUnit);
        }
        
        if (catalogContext.defaultShippingInfo.dimensions) {
          if (state.length === null && catalogContext.defaultShippingInfo.dimensions.length) {
            updateField('length', catalogContext.defaultShippingInfo.dimensions.length);
          }
          
          if (state.width === null && catalogContext.defaultShippingInfo.dimensions.width) {
            updateField('width', catalogContext.defaultShippingInfo.dimensions.width);
          }
          
          if (state.height === null && catalogContext.defaultShippingInfo.dimensions.height) {
            updateField('height', catalogContext.defaultShippingInfo.dimensions.height);
          }
          
          if (catalogContext.defaultShippingInfo.dimensions.unit) {
            updateField('dimensionUnit', catalogContext.defaultShippingInfo.dimensions.unit);
          }
        }
        
        if (catalogContext.defaultShippingInfo.freeShipping !== undefined) {
          updateField('freeShipping', catalogContext.defaultShippingInfo.freeShipping);
        }
      }
      
      // Apply default tags if none are set
      if (catalogContext.defaultTags.length > 0 && state.tags.length === 0) {
        updateField('tags', [...catalogContext.defaultTags]);
      }
    }
  }, [catalogContext, state.productId, state.weight, state.length, state.width, state.height, state.tags.length, updateField]);
  
  // Handle text/number input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      updateField(name as keyof typeof state, value ? parseFloat(value) : null);
    } else {
      updateField(name as keyof typeof state, value);
    }
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (name: keyof typeof state, checked: boolean) => {
    updateField(name, checked);
  };
  
  // Handle select changes
  const handleSelectChange = (name: keyof typeof state, value: string) => {
    updateField(name, value);
  };
  
  // Tag handling functions
  const addTag = () => {
    if (tagInput.trim() && !state.tags.includes(tagInput.trim())) {
      updateField('tags', [...state.tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  const removeTag = (tag: string) => {
    updateField('tags', state.tags.filter(t => t !== tag));
  };
  
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };
  
  // Format date for display
  const formatDate = (date: string | null) => {
    if (!date) return '';
    return format(new Date(date), 'PPP');
  };
  
  return (
    <div className="product-wizard-additional-info space-y-6">
      <h2 className="text-2xl font-bold">Additional Information</h2>
      <p className="text-muted-foreground">
        Add more details about this product to improve its listing and classification.
      </p>
      
      {/* Physical Properties Section */}
      <div className="physical-properties">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <RulerIcon className="mr-2 h-5 w-5" />
          Physical Properties
        </h3>
        
        {/* Is Physical Toggle */}
        <div className="flex items-center space-x-2 mb-6">
          <Checkbox
            id="isPhysical"
            checked={state.isPhysical}
            onCheckedChange={(checked) => 
              handleCheckboxChange('isPhysical', checked === true)
            }
          />
          <Label htmlFor="isPhysical" className="cursor-pointer">
            This is a physical product
          </Label>
        </div>
        
        {/* Physical Properties Fields (conditionally shown) */}
        {state.isPhysical && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    id="weight"
                    name="weight"
                    type="number"
                    value={state.weight === null ? '' : state.weight}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                  />
                </div>
                <Select
                  value={state.weightUnit}
                  onValueChange={(value) => handleSelectChange('weightUnit', value)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="oz">oz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Length */}
            <div className="space-y-2">
              <Label htmlFor="length">Length</Label>
              <Input
                id="length"
                name="length"
                type="number"
                value={state.length === null ? '' : state.length}
                onChange={handleInputChange}
                placeholder="0.00"
                min={0}
                step={0.01}
              />
            </div>
            
            {/* Width */}
            <div className="space-y-2">
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                name="width"
                type="number"
                value={state.width === null ? '' : state.width}
                onChange={handleInputChange}
                placeholder="0.00"
                min={0}
                step={0.01}
              />
            </div>
            
            {/* Height */}
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                name="height"
                type="number"
                value={state.height === null ? '' : state.height}
                onChange={handleInputChange}
                placeholder="0.00"
                min={0}
                step={0.01}
              />
            </div>
            
            {/* Dimension Unit */}
            <div className="space-y-2">
              <Label htmlFor="dimensionUnit">Dimension Unit</Label>
              <Select
                value={state.dimensionUnit}
                onValueChange={(value) => handleSelectChange('dimensionUnit', value)}
              >
                <SelectTrigger id="dimensionUnit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="in">inches</SelectItem>
                  <SelectItem value="ft">feet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Shipping & Availability Section */}
      <div className="shipping">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <TruckIcon className="mr-2 h-5 w-5" />
          Shipping & Availability
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Shipping Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="freeShipping"
              checked={state.freeShipping}
              onCheckedChange={(checked) => 
                handleCheckboxChange('freeShipping', checked === true)
              }
            />
            <Label htmlFor="freeShipping" className="cursor-pointer">
              Free Shipping
            </Label>
          </div>
          
          {/* Publish Date */}
          <div className="space-y-2">
            <Label htmlFor="publishDate">Publish Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  id="publishDate"
                  className={cn(
                    "w-full flex items-center justify-start rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                    "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {state.publishDate ? (
                    formatDate(state.publishDate)
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={state.publishDate ? new Date(state.publishDate) : undefined}
                  onSelect={(date) => 
                    updateField('publishDate', date ? date.toISOString() : null)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground mt-1">
              If set, the product will only be published on or after this date
            </p>
          </div>
          
          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  id="expiryDate"
                  className={cn(
                    "w-full flex items-center justify-start rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                    "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {state.expiryDate ? (
                    formatDate(state.expiryDate)
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={state.expiryDate ? new Date(state.expiryDate) : undefined}
                  onSelect={(date) => 
                    updateField('expiryDate', date ? date.toISOString() : null)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground mt-1">
              If set, the product will be automatically unpublished on this date
            </p>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Tags Section */}
      <div className="tags">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <TagIcon className="mr-2 h-5 w-5" />
          Tags
        </h3>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Enter a tag and press Enter"
              />
            </div>
            <Button
              type="button"
              onClick={addTag}
              size="icon"
              variant="secondary"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {state.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1 pl-2 pr-1">
                {tag}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full"
                  onClick={() => removeTag(tag)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            {state.tags.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No tags added yet. Tags improve discoverability in search.
              </p>
            )}
          </div>
          
          {catalogContext?.defaultTags.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Suggested tags from catalog:</p>
              <div className="flex flex-wrap gap-2">
                {catalogContext.defaultTags.map(tag => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-secondary"
                    onClick={() => {
                      if (!state.tags.includes(tag)) {
                        updateField('tags', [...state.tags, tag]);
                      }
                    }}
                  >
                    {state.tags.includes(tag) ? `✓ ${tag}` : `+ ${tag}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdditionalInfoStep;