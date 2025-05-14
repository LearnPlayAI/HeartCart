import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bot, Check, X, Archive } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AIDescriptionAssistantProps {
  productName: string;
  currentDescription?: string;
  categoryName?: string;
  brandName?: string;
  keyFeatures?: string[];
  onApplySuggestion: (suggestion: string) => void;
}

export const AIDescriptionAssistant: React.FC<AIDescriptionAssistantProps> = ({
  productName,
  currentDescription = '',
  categoryName = '',
  brandName = '',
  keyFeatures = [],
  onApplySuggestion,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Generate product description suggestions using AI
  const generateSuggestions = async () => {
    if (!productName) {
      toast({
        title: 'Product name required',
        description: 'Please enter a product name before generating suggestions.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setSuggestions([]);
    setSelectedSuggestion(null);
    setApiError(null);

    try {
      const response = await apiRequest('POST', '/api/ai/suggest-description', {
        productName,
        currentDescription,
        categoryName,
        brandName,
        keyFeatures,
      });

      const data = await response.json();

      if (data.success && data.data && data.data.suggestions && data.data.suggestions.length > 0) {
        setSuggestions(data.data.suggestions);
        toast({
          title: 'Suggestions generated',
          description: `Generated ${data.data.suggestions.length} description suggestions.`,
        });
      } else {
        // Check for missing API key
        if (data.error?.code === 'MISSING_API_KEY') {
          setApiError('Google Gemini API key is missing. Please contact your administrator to configure it.');
        } else if (data.error?.code === 'INVALID_API_KEY') {
          setApiError('Google Gemini API key is invalid. Please contact your administrator to update it.');
        } else {
          toast({
            title: 'Error generating suggestions',
            description: data.error?.message || 'Could not generate description suggestions.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error generating AI descriptions:', error);
      
      // Handle API errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('API key')) {
        setApiError('Google Gemini API key issue. Please contact your administrator.');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to generate description suggestions. Please try again.',
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
      onApplySuggestion(suggestions[selectedSuggestion]);
      toast({
        title: 'Description applied',
        description: 'AI-generated description has been applied.',
      });
    }
  };

  return (
    <Card className="border border-dashed border-gray-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-medium">
          <Bot className="h-5 w-5 mr-2 text-blue-500" />
          Gemini AI Description Assistant
        </CardTitle>
        <CardDescription>
          Generate professional product descriptions with Google Gemini AI
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

            <ScrollArea className="h-[300px] rounded-md border p-2">
              {suggestions.map((suggestion, index) => (
                <div key={index}>
                  <div
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedSuggestion === index
                        ? 'bg-primary/10 border-l-4 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedSuggestion(index)}
                  >
                    <div className="flex justify-between mb-2">
                      <Badge variant="outline">Suggestion {index + 1}</Badge>
                      {selectedSuggestion === index && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{suggestion}</p>
                  </div>
                  {index < suggestions.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-6">
              Generate professional product descriptions based on your product details.
              The AI will use the product name, category, brand, and other information to create compelling descriptions.
            </p>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">
                  Generating suggestions...
                </p>
              </div>
            ) : (
              <Button
                onClick={generateSuggestions}
                variant="outline"
                className="gap-2"
              >
                <Bot className="h-4 w-4" />
                Generate Descriptions
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
            Apply This Description
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};