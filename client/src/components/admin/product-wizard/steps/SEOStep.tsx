import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Wand2, Star, StarHalf } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

import { ProductDraft } from '../ProductWizard';

// Define validation schema
const seoFormSchema = z.object({
  metaTitle: z.string().max(65, 'Meta title should be 65 characters or less').optional().nullable(),
  metaDescription: z.string().max(160, 'Meta description should be 160 characters or less').optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
  canonicalUrl: z.string().url('Invalid URL format').optional().nullable(),
});

type SeoFormValues = z.infer<typeof seoFormSchema>;

// Define SEO suggestion type
interface SeoSuggestion {
  title: string;
  metaDescription: string;
  keywords: string[];
  score: number;
  tips: string[];
}

interface SEOStepProps {
  draft: ProductDraft;
  onSave: (data: Partial<ProductDraft>, advanceToNext?: boolean) => void;
  isLoading?: boolean;
}

export const SEOStep: React.FC<SEOStepProps> = ({ draft, onSave, isLoading = false }) => {
  const { toast } = useToast();
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const [showSEODialog, setShowSEODialog] = useState(false);
  const [seoError, setSeoError] = useState<string | null>(null);
  const [seoSuggestions, setSeoSuggestions] = useState<SeoSuggestion[]>([]);

  // Initialize form with draft values
  const form = useForm<SeoFormValues>({
    resolver: zodResolver(seoFormSchema),
    defaultValues: {
      metaTitle: draft.metaTitle || '',
      metaDescription: draft.metaDescription || '',
      metaKeywords: draft.metaKeywords || '',
      canonicalUrl: draft.canonicalUrl || '',
    },
  });

  // Handle form submission
  const onSubmit = (data: SeoFormValues) => {
    onSave(data);
  };

  // Handle 'Save & Next' button
  const handleSaveAndNext = () => {
    form.handleSubmit((data) => {
      onSave(data, true);
    })();
  };

  // Generate SEO suggestions using AI
  const generateSEOSuggestions = async () => {
    try {
      setIsGeneratingSEO(true);
      setSeoError(null);

      // Get current form and draft values
      const formValues = form.getValues();
      const productName = draft.name;
      const productDescription = draft.description || '';

      // Get category name if available
      let categoryName = '';
      if (draft.categoryId && draft.category?.name) {
        categoryName = draft.category.name;
      }

      // Format current keywords
      let currentKeywords: string[] = [];
      if (formValues.metaKeywords) {
        currentKeywords = formValues.metaKeywords.split(',').map(k => k.trim());
      }

      // API request to generate SEO suggestions
      console.log('Generating SEO suggestions for:', {
        productName,
        productDescription,
        categoryName,
        currentTitle: formValues.metaTitle,
        currentDescription: formValues.metaDescription,
        currentKeywords
      });
      
      // Make actual API call
      const response = await apiRequest('POST', '/api/ai/optimize-seo', {
        productName,
        productDescription,
        categoryName,
        currentTitle: formValues.metaTitle,
        currentDescription: formValues.metaDescription,
        currentKeywords
      });
      
      const responseData = await response.json();
      
      if (responseData.success && responseData.data?.suggestions) {
        setSeoSuggestions(responseData.data.suggestions);
        setShowSEODialog(true);
      } else {
        throw new Error('Failed to generate SEO suggestions');
      }
    } catch (error) {
      console.error('Error generating SEO suggestions:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.';

      setSeoError(errorMessage);
      toast({
        title: 'AI Generation Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  // Apply selected SEO suggestion
  const applySEOSuggestion = (suggestion: SeoSuggestion) => {
    form.setValue('metaTitle', suggestion.title);
    form.setValue('metaDescription', suggestion.metaDescription);
    form.setValue('metaKeywords', suggestion.keywords.join(', '));

    setShowSEODialog(false);

    toast({
      title: 'SEO Data Applied',
      description: 'The AI-generated SEO data has been applied.'
    });
  };

  // Render SEO score stars
  const renderSeoScore = (score: number) => {
    // Convert score from 0-1 to 0-5 stars
    const normalizedScore = Math.min(Math.max(score * 5, 0), 5);
    const fullStars = Math.floor(normalizedScore);
    const hasHalfStar = normalizedScore - fullStars >= 0.5;
    
    return (
      <div className="flex">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && <StarHalf className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
        {[...Array(5 - fullStars - (hasHalfStar ? 1 : 0))].map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
        ))}
      </div>
    );
  };

  return (
    <>
      {/* SEO Suggestions Dialog */}
      <Dialog open={showSEODialog} onOpenChange={setShowSEODialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI-Generated SEO Suggestions</DialogTitle>
            <DialogDescription>
              Choose one of the suggestions below or close to keep your current SEO data.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 max-h-[400px] overflow-y-auto space-y-4">
            {seoSuggestions.map((suggestion, index) => (
              <Card key={index} className="shadow-sm hover:shadow transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">Option {index + 1}</CardTitle>
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground mr-1">Score:</span>
                      {renderSeoScore(suggestion.score)}
                    </div>
                  </div>
                  <CardDescription className="text-sm line-clamp-1">{suggestion.title}</CardDescription>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Meta Title:</Label>
                      <p className="text-sm">{suggestion.title}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Meta Description:</Label>
                      <p className="text-sm">{suggestion.metaDescription}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Keywords:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {suggestion.keywords.map((keyword, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{keyword}</Badge>
                        ))}
                      </div>
                    </div>
                    {suggestion.tips.length > 0 && (
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="tips">
                          <AccordionTrigger className="text-xs py-1">
                            Improvement Tips
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="text-xs list-disc pl-4 space-y-1">
                              {suggestion.tips.map((tip, i) => (
                                <li key={i}>{tip}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    onClick={() => applySEOSuggestion(suggestion)}
                  >
                    Use This SEO Data
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <DialogFooter className="flex items-center justify-between mt-4">
            <div>
              {seoError && (
                <p className="text-sm text-destructive">{seoError}</p>
              )}
            </div>
            <Button variant="secondary" onClick={() => setShowSEODialog(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold">Search Engine Optimization</h3>
              <p className="text-sm text-muted-foreground">
                Optimize your product for search engines to improve visibility
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1"
              onClick={generateSEOSuggestions}
              disabled={isGeneratingSEO || !draft.name}
            >
              {isGeneratingSEO ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  <span>AI Generate SEO</span>
                </>
              )}
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              {/* Meta Title */}
              <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Meta Title</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="text-xs text-muted-foreground">
                            {field.value?.length || 0}/65
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Recommended: 50-65 characters</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Premium Wireless Headphones with Active Noise Cancellation"
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      Appears as the title in search engine results. Include your primary keyword.
                    </p>
                  </FormItem>
                )}
              />

              {/* Meta Description */}
              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Meta Description</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="text-xs text-muted-foreground">
                            {field.value?.length || 0}/160
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Recommended: 120-160 characters</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Brief, compelling description of your product that encourages clicks from search results"
                        className="min-h-[80px]"
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      This appears below the title in search results. Include key benefits and a call to action.
                    </p>
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
                        placeholder="e.g., wireless headphones, noise cancellation, premium audio"
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated list of keywords. Less important for SEO now, but still useful for internal search.
                    </p>
                  </FormItem>
                )}
              />

              {/* Canonical URL */}
              <FormField
                control={form.control}
                name="canonicalUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canonical URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://yourdomain.com/products/product-name"
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      If this product appears on multiple URLs, specify the preferred one to prevent duplicate content issues.
                    </p>
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4 space-x-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveAndNext}
                  disabled={isLoading}
                  variant="default"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save & Next
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