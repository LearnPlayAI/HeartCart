import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DescriptionGenerator, SeoOptimizer } from '../ai-features';
import { useDraft } from '../DraftContext';
import { Separator } from '@/components/ui/separator';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useCategoryName } from '@/hooks/use-categories';
import { useToast } from '@/hooks/use-toast';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import debounce from 'lodash/debounce';

// Form schema for the description step
const descriptionFormSchema = z.object({
  description: z.string().optional(),
  metaTitle: z.string().max(60, { 
    message: "Meta title cannot exceed 60 characters" 
  }).optional(),
  metaDescription: z.string().max(160, {
    message: "Meta description cannot exceed 160 characters"
  }).optional(),
  keywords: z.string().optional(),
});

type DescriptionFormValues = z.infer<typeof descriptionFormSchema>;

export function DescriptionStep() {
  const { toast } = useToast();
  const { currentDraft } = useDraft();
  const queryClient = useQueryClient();
  const categoryName = useCategoryName(currentDraft?.categoryId);

  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize form with existing draft data
  const form = useForm<DescriptionFormValues>({
    resolver: zodResolver(descriptionFormSchema),
    defaultValues: {
      description: currentDraft?.description || '',
      metaTitle: currentDraft?.metaTitle || '',
      metaDescription: currentDraft?.metaDescription || '',
      keywords: currentDraft?.keywords || '',
    },
  });

  // Create debounced update function to reduce API calls while typing
  const debouncedUpdate = debounce(async (data: Partial<DescriptionFormValues>) => {
    if (!currentDraft?.id) return;
    
    try {
      setIsUpdating(true);
      
      await apiRequest(`/api/product-drafts/${currentDraft.id}`, {
        method: 'PATCH',
        data: {
          description: data.description,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          keywords: data.keywords,
        },
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/product-drafts/${currentDraft.id}`] });
      
    } catch (error) {
      console.error('Failed to update product draft:', error);
      toast({
        title: 'Update failed',
        description: 'There was a problem saving your changes.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  }, 800);

  const onValueChange = (field: keyof DescriptionFormValues, value: any) => {
    form.setValue(field, value);
    debouncedUpdate({ [field]: value });
  };
  
  const handleSelectDescription = (description: string) => {
    form.setValue('description', description);
    debouncedUpdate({ description });
  };
  
  const handleApplySeoTitle = (title: string) => {
    form.setValue('metaTitle', title);
    debouncedUpdate({ metaTitle: title });
  };
  
  const handleApplySeoDescription = (description: string) => {
    form.setValue('metaDescription', description);
    debouncedUpdate({ metaDescription: description });
  };
  
  const handleApplyKeywords = (keywords: string[]) => {
    const keywordsString = keywords.join(', ');
    form.setValue('keywords', keywordsString);
    debouncedUpdate({ keywords: keywordsString });
  };

  // If no draft is loaded, show a placeholder
  if (!currentDraft) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Please select or create a draft first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="seo">SEO & Metadata</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            {/* AI Description Generator */}
            <DescriptionGenerator
              productName={currentDraft.name || ''}
              category={categoryName}
              attributes={[]}
              onSelectDescription={handleSelectDescription}
            />

            {/* Manual Description Field */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Description</CardTitle>
                <CardDescription>Describe your product in detail</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter a detailed description of your product..."
                          className="min-h-[200px]"
                          {...field}
                          onChange={(e) => onValueChange('description', e.target.value)}
                        />
                      </FormControl>
                      <FormDescription className="flex items-center gap-2">
                        <InfoCircledIcon className="h-4 w-4" />
                        Include key features, benefits and other relevant information.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-6">
            {/* AI SEO Optimizer */}
            <SeoOptimizer
              productName={currentDraft.name || ''}
              description={form.watch('description') || ''}
              category={categoryName}
              onApplySeoTitle={handleApplySeoTitle}
              onApplySeoDescription={handleApplySeoDescription}
              onApplyKeywords={handleApplyKeywords}
            />

            {/* Manual SEO Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SEO & Metadata</CardTitle>
                <CardDescription>Optimize for search engines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Meta Title
                        <span className="ml-2 text-xs text-muted-foreground">
                          {field.value?.length || 0}/60
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter a concise title for search engines..."
                          {...field}
                          onChange={(e) => onValueChange('metaTitle', e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>
                        A concise title that will appear in search results.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="metaDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Meta Description
                        <span className="ml-2 text-xs text-muted-foreground">
                          {field.value?.length || 0}/160
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter a brief description for search engines..."
                          className="resize-none"
                          {...field}
                          onChange={(e) => onValueChange('metaDescription', e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>
                        A brief description that will appear in search results.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keywords</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter comma-separated keywords..."
                          {...field}
                          onChange={(e) => onValueChange('keywords', e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>
                        Comma-separated keywords to help with search relevance.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Form>
    </div>
  );
}