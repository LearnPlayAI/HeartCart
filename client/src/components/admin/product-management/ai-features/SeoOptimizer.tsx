import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Lightbulb, Check } from 'lucide-react';
import { useGenerateSeoSuggestions, useAiStatus } from '../utils/ai-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface SeoOptimizerProps {
  productName: string;
  description: string;
  category?: string;
  onApplySeoTitle: (title: string) => void;
  onApplySeoDescription: (description: string) => void;
  onApplyKeywords: (keywords: string[]) => void;
}

export function SeoOptimizer({
  productName,
  description,
  category,
  onApplySeoTitle,
  onApplySeoDescription,
  onApplyKeywords
}: SeoOptimizerProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const { available, isLoading: isCheckingStatus } = useAiStatus();
  const { 
    generateSuggestions, 
    results, 
    isGenerating, 
    error, 
    reset 
  } = useGenerateSeoSuggestions();

  const handleGenerateSuggestions = () => {
    if (!productName || !description) {
      toast({
        title: "Information required",
        description: "Please enter a product name and description before generating SEO suggestions.",
        variant: "destructive"
      });
      return;
    }
    
    generateSuggestions({ productName, description, category });
    setExpanded(true);
  };

  if (isCheckingStatus) {
    return (
      <Card className="w-full mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <Skeleton className="h-4 w-52" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-full" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-40" />
        </CardContent>
      </Card>
    );
  }

  if (!available) {
    return (
      <Alert variant="warning" className="mb-4">
        <Sparkles className="h-4 w-4" />
        <AlertTitle>AI Features Unavailable</AlertTitle>
        <AlertDescription>
          AI-powered SEO optimization is not available. Contact your administrator to configure the AI service.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI SEO Optimizer
        </CardTitle>
        <CardDescription>
          Generate SEO suggestions to improve your product's visibility
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Generation Failed</AlertTitle>
            <AlertDescription>
              {error.message || "Failed to generate SEO suggestions. Please try again."}
            </AlertDescription>
          </Alert>
        )}

        {results && (
          <div className="space-y-4 mb-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="seo-title">
                <AccordionTrigger className="text-sm font-medium">
                  Meta Title
                  <span className="ml-2">
                    <Badge variant="outline" className="ml-2">
                      {results.metaTitle.length} / 60
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm mb-2">{results.metaTitle}</p>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="mt-1"
                      onClick={() => onApplySeoTitle(results.metaTitle)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Apply This Title
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="seo-description">
                <AccordionTrigger className="text-sm font-medium">
                  Meta Description
                  <span className="ml-2">
                    <Badge variant="outline" className="ml-2">
                      {results.metaDescription.length} / 160
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm mb-2">{results.metaDescription}</p>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="mt-1"
                      onClick={() => onApplySeoDescription(results.metaDescription)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Apply This Description
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="keywords">
                <AccordionTrigger className="text-sm font-medium">
                  Suggested Keywords
                  <span className="ml-2">
                    <Badge variant="outline" className="ml-2">
                      {results.keywords.length} keywords
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {results.keywords.map((keyword, i) => (
                        <Badge key={i} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => onApplyKeywords(results.keywords)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Apply All Keywords
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="content-suggestions">
                <AccordionTrigger className="text-sm font-medium">
                  Content Improvement Suggestions
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <ul className="space-y-2 list-disc pl-5">
                      {results.contentSuggestions.map((suggestion, i) => (
                        <li key={i} className="text-sm">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span>{suggestion}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateSuggestions}
            disabled={isGenerating || !productName || !description}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate SEO Suggestions
              </>
            )}
          </Button>
          
          {results && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => reset()}
            >
              Reset
            </Button>
          )}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground pt-0">
        This feature generates SEO recommendations based on AI. Review and edit as needed.
      </CardFooter>
    </Card>
  );
}