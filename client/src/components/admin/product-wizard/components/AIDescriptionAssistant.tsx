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
        toast({
          title: 'Error generating suggestions',
          description: data.error?.message || 'Could not generate description suggestions.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating AI descriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate description suggestions. Please try again.',
        variant: 'destructive',
      });
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
        {suggestions.length > 0 ? (
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
                <Sparkles className="h-4 w-4" />
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