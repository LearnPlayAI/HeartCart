/**
 * SEO Step
 * 
 * This component handles the SEO information for the product,
 * including meta title, description, keywords, and URL settings.
 * It also integrates with the AI-powered SEO optimization.
 */

import { useState, useEffect } from 'react';
import { useDraftContext } from '../DraftContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Search, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SeoOptimizer } from '../ai-features/SeoOptimizer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { debounce } from '@/lib/utils';

interface SeoStepProps {
  onNext: () => void;
}

export function SeoStep({ onNext }: SeoStepProps) {
  const { draft, updateDraft, saveDraft } = useDraftContext();
  const { toast } = useToast();
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [slug, setSlug] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Initialize form with draft data when available
  useEffect(() => {
    if (draft) {
      setMetaTitle(draft.metaTitle || '');
      setMetaDescription(draft.metaDescription || '');
      setKeywords(draft.keywords || '');
      setSlug(draft.slug || '');
      setCanonicalUrl(draft.canonicalUrl || '');
      setPageTitle(draft.pageTitle || '');
    }
  }, [draft]);
  
  // Auto-save with debounce
  const debouncedSave = debounce(async () => {
    try {
      await saveDraft();
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to auto-save draft:', err);
    }
  }, 1500);
  
  // Handle field changes
  const handleFieldChange = (field: string, value: string) => {
    const updates: Record<string, string> = {
      [field]: value
    };
    
    // Update local state
    switch (field) {
      case 'metaTitle': setMetaTitle(value); break;
      case 'metaDescription': setMetaDescription(value); break;
      case 'keywords': setKeywords(value); break;
      case 'slug': setSlug(value); break;
      case 'canonicalUrl': setCanonicalUrl(value); break;
      case 'pageTitle': setPageTitle(value); break;
    }
    
    // Update draft and mark as changed
    updateDraft(updates);
    setHasChanges(true);
    
    // Trigger auto-save
    debouncedSave();
  };
  
  // Generate slug from product name
  const generateSlug = () => {
    if (!draft?.name) {
      toast({
        title: 'Error',
        description: 'Product name is required to generate slug',
        variant: 'destructive',
      });
      return;
    }
    
    // Slugify the name
    let slugifiedName = draft.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .replace(/-+/g, '-')           // Replace multiple hyphens with single hyphen
      .trim();
      
    // Update slug
    handleFieldChange('slug', slugifiedName);
    
    
  };
  
  // Generate meta fields from product details
  const generateMetaFields = () => {
    if (!draft?.name) {
      toast({
        title: 'Error',
        description: 'Product name is required to generate meta fields',
        variant: 'destructive',
      });
      return;
    }
    
    // Generate meta title
    const brand = draft.brand ? `${draft.brand} ` : '';
    const category = draft.category?.name ? ` | ${draft.category.name}` : '';
    const metaTitle = `${brand}${draft.name}${category}`.slice(0, 60);
    
    // Generate meta description
    let metaDescription = '';
    if (draft.shortDescription) {
      metaDescription = draft.shortDescription.slice(0, 160);
    } else if (draft.description) {
      metaDescription = draft.description.slice(0, 160);
      if (metaDescription.length === 160) {
        metaDescription = metaDescription.slice(0, 157) + '...';
      }
    } else {
      metaDescription = `Shop for ${draft.name} at our store. ${brand ? `Quality products from ${brand}. ` : ''}Fast shipping, easy returns.`;
    }
    
    // Generate page title
    const pageTitle = draft.name;
    
    // Update meta fields
    handleFieldChange('metaTitle', metaTitle);
    handleFieldChange('metaDescription', metaDescription);
    handleFieldChange('pageTitle', pageTitle);
    
    
  };
  
  // Explicitly save changes
  const saveChanges = async () => {
    try {
      await saveDraft();
      setHasChanges(false);
      
      
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Continue to next step
  const handleNext = () => {
    if (hasChanges) {
      saveChanges().then(() => {
        onNext();
      });
    } else {
      onNext();
    }
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Search Engine Optimization</h2>
      <p className="text-muted-foreground">
        Optimize your product for search engines to increase visibility and reach more potential customers.
      </p>
      
      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic SEO</TabsTrigger>
          <TabsTrigger value="ai">AI SEO Optimization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pageTitle">Page Title</Label>
                      <span className="text-xs text-muted-foreground">{pageTitle.length}/100</span>
                    </div>
                    <Input
                      id="pageTitle"
                      placeholder="Main product page heading"
                      value={pageTitle}
                      onChange={(e) => handleFieldChange('pageTitle', e.target.value)}
                      maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      The main heading displayed on the product page.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="slug">URL Slug</Label>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={generateSlug}
                      >
                        Generate
                      </Button>
                    </div>
                    <Input
                      id="slug"
                      placeholder="product-url-slug"
                      value={slug}
                      onChange={(e) => handleFieldChange('slug', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The URL-friendly version of the product name.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="metaTitle">Meta Title</Label>
                    <span className={`text-xs ${metaTitle.length > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {metaTitle.length}/60
                    </span>
                  </div>
                  <Input
                    id="metaTitle"
                    placeholder="SEO-friendly title tag"
                    value={metaTitle}
                    onChange={(e) => handleFieldChange('metaTitle', e.target.value)}
                    className={metaTitle.length > 60 ? 'border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Appears in search engine results and browser tabs. Keep it under 60 characters.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="metaDescription">Meta Description</Label>
                    <span className={`text-xs ${metaDescription.length > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {metaDescription.length}/160
                    </span>
                  </div>
                  <Textarea
                    id="metaDescription"
                    placeholder="Brief description of the product for search engines"
                    value={metaDescription}
                    onChange={(e) => handleFieldChange('metaDescription', e.target.value)}
                    className={metaDescription.length > 160 ? 'border-destructive' : ''}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    A concise summary that appears in search results. Aim for 150-160 characters.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords</Label>
                  <Textarea
                    id="keywords"
                    placeholder="Comma-separated keywords"
                    value={keywords}
                    onChange={(e) => handleFieldChange('keywords', e.target.value)}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Keywords help search engines understand your product (comma-separated).
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="canonicalUrl">Canonical URL (Optional)</Label>
                  <Input
                    id="canonicalUrl"
                    placeholder="https://example.com/products/original-product"
                    value={canonicalUrl}
                    onChange={(e) => handleFieldChange('canonicalUrl', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use this if this product is a duplicate of another product to avoid SEO penalties.
                  </p>
                </div>
                
                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline" 
                    onClick={generateMetaFields}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Generate Meta Fields
                  </Button>
                  
                  <Button 
                    onClick={handleNext}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                
                {hasChanges && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Unsaved Changes</AlertTitle>
                    <AlertDescription>
                      You have unsaved changes. They will be automatically saved when you continue.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="bg-muted rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2">SEO Preview</h3>
            
            <div className="space-y-2">
              <div>
                <p className="text-blue-600 text-sm font-medium truncate">
                  {metaTitle || 'Product Title - Your Store'}
                </p>
                <p className="text-green-700 text-xs">
                  www.yourdomain.com/products/{slug || 'product-url'}
                </p>
                <p className="text-sm text-gray-600">
                  {metaDescription || 'This is how your product will appear in search engine results. Add a meta description to improve click-through rates.'}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="ai" className="space-y-4">
          <SeoOptimizer />
        </TabsContent>
      </Tabs>
    </div>
  );
}