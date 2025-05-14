/**
 * Basic Info Step
 * 
 * This component manages the basic product information including
 * name, SKU, brand, category, and descriptions.
 */

import { useEffect, useState } from 'react';
import { useDraftContext } from '../DraftContext';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { debounce, generateSlug } from '@/lib/utils';
import { DescriptionGenerator } from '../ai-features/DescriptionGenerator';

interface BasicInfoStepProps {
  onNext: () => void;
}

export function BasicInfoStep({ onNext }: BasicInfoStepProps) {
  const { draft, updateDraft, saveDraft } = useDraftContext();
  const [hasNameChanged, setHasNameChanged] = useState(false);
  
  // Auto-save with debounce
  const debouncedSave = debounce(async () => {
    try {
      await saveDraft();
    } catch (err) {
      console.error('Failed to auto-save draft:', err);
    }
  }, 1500);
  
  // Query to fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });
  
  // Auto-generate slug when name changes (if not manually edited)
  useEffect(() => {
    if (draft?.name && !hasNameChanged) {
      updateDraft({ slug: generateSlug(draft.name) });
    }
  }, [draft?.name, hasNameChanged]);
  
  // Handle form field changes
  const handleChange = (field: string, value: string | number | null) => {
    updateDraft({ [field]: value });
    debouncedSave();
  };
  
  // Handle slug change and mark as manually edited
  const handleSlugChange = (value: string) => {
    setHasNameChanged(true);
    handleChange('slug', value);
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Basic Information</h2>
      <p className="text-muted-foreground">
        Enter the essential details about your product.
      </p>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Product Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="Enter product name"
                value={draft?.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>
            
            {/* Product SKU */}
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                placeholder="Enter SKU"
                value={draft?.sku || ''}
                onChange={(e) => handleChange('sku', e.target.value)}
              />
            </div>
            
            {/* Product Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug <span className="text-destructive">*</span></Label>
              <div className="flex items-center">
                <span className="text-muted-foreground mr-1">/products/</span>
                <Input
                  id="slug"
                  placeholder="product-url-slug"
                  value={draft?.slug || ''}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  required
                />
              </div>
            </div>
            
            {/* Brand */}
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                placeholder="Enter brand name"
                value={draft?.brand || ''}
                onChange={(e) => handleChange('brand', e.target.value)}
              />
            </div>
            
            {/* Category */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={draft?.categoryId?.toString() || ''}
                onValueChange={(value) => handleChange('categoryId', value ? parseInt(value, 10) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="space-y-6">
            {/* Short Description */}
            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description</Label>
              <Textarea
                id="shortDescription"
                placeholder="Enter a short product description"
                value={draft?.shortDescription || ''}
                onChange={(e) => handleChange('shortDescription', e.target.value)}
                rows={3}
              />
            </div>
            
            {/* Full Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Full Description</Label>
              <Textarea
                id="description"
                placeholder="Enter detailed product description"
                value={draft?.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={6}
              />
            </div>
            
            {/* AI Description Generator */}
            {draft && <DescriptionGenerator />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}