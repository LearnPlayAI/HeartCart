import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Wand2, Save, RefreshCw } from 'lucide-react';
import type { ProductDraft } from '../ProductWizard';

// Define SEO form schema
const seoSchema = z.object({
  metaTitle: z.string().max(70, 'Meta title should be less than 70 characters').nullable().optional(),
  metaDescription: z.string().max(160, 'Meta description should be less than 160 characters').nullable().optional(),
  metaKeywords: z.string().max(255, 'Meta keywords should be less than 255 characters').nullable().optional(),
  canonicalUrl: z.union([
    z.string().url('Invalid URL format'),
    z.string().max(0) // Empty string allowed
  ]).nullable().optional()
});

type SEOFormValues = z.infer<typeof seoSchema>;

interface SEOStepProps {
  draft: ProductDraft;
  onSave: (data: Partial<ProductDraft>, advanceToNext?: boolean) => void;
  isLoading?: boolean;
}

export const SEOStep: React.FC<SEOStepProps> = ({ 
  draft, 
  onSave, 
  isLoading = false 
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [productUrl, setProductUrl] = useState<string>('');
  
  // AI suggestion states
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    title: string;
    description: string;
    keywords: string;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Generate product URL for canonical URL
  useEffect(() => {
    // Only set canonical URL for published products
    if (draft.originalProductId || (draft.draftStatus === 'published' && draft.isActive)) {
      // Get the product ID (either the original product ID or the draft ID if it's published)
      const productId = draft.originalProductId || draft.id;
      
      // Use the production domain
      const baseUrl = 'https://www.teemeyou.shop';
      
      // Create the canonical URL in the format https://www.teemeyou.shop/product/id/{productId}
      if (productId) {
        setProductUrl(`${baseUrl}/product/id/${productId}`);
      }
    } else {
      // Clear the URL if the product is not published
      setProductUrl('');
    }
  }, [draft.id, draft.originalProductId, draft.draftStatus, draft.isActive]);
  
  // Get category info for AI context
  const { data: categoryData } = useQuery({
    queryKey: ['/api/categories', draft.categoryId],
    queryFn: async () => {
      if (!draft.categoryId) return { success: true, data: null };
      return await apiRequest('GET', `/api/categories/${draft.categoryId}`);
    },
    enabled: !!draft.categoryId
  });
  
  // Setup form
  const form = useForm<SEOFormValues>({
    resolver: zodResolver(seoSchema),
    defaultValues: {
      metaTitle: draft.metaTitle || draft.name || '',
      metaDescription: draft.metaDescription || '',
      metaKeywords: draft.metaKeywords || '',
      canonicalUrl: draft.canonicalUrl || ''
    }
  });
  
  // Only show the canonical URL in the form, but don't actually save it for draft products
  // It will be auto-generated when the product is published
  useEffect(() => {
    if (productUrl) {
      form.setValue('canonicalUrl', productUrl, { shouldDirty: false });
    } else {
      form.setValue('canonicalUrl', '', { shouldDirty: false });
    }
  }, [productUrl]);
  
  // Generate SEO suggestions using AI
  const generateSEOSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    setAiError(null);
    
    try {
      const categoryName = categoryData?.data?.name || 'Unknown';
      
      // Get product images if available to enhance AI SEO generation
      let imageUrls: string[] = [];
      if (draft.imageUrls && draft.imageUrls.length > 0) {
        // Filter out any undefined or empty image URLs
        imageUrls = draft.imageUrls
          .filter(url => url && typeof url === 'string' && !url.includes('undefined'))
          .slice(0, 3); // Limit to 3 images to avoid token limits
      }
      
      const currentValues = form.getValues();
      const data = await apiRequest('POST', '/api/ai/optimize-seo', {
        productName: draft.name,
        productDescription: draft.description || '',
        categoryName,
        currentTitle: currentValues.metaTitle || '',
        currentDescription: currentValues.metaDescription || '',
        currentKeywords: currentValues.metaKeywords || ''
      });
      
      if (data.success && data.data) {
        setAiSuggestions(data.data);
        setShowAiDialog(true);
      } else {
        throw new Error(data.error?.message || 'Failed to generate SEO suggestions');
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Failed to generate SEO suggestions');
      toast({
        title: 'SEO Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate SEO suggestions',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };
  
  // Apply AI suggestion
  const applySEOSuggestion = () => {
    if (!aiSuggestions) return;
    
    // Keep the meta title the same as the product title
    form.setValue('metaTitle', draft.name || '');
    form.setValue('metaDescription', aiSuggestions.metaDescription || aiSuggestions.description);
    // Convert keywords array to comma-separated string if it's an array
    const keywordsString = Array.isArray(aiSuggestions.keywords) 
      ? aiSuggestions.keywords.join(', ') 
      : aiSuggestions.keywords;
    form.setValue('metaKeywords', keywordsString);
    
    setShowAiDialog(false);
  };
  
  // Handle form submission
  const onSubmit = async (values: SEOFormValues) => {
    setSaving(true);
    try {
      // For draft products, don't save the canonical URL - it will be set when published
      if (!draft.originalProductId && draft.draftStatus !== 'published') {
        values.canonicalUrl = '';
      }
      
      await onSave(values, true);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <>
      {/* AI SEO Suggestions Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI-Generated SEO Suggestions</DialogTitle>
            <DialogDescription>
              Review the AI generated SEO content and apply it if suitable
            </DialogDescription>
          </DialogHeader>
          
          {aiSuggestions && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Meta Title</h3>
                <p className="text-sm p-3 bg-blue-50 rounded-md border border-blue-200">
                  <span className="text-blue-600 font-medium">Will use product title:</span> {draft.name}
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Meta Description</h3>
                <p className="text-sm p-3 bg-secondary rounded-md">{aiSuggestions.metaDescription || aiSuggestions.description}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Meta Keywords</h3>
                <p className="text-sm p-3 bg-secondary rounded-md">
                  {Array.isArray(aiSuggestions.keywords) 
                    ? aiSuggestions.keywords.join(', ') 
                    : aiSuggestions.keywords}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex items-center justify-between mt-4">
            <div>
              {aiError && (
                <p className="text-sm text-destructive">{aiError}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowAiDialog(false)}>Cancel</Button>
              <Button onClick={applySEOSuggestion}>Apply Suggestions</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Search Engine Optimization</CardTitle>
              <CardDescription>
                Optimize your product for search engines
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={generateSEOSuggestions}
              disabled={isGeneratingSuggestions || !draft.name}
            >
              {isGeneratingSuggestions ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3" />
                  <span>AI Generate</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              {/* Meta Title */}
              <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter meta title"
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value ? field.value.length : 0}/70 characters recommended
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Meta Description */}
              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter meta description"
                        value={field.value || ''}
                        className="min-h-[80px]"
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value ? field.value.length : 0}/160 characters recommended
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Meta Keywords */}
              <FormField
                control={form.control}
                name="metaKeywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Keywords</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter keywords separated by commas"
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Add relevant keywords separated by commas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Canonical URL - Auto-generated */}
              <FormField
                control={form.control}
                name="canonicalUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Canonical URL
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Auto-generated</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={productUrl ? "Auto-generated from product URL" : "Available after product is published"}
                        value={field.value || ''}
                        className="bg-muted text-muted-foreground"
                        readOnly
                      />
                    </FormControl>
                    <FormDescription>
                      {productUrl 
                        ? "This URL is automatically generated for your published product" 
                        : "The canonical URL will be available once the product is published and active"}
                    </FormDescription>
                    {/* This form message is intentionally empty to prevent validation errors */}
                    <div className="min-h-[20px]">
                      {field.value && field.value.length > 0 && !field.value.startsWith('http') && (
                        <p className="text-sm text-destructive hidden">Invalid URL format</p>
                      )}
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={isLoading || saving}
                  className="gap-2"
                >
                  {(isLoading || saving) && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save & Continue
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
};

export default SEOStep;