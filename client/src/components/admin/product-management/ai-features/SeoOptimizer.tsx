/**
 * SEO Optimizer
 * 
 * This component provides AI-powered SEO optimization
 * using the Google Gemini API.
 */

import { useState } from 'react';
import { useDraftContext } from '../DraftContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, SearchIcon, Lightbulb, Check, Sparkles, Tag } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface SeoOptimizerProps {
  className?: string;
}

type SeoResult = {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  suggestions: string[];
};

export function SeoOptimizer({ className }: SeoOptimizerProps) {
  const { draft, updateDraft, saveDraft } = useDraftContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [seoResult, setSeoResult] = useState<SeoResult | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  
  // Generate SEO recommendations using AI
  const generateSeoRecommendations = async () => {
    if (!draft) return;
    
    try {
      setLoading(true);
      setSeoResult(null);
      
      const response = await apiRequest('/api/ai/optimize-seo', {
        method: 'POST',
        body: JSON.stringify({
          productName: draft.name,
          productCategory: draft.category?.name || '',
          description: draft.description || '',
          shortDescription: draft.shortDescription || '',
          brand: draft.brand || '',
          keywords: keywords,
          additionalInfo: additionalInfo.trim() || '',
        }),
      });
      
      if (response.success && response.data) {
        setSeoResult(response.data);
      } else {
        throw new Error(response.message || 'Failed to generate SEO recommendations');
      }
    } catch (error) {
      console.error('Error generating SEO recommendations:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate SEO recommendations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Apply SEO recommendations to the product draft
  const applySeoRecommendations = async () => {
    if (!draft || !seoResult) return;
    
    try {
      const updates = {
        metaTitle: seoResult.metaTitle,
        metaDescription: seoResult.metaDescription,
        keywords: seoResult.keywords.join(', ')
      };
      
      updateDraft(updates);
      await saveDraft();
      
      // Update local keywords state
      setKeywords(seoResult.keywords);
      
      toast({
        title: 'SEO Updated',
        description: 'The product SEO information has been updated.',
      });
    } catch (error) {
      console.error('Error updating SEO:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update SEO information. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Add a keyword to the list
  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    if (keywords.includes(newKeyword.trim())) {
      toast({
        title: 'Duplicate Keyword',
        description: 'This keyword already exists in the list.',
        variant: 'destructive',
      });
      return;
    }
    
    setKeywords([...keywords, newKeyword.trim()]);
    setNewKeyword('');
  };
  
  // Remove a keyword from the list
  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };
  
  // Handle Enter key press in the keyword input
  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };
  
  // Load keywords from draft on component mount
  useState(() => {
    if (draft?.keywords) {
      const keywordArray = draft.keywords.split(',').map(k => k.trim()).filter(Boolean);
      setKeywords(keywordArray);
    }
  });
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SearchIcon className="h-5 w-5 text-primary" />
          AI SEO Optimizer
        </CardTitle>
        <CardDescription>
          Generate SEO-optimized metadata and keyword recommendations to improve search visibility.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Keywords Input */}
          <div className="space-y-2">
            <Label htmlFor="keywords">Current Keywords</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {keywords.length > 0 ? (
                keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {keyword}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-4 w-4 ml-1 rounded-full"
                      onClick={() => removeKeyword(keyword)}
                    >
                      <span>×</span>
                    </Button>
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No keywords added yet</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                id="newKeyword"
                placeholder="Add a keyword..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={handleKeywordKeyPress}
                className="flex-grow"
              />
              <Button 
                onClick={addKeyword}
                variant="outline"
                size="sm"
              >
                Add
              </Button>
            </div>
          </div>
          
          {/* Additional Information */}
          <div className="space-y-2">
            <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
            <Textarea
              id="additionalInfo"
              placeholder="Enter any additional information for SEO optimization, like target audience, key selling points, or special features..."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
            />
          </div>
          
          {/* Generate Button */}
          <Button 
            onClick={generateSeoRecommendations}
            disabled={loading || !draft?.name}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating SEO recommendations...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate SEO Recommendations
              </>
            )}
          </Button>
          
          {!draft?.name && (
            <p className="text-sm text-destructive">
              Please enter a product name before generating SEO recommendations.
            </p>
          )}
          
          {/* SEO Results */}
          {seoResult && (
            <div className="mt-6 space-y-6">
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  SEO Recommendations
                </h3>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="metaTitle">Meta Title</Label>
                    <div className="relative">
                      <Input 
                        id="metaTitle" 
                        value={seoResult.metaTitle} 
                        readOnly 
                        className="pr-16"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {seoResult.metaTitle.length}/60
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="metaDescription">Meta Description</Label>
                    <div className="relative">
                      <Textarea 
                        id="metaDescription" 
                        value={seoResult.metaDescription} 
                        readOnly 
                        className="pr-16 resize-none"
                        rows={3}
                      />
                      <div className="absolute right-3 top-3 text-xs text-muted-foreground">
                        {seoResult.metaDescription.length}/160
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label>Recommended Keywords</Label>
                    <div className="flex flex-wrap gap-2">
                      {seoResult.keywords.map((keyword, index) => (
                        <Badge key={index} variant="outline" className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label>SEO Improvement Suggestions</Label>
                    <div className="space-y-2 mt-2">
                      {seoResult.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="mt-0.5 text-primary">
                            <Lightbulb className="h-4 w-4" />
                          </div>
                          <p className="text-sm">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={applySeoRecommendations}
                  className="w-full"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Apply SEO Recommendations
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t px-6 py-4">
        <div className="text-xs text-muted-foreground">
          Powered by Google Gemini AI
        </div>
      </CardFooter>
    </Card>
  );
}