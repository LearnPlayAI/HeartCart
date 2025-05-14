/**
 * SEO Step
 * 
 * This component handles the SEO information for the product,
 * including meta title, description, keywords, and URL settings.
 * It also integrates with the AI-powered SEO optimization.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Info,
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDraftContext } from '../DraftContext';
import { SeoOptimizer } from '../ai-features/SeoOptimizer';
import { debounce } from '@/lib/utils';

// Validation schema for SEO information
const formSchema = z.object({
  metaTitle: z.string().max(70, {
    message: "Meta title should be 70 characters or less for optimal SEO.",
  }).optional().nullable(),
  metaDescription: z.string().max(160, {
    message: "Meta description should be 160 characters or less for optimal SEO.",
  }).optional().nullable(),
  metaKeywords: z.string().max(200, {
    message: "Meta keywords should be 200 characters or less.",
  }).optional().nullable(),
  canonicalUrl: z.string().url({
    message: "Please enter a valid URL or leave it blank.",
  }).optional().nullable().or(z.literal('')),
});

// Component props
interface SeoStepProps {
  onNext: () => void;
}

export function SeoStep({ onNext }: SeoStepProps) {
  const { toast } = useToast();
  const { draft, updateDraft, saveDraft, loading } = useDraftContext();
  const [saving, setSaving] = useState(false);
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [metaTitleLength, setMetaTitleLength] = useState(0);
  const [metaDescriptionLength, setMetaDescriptionLength] = useState(0);
  
  // Initialize form with draft values or defaults
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      metaTitle: draft?.metaTitle || '',
      metaDescription: draft?.metaDescription || '',
      metaKeywords: draft?.metaKeywords || '',
      canonicalUrl: draft?.canonicalUrl || '',
    },
    mode: 'onChange',
  });
  
  // Update form values when draft changes
  useEffect(() => {
    if (draft) {
      form.reset({
        metaTitle: draft.metaTitle || '',
        metaDescription: draft.metaDescription || '',
        metaKeywords: draft.metaKeywords || '',
        canonicalUrl: draft.canonicalUrl || '',
      });
    }
  }, [draft, form]);
  
  // Update character counts
  useEffect(() => {
    setMetaTitleLength(form.watch('metaTitle')?.length || 0);
    setMetaDescriptionLength(form.watch('metaDescription')?.length || 0);
  }, [form.watch('metaTitle'), form.watch('metaDescription')]);
  
  // Debounced save function
  const debouncedSave = debounce(async (data: z.infer<typeof formSchema>) => {
    try {
      setSaving(true);
      await updateDraft({
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        metaKeywords: data.metaKeywords || null,
        canonicalUrl: data.canonicalUrl || null,
      });
      await saveDraft();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Error Saving',
        description: 'Could not save SEO information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, 800);
  
  // Handle form submission
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setSaving(true);
      await updateDraft({
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        metaKeywords: data.metaKeywords || null,
        canonicalUrl: data.canonicalUrl || null,
      });
      await saveDraft();
      
      toast({
        title: 'SEO Information Saved',
        description: 'SEO information has been saved successfully.',
      });
      
      onNext();
    } catch (error) {
      console.error('Error saving SEO information:', error);
      toast({
        title: 'Error Saving',
        description: 'Could not save SEO information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Apply AI suggestions
  const handleApplySuggestion = (suggestion: { 
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  }) => {
    const newValues = {
      metaTitle: suggestion.metaTitle || form.getValues('metaTitle'),
      metaDescription: suggestion.metaDescription || form.getValues('metaDescription'),
      metaKeywords: suggestion.keywords?.join(', ') || form.getValues('metaKeywords'),
    };
    
    form.setValue('metaTitle', newValues.metaTitle, { shouldValidate: true });
    form.setValue('metaDescription', newValues.metaDescription, { shouldValidate: true });
    form.setValue('metaKeywords', newValues.metaKeywords, { shouldValidate: true });
    
    setShowAiHelper(false);
    
    debouncedSave({
      ...form.getValues(),
      ...newValues,
    });
    
    toast({
      title: 'AI Suggestions Applied',
      description: 'The AI-generated SEO suggestions have been applied.',
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">SEO Information</h2>
        <p className="text-muted-foreground">
          Optimize your product for search engines with titles, descriptions, and keywords.
        </p>
      </div>
      
      <Separator className="my-6" />
      
      <div className="flex justify-end">
        <Dialog open={showAiHelper} onOpenChange={setShowAiHelper}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI SEO Suggestions
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>AI SEO Optimization</DialogTitle>
              <DialogDescription>
                Generate optimized SEO content for your product using AI.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <SeoOptimizer
                productName={draft?.name || ''}
                description={draft?.description || ''}
                category={draft?.category?.name || ''}
                targetKeywords={draft?.metaKeywords?.split(',').map(k => k.trim()) || []}
                onSelectSuggestion={handleApplySuggestion}
              />
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowAiHelper(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel>Generated Preview</FormLabel>
                  </div>
                  <div className="border rounded-md p-4 space-y-2">
                    <div className="text-blue-600 text-lg font-medium line-clamp-1">
                      {form.watch('metaTitle') || `${draft?.name || 'Product Name'} | TeeMeYou`}
                    </div>
                    <div className="text-sm text-green-700">
                      {window.location.origin}/{draft?.category?.slug || 'category'}/{draft?.slug || 'product-slug'}
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {form.watch('metaDescription') || draft?.shortDescription || 'No description provided.'}
                    </div>
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>
                          Meta Title
                        </FormLabel>
                        <div className={`text-xs ${metaTitleLength > 60 ? 'text-yellow-600' : ''} ${metaTitleLength > 70 ? 'text-red-600' : ''}`}>
                          {metaTitleLength}/70
                        </div>
                      </div>
                      <FormControl>
                        <Input 
                          placeholder={`${draft?.name || 'Product Name'} | TeeMeYou`}
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            field.onChange(e);
                            debouncedSave({
                              ...form.getValues(),
                              metaTitle: e.target.value,
                            });
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        The title that appears in search engine results. Recommended length: 50-60 characters.
                      </FormDescription>
                      <FormMessage />
                      
                      {metaTitleLength > 70 && (
                        <div className="flex items-center mt-1 text-red-600 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Title is too long, it may be truncated in search results.
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="metaDescription"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>
                          Meta Description
                        </FormLabel>
                        <div className={`text-xs ${metaDescriptionLength > 145 ? 'text-yellow-600' : ''} ${metaDescriptionLength > 160 ? 'text-red-600' : ''}`}>
                          {metaDescriptionLength}/160
                        </div>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of the product for search engines."
                          className="min-h-[100px]"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            field.onChange(e);
                            debouncedSave({
                              ...form.getValues(),
                              metaDescription: e.target.value,
                            });
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        The description that appears in search engine results. Recommended length: 120-155 characters.
                      </FormDescription>
                      <FormMessage />
                      
                      {metaDescriptionLength > 160 && (
                        <div className="flex items-center mt-1 text-red-600 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Description is too long, it may be truncated in search results.
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="metaKeywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Keywords</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="keyword1, keyword2, keyword3"
                          className="min-h-[80px]"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            field.onChange(e);
                            debouncedSave({
                              ...form.getValues(),
                              metaKeywords: e.target.value,
                            });
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter keywords separated by commas. These help with internal search but have limited impact on external SEO.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="canonicalUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canonical URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/canonical-product-page"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            field.onChange(e);
                            debouncedSave({
                              ...form.getValues(),
                              canonicalUrl: e.target.value,
                            });
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional. Use this if this product exists on another site to prevent duplicate content issues.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-start p-3 border rounded-md bg-muted/50">
                  <Info className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p>
                      Page URLs are generated automatically based on the product slug ({draft?.slug || 'product-slug'})
                      and category ({draft?.category?.name || 'category'}). To change the URL, adjust the slug in the Basic Info step.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-4">
            <Button 
              type="submit" 
              disabled={loading || saving}
            >
              {saving ? 'Saving...' : 'Save & Finish'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}