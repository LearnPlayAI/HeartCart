import { UseFormReturn } from 'react-hook-form';
import { Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AiProductAnalyzer } from '../ai-product-analyzer';

interface AiAnalysisStepProps {
  uploadedImages: any[];
  analyzeImagesWithAI: () => void;
  aiAnalysisLoading: boolean;
  aiSuggestions: any;
  applyAISuggestion: (key: string, value: any) => void;
  applyAllAISuggestions: () => void;
  form: UseFormReturn<any>;
}

export function AiAnalysisStep({
  uploadedImages,
  analyzeImagesWithAI,
  aiAnalysisLoading,
  aiSuggestions,
  applyAISuggestion,
  applyAllAISuggestions,
  form
}: AiAnalysisStepProps) {
  const imageUrl = uploadedImages.length > 0 ? uploadedImages[0].url : '';

  const handleApplyChanges = (changes: any) => {
    if (changes.name) {
      form.setValue('name', changes.name);
      // Also generate a slug from name if it's different
      form.setValue('slug', changes.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    }
    
    if (changes.description) {
      form.setValue('description', changes.description);
    }
    
    if (changes.brand) {
      form.setValue('brand', changes.brand);
    }
    
    if (changes.tags) {
      form.setValue('tags', changes.tags);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-pink-50 dark:bg-pink-900/10 p-4 rounded-lg border border-pink-100 dark:border-pink-900/30 mb-6">
        <h3 className="text-lg font-medium text-pink-800 dark:text-pink-300 mb-2">AI-Powered Product Analysis</h3>
        <p className="text-sm text-pink-700 dark:text-pink-400">
          Leverage AI to automatically analyze your product images and get suggestions for product details, descriptions, and tags.
        </p>
      </div>

      {uploadedImages.length === 0 ? (
        <div className="border rounded-md p-6 bg-zinc-50 dark:bg-zinc-900 text-center">
          <Wand2 className="h-8 w-8 mb-2 mx-auto text-zinc-400" />
          <h3 className="text-lg font-medium mb-2">No Images Available</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 max-w-md mx-auto">
            Upload product images in the previous step to use AI analysis features
          </p>
        </div>
      ) : (
        <>
          {aiSuggestions ? (
            <Card className="border-pink-200 dark:border-pink-900/40 shadow-sm">
              <CardHeader className="bg-pink-50 dark:bg-pink-900/10 border-b border-pink-100 dark:border-pink-900/20">
                <CardTitle className="flex items-center text-lg">
                  <Wand2 className="h-5 w-5 mr-2 text-pink-600" />
                  AI Analysis Results
                </CardTitle>
                <CardDescription>
                  Review AI-generated suggestions for your product
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {aiSuggestions.suggestedName && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Suggested Name</h4>
                    <p className="text-sm p-2 rounded-md bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20">
                      {aiSuggestions.suggestedName}
                    </p>
                  </div>
                )}

                {aiSuggestions.suggestedDescription && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Suggested Description</h4>
                    <div className="text-sm p-2 rounded-md bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20">
                      {aiSuggestions.suggestedDescription}
                    </div>
                  </div>
                )}

                {aiSuggestions.suggestedCategory && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Suggested Category</h4>
                    <p className="text-sm p-2 rounded-md bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20">
                      {aiSuggestions.suggestedCategory}
                    </p>
                  </div>
                )}

                {aiSuggestions.suggestedBrand && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Suggested Brand</h4>
                    <p className="text-sm p-2 rounded-md bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20">
                      {aiSuggestions.suggestedBrand}
                    </p>
                  </div>
                )}

                {aiSuggestions.suggestedTags && aiSuggestions.suggestedTags.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Suggested Tags</h4>
                    <div className="flex flex-wrap gap-2 p-2 rounded-md bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20">
                      {aiSuggestions.suggestedTags.map((tag: string, index: number) => (
                        <Badge 
                          key={index} 
                          variant="secondary"
                          className="bg-pink-100 text-pink-800 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between bg-zinc-50 dark:bg-zinc-900 border-t p-4">
                <Button 
                  variant="outline" 
                  onClick={() => analyzeImagesWithAI()}
                >
                  Analyze Again
                </Button>
                <Button 
                  onClick={applyAllAISuggestions}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  Apply All Suggestions
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 p-6 border rounded-lg bg-zinc-50 dark:bg-zinc-900 text-center">
              <div className="flex flex-col items-center">
                <Wand2 className="h-8 w-8 mb-2 text-pink-600" />
                <h3 className="text-lg font-medium mb-1">AI Product Analysis</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-4 max-w-md">
                  Use AI to analyze your product image and get suggestions for name, description, category, and tags
                </p>
              </div>
              
              <Button
                onClick={analyzeImagesWithAI}
                disabled={aiAnalysisLoading}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {aiAnalysisLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Analyze Product Image
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}