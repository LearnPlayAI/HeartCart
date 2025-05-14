/**
 * AI Description Suggestions Component
 * 
 * This component provides AI-generated product description suggestions
 * and allows the user to apply them to the product.
 */

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Copy, Check, AlertCircle } from 'lucide-react';
import { generateProductDescription } from '../utils/ai-utils';
import { useDraft } from '../DraftContext';

interface AiDescriptionSuggestionsProps {
  onApplySuggestion: (description: string) => void;
}

export const AiDescriptionSuggestions: React.FC<AiDescriptionSuggestionsProps> = ({ 
  onApplySuggestion 
}) => {
  const { draft } = useDraft();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Generate description suggestions
  const handleGenerateSuggestions = async () => {
    if (!draft?.name) {
      setError('Product name is required for generating suggestions');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get category name if categoryId is available
      const category = draft.categoryId ? 'product category' : undefined;
      
      const suggestions = await generateProductDescription(
        draft.name,
        category,
        draft.attributes
      );
      
      if (suggestions.length === 0) {
        setError('No suggestions could be generated. Please try again.');
      } else {
        setSuggestions(suggestions);
      }
    } catch (err: any) {
      console.error('Error generating suggestions:', err);
      setError(err.message || 'Failed to generate suggestions');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Copy suggestion to clipboard
  const handleCopySuggestion = (suggestion: string, index: number) => {
    navigator.clipboard.writeText(suggestion);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };
  
  // Apply suggestion to the form
  const handleApplySuggestion = (suggestion: string) => {
    onApplySuggestion(suggestion);
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center">
          <Sparkles className="h-4 w-4 mr-2" />
          AI Description Suggestions
        </CardTitle>
        <CardDescription>
          Get AI-generated product description suggestions based on your product details.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                <p className="text-sm text-muted-foreground">
                  Generating product descriptions...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <Sparkles className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">
                  Generate product descriptions using AI to save time and improve your content.
                </p>
                <Button 
                  onClick={handleGenerateSuggestions}
                  disabled={!draft?.name}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Suggestions
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Tabs defaultValue="suggestion-0" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              {suggestions.map((_, index) => (
                <TabsTrigger 
                  key={`suggestion-tab-${index}`}
                  value={`suggestion-${index}`}
                >
                  Option {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {suggestions.map((suggestion, index) => (
              <TabsContent 
                key={`suggestion-content-${index}`}
                value={`suggestion-${index}`}
                className="border rounded-md p-4"
              >
                <p className="whitespace-pre-line">{suggestion}</p>
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopySuggestion(suggestion, index)}
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => handleApplySuggestion(suggestion)}
                  >
                    Use This Description
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
        
        {error && (
          <div className="flex items-start text-destructive bg-destructive/10 p-3 rounded-md mt-2">
            <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </CardContent>
      
      {suggestions.length > 0 && (
        <CardFooter className="pt-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateSuggestions}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Regenerate
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};