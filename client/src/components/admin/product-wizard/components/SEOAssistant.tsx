import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bot, Search, Check, X, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SEOSuggestion {
  title: string;
  metaDescription: string;
  keywords: string[];
  score: number;
  tips: string[];
}

interface SEOAssistantProps {
  productName: string;
  currentTitle?: string;
  currentDescription?: string;
  currentKeywords?: string[];
  productDescription?: string;
  categoryName?: string;
  onApplySuggestion: (suggestion: { title: string; metaDescription: string; keywords: string[] }) => void;
}

export const SEOAssistant: React.FC<SEOAssistantProps> = ({
  productName,
  currentTitle = '',
  currentDescription = '',
  currentKeywords = [],
  productDescription = '',
  categoryName = '',
  onApplySuggestion,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SEOSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ [key: number]: 'positive' | 'negative' | null }>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Generate SEO suggestions using AI
  const generateSuggestions = async () => {
    if (!productName) {
      toast({
        title: 'Product name required',
        description: 'Please enter a product name before generating SEO suggestions.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setSuggestions([]);
    setSelectedSuggestion(null);
    setFeedback({});
    setApiError(null);

    try {
      const data = await apiRequest('POST', '/api/ai/optimize-seo', {
        productName,
        currentTitle,
        currentDescription,
        currentKeywords,
        productDescription,
        categoryName,
      });

      if (data.success && data.data && data.data.suggestions && data.data.suggestions.length > 0) {
        setSuggestions(data.data.suggestions);
        
      } else {
        // Handle specific error codes from the API service
        if (data.error?.code === 'MISSING_API_KEY') {
          setApiError('Google Gemini API key is missing. Please contact your administrator to configure it.');
        } else if (data.error?.code === 'INVALID_API_KEY') {
          setApiError('Google Gemini API key is invalid. Please contact your administrator to update it.');
        } else if (data.error?.code === 'SERVICE_UNAVAILABLE') {
          setApiError('AI service is currently unavailable. Please try again later or contact your administrator.');
        } else {
          toast({
            title: 'Error generating SEO suggestions',
            description: data.error?.message || 'Could not generate SEO suggestions.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error generating SEO suggestions:', error);
      
      // Handle API errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('API key')) {
        setApiError('Google Gemini API key issue. Please contact your administrator.');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to generate SEO suggestions. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Apply the selected suggestion
  const applySuggestion = () => {
    if (selectedSuggestion !== null && suggestions[selectedSuggestion]) {
      const suggestion = suggestions[selectedSuggestion];
      onApplySuggestion({
        title: suggestion.title,
        metaDescription: suggestion.metaDescription,
        keywords: suggestion.keywords,
      });
      
    }
  };

  // Record feedback on suggestions for AI learning
  const provideFeedback = async (index: number, type: 'positive' | 'negative') => {
    setFeedback((prev) => ({
      ...prev,
      [index]: type,
    }));

    try {
      await apiRequest('POST', '/api/ai/feedback', {
        suggestionType: 'seo',
        suggestionIndex: index,
        feedbackType: type,
        suggestion: suggestions[index],
      });
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  return (
    <Card className="border border-dashed border-gray-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-medium">
          <Bot className="h-5 w-5 mr-2 text-blue-500" />
          Gemini SEO Optimization Assistant
        </CardTitle>
        <CardDescription>
          Optimize your product for search engines with Google Gemini AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {apiError ? (
          <div className="py-4">
            <Alert variant="destructive" className="mb-4">
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>API Configuration Required</AlertTitle>
              <AlertDescription>
                {apiError}
              </AlertDescription>
            </Alert>
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApiError(null)}
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Select a suggestion to use:
              </p>
              <Button variant="ghost" size="sm" onClick={() => setSuggestions([])}>
                Start over
              </Button>
            </div>

            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-md border cursor-pointer transition-colors ${
                    selectedSuggestion === index
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted border-gray-200'
                  }`}
                  onClick={() => setSelectedSuggestion(index)}
                >
                  <div className="flex justify-between mb-3">
                    <div className="flex items-center">
                      <Badge className="mr-2">Option {index + 1}</Badge>
                      <div className="flex items-center">
                        <Progress
                          value={suggestion.score * 100}
                          className="w-24 h-2 mr-2"
                        />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(suggestion.score * 100)}% optimized
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-7 w-7 ${feedback[index] === 'positive' ? 'text-green-500' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          provideFeedback(index, 'positive');
                        }}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-7 w-7 ${feedback[index] === 'negative' ? 'text-red-500' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          provideFeedback(index, 'negative');
                        }}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Title Tag</Label>
                      <p className="text-sm font-medium">{suggestion.title}</p>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Meta Description</Label>
                      <p className="text-sm">{suggestion.metaDescription}</p>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Keywords</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {suggestion.keywords.map((keyword, kidx) => (
                          <Badge key={kidx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {suggestion.tips.length > 0 && (
                      <div className="mt-3">
                        <Label className="text-xs text-muted-foreground">SEO Tips</Label>
                        <ul className="text-xs list-disc pl-5 mt-1 text-muted-foreground">
                          {suggestion.tips.map((tip, tipIdx) => (
                            <li key={tipIdx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-6">
              Generate SEO-optimized title, meta description and keywords for your product.
              The AI will analyze your product information to create search-friendly metadata.
            </p>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">
                  Analyzing product data and generating SEO suggestions...
                </p>
              </div>
            ) : (
              <Button
                onClick={generateSuggestions}
                variant="outline"
                className="gap-2"
              >
                <Bot className="h-4 w-4" />
                Generate SEO Suggestions
              </Button>
            )}
          </div>
        )}
      </CardContent>
      {selectedSuggestion !== null && (
        <CardFooter className="flex justify-end gap-2 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedSuggestion(null)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button size="sm" onClick={applySuggestion}>
            <Check className="h-4 w-4 mr-2" />
            Apply This SEO Data
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};