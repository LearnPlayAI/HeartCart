/**
 * AI SEO Suggestions Component
 * 
 * This component provides AI-generated SEO optimization suggestions
 * for product metadata.
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
import { Loader2, Sparkles, Copy, Check, AlertCircle } from 'lucide-react';
import { generateSeoSuggestions } from '../utils/ai-utils';
import { useDraft } from '../DraftContext';

interface AiSeoSuggestionsProps {
  onApplySuggestions: (suggestions: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
  }) => void;
}

export const AiSeoSuggestions: React.FC<AiSeoSuggestionsProps> = ({ 
  onApplySuggestions 
}) => {
  const { draft } = useDraft();
  const [suggestions, setSuggestions] = useState<{
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'title' | 'description' | 'keywords' | null>(null);
  
  // Generate SEO suggestions
  const handleGenerateSuggestions = async () => {
    if (!draft?.name) {
      setError('Product name is required for generating SEO suggestions');
      return;
    }
    
    if (!draft?.description) {
      setError('Product description is required for generating SEO suggestions');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get category name if categoryId is available
      const category = draft.categoryId ? 'product category' : undefined;
      
      const seoSuggestions = await generateSeoSuggestions(
        draft.name,
        draft.description,
        category
      );
      
      if (!seoSuggestions.metaTitle && !seoSuggestions.metaDescription && !seoSuggestions.metaKeywords) {
        setError('No SEO suggestions could be generated. Please try again.');
      } else {
        setSuggestions(seoSuggestions);
      }
    } catch (err: any) {
      console.error('Error generating SEO suggestions:', err);
      setError(err.message || 'Failed to generate SEO suggestions');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Copy suggestion to clipboard
  const handleCopy = (text: string, type: 'title' | 'description' | 'keywords') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };
  
  // Apply all suggestions
  const handleApplySuggestions = () => {
    if (suggestions) {
      onApplySuggestions(suggestions);
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center">
          <Sparkles className="h-4 w-4 mr-2" />
          AI SEO Optimization
        </CardTitle>
        <CardDescription>
          Get AI-generated SEO suggestions to improve your product's search visibility.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!suggestions ? (
          <div className="text-center py-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                <p className="text-sm text-muted-foreground">
                  Optimizing SEO content...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <Sparkles className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">
                  Generate SEO-optimized meta tags to improve search engine visibility.
                </p>
                <Button 
                  onClick={handleGenerateSuggestions}
                  disabled={!draft?.name || !draft?.description}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate SEO Suggestions
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Meta Title */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Meta Title</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => handleCopy(suggestions.metaTitle, 'title')}
                >
                  {copied === 'title' ? (
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
              </div>
              <div className="p-2 border rounded-md text-sm bg-muted/50">
                {suggestions.metaTitle}
              </div>
            </div>
            
            {/* Meta Description */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Meta Description</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => handleCopy(suggestions.metaDescription, 'description')}
                >
                  {copied === 'description' ? (
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
              </div>
              <div className="p-2 border rounded-md text-sm bg-muted/50">
                {suggestions.metaDescription}
              </div>
            </div>
            
            {/* Meta Keywords */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Meta Keywords</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => handleCopy(suggestions.metaKeywords, 'keywords')}
                >
                  {copied === 'keywords' ? (
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
              </div>
              <div className="p-2 border rounded-md text-sm bg-muted/50">
                {suggestions.metaKeywords}
              </div>
            </div>
            
            <Button
              className="w-full mt-4"
              onClick={handleApplySuggestions}
            >
              Apply All SEO Suggestions
            </Button>
          </div>
        )}
        
        {error && (
          <div className="flex items-start text-destructive bg-destructive/10 p-3 rounded-md mt-2">
            <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </CardContent>
      
      {suggestions && (
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