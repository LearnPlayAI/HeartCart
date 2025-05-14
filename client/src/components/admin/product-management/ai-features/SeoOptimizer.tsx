/**
 * SEO Optimizer Component
 * 
 * This component provides AI-powered SEO optimization suggestions
 * for product pages, including meta title, meta description, and keywords.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Check, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { optimizeSeo, checkAiAvailability } from '../utils/ai-utils';

// Component props
interface SeoOptimizerProps {
  productName: string;
  description: string;
  category: string;
  onApplySeoTitle: (title: string) => void;
  onApplySeoDescription: (description: string) => void;
  onApplyKeywords: (keywords: string[]) => void;
}

// SEO Suggestion format
interface SeoSuggestion {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
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
  const [loading, setLoading] = useState(false);
  const [isAiAvailable, setIsAiAvailable] = useState<boolean | null>(null);
  const [targetKeywords, setTargetKeywords] = useState<string>('');
  const [suggestions, setSuggestions] = useState<SeoSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Check AI availability on component mount
  const checkAvailability = useCallback(async () => {
    try {
      const available = await checkAiAvailability();
      setIsAiAvailable(available);
    } catch (error) {
      console.error('Error checking AI availability:', error);
      setIsAiAvailable(false);
    }
  }, []);

  // Generate SEO suggestions using the AI API
  const generateSeoSuggestions = async () => {
    if (!productName.trim() || !description.trim()) {
      toast({
        title: "Product information required",
        description: "Please provide both product name and description to generate SEO suggestions.",
        variant: "destructive"
      });
      return;
    }

    // Validate that AI is available
    if (isAiAvailable === null) {
      await checkAvailability();
      
      if (!isAiAvailable) {
        toast({
          title: "AI Services Unavailable",
          description: "AI services are currently unavailable. Your administrator can enable them in the system settings.",
          variant: "destructive"
        });
        return;
      }
    } else if (isAiAvailable === false) {
      toast({
        title: "AI Services Unavailable",
        description: "AI services are currently unavailable. Your administrator can enable them in the system settings.",
        variant: "destructive"
      });
      return;
    }

    // Reset state
    setLoading(true);
    setSuggestions([]);
    setSelectedIndex(null);

    try {
      // Parse the target keywords string into an array
      const keywordArray = targetKeywords
        .split(',')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0);

      // Call the API
      const seoSuggestions = await optimizeSeo({
        productName,
        description,
        category,
        targetKeywords: keywordArray
      });

      if (seoSuggestions && seoSuggestions.length > 0) {
        setSuggestions(seoSuggestions);
        toast({
          title: "SEO Suggestions Generated",
          description: `${seoSuggestions.length} SEO suggestions have been generated.`,
          variant: "default"
        });
      } else {
        toast({
          title: "No SEO Suggestions Generated",
          description: "The AI couldn't generate any SEO suggestions. Try different inputs or try again later.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating SEO suggestions:', error);
      toast({
        title: "Generation Failed",
        description: "An error occurred while generating SEO suggestions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply all the SEO suggestions at once
  const handleApplySuggestion = (index: number) => {
    setSelectedIndex(index);
    
    const suggestion = suggestions[index];
    onApplySeoTitle(suggestion.metaTitle);
    onApplySeoDescription(suggestion.metaDescription);
    onApplyKeywords(suggestion.keywords);
    
    toast({
      title: "SEO Suggestion Applied",
      description: "The SEO suggestion has been applied to your product.",
      variant: "default"
    });
  };

  // Apply just the meta title
  const handleApplyTitle = (index: number) => {
    onApplySeoTitle(suggestions[index].metaTitle);
    toast({
      title: "Meta Title Applied",
      description: "The meta title has been applied to your product.",
      variant: "default"
    });
  };

  // Apply just the meta description
  const handleApplyDescription = (index: number) => {
    onApplySeoDescription(suggestions[index].metaDescription);
    toast({
      title: "Meta Description Applied",
      description: "The meta description has been applied to your product.",
      variant: "default"
    });
  };

  // Apply just the keywords
  const handleApplyKeywords = (index: number) => {
    onApplyKeywords(suggestions[index].keywords);
    toast({
      title: "Keywords Applied",
      description: "The keywords have been applied to your product.",
      variant: "default"
    });
  };

  if (isAiAvailable === null) {
    // Initial load, check AI availability
    checkAvailability();
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          AI SEO Optimizer
        </CardTitle>
        <CardDescription>
          Generate SEO-optimized content for your product listing
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAiAvailable === false && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
            <AlertCircle size={16} />
            <span>AI services are currently unavailable. Please try again later or contact your administrator.</span>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Target Keywords (comma separated)</label>
            <Input 
              placeholder="premium, south africa, online shop" 
              value={targetKeywords}
              onChange={(e) => setTargetKeywords(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Add specific keywords you want to target. Leave empty to let the AI suggest keywords.
            </p>
          </div>
          
          <Button 
            onClick={generateSeoSuggestions} 
            disabled={loading || isAiAvailable === false || !productName.trim() || !description.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate SEO Suggestions
              </>
            )}
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="mt-6">
            <Tabs defaultValue="0">
              <TabsList className="w-full">
                {suggestions.map((_, index) => (
                  <TabsTrigger key={index} value={index.toString()} className="flex-1">
                    Option {index + 1}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {suggestions.map((suggestion, index) => (
                <TabsContent key={index} value={index.toString()} className="pt-4 space-y-6">
                  <div className="relative space-y-4">
                    {selectedIndex === index && (
                      <Badge 
                        variant="default" 
                        className="absolute top-0 right-0 bg-green-600"
                      >
                        <Check size={12} className="mr-1" /> Selected
                      </Badge>
                    )}
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Meta Title</h4>
                      <div className="flex gap-2">
                        <div className="flex-1 p-3 border rounded-md bg-muted/20">
                          {suggestion.metaTitle}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleApplyTitle(index)}
                        >
                          Apply
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestion.metaTitle.length}/60 characters
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Meta Description</h4>
                      <div className="flex gap-2">
                        <div className="flex-1 p-3 border rounded-md bg-muted/20">
                          {suggestion.metaDescription}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleApplyDescription(index)}
                        >
                          Apply
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestion.metaDescription.length}/160 characters
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Keywords</h4>
                      <div className="flex gap-2">
                        <div className="flex-1 p-3 border rounded-md bg-muted/20">
                          <div className="flex flex-wrap gap-2">
                            {suggestion.keywords.map((keyword, kIndex) => (
                              <Badge key={kIndex} variant="secondary">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleApplyKeywords(index)}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                    
                    <Button
                      variant={selectedIndex === index ? "outline" : "default"}
                      className="w-full mt-4"
                      onClick={() => handleApplySuggestion(index)}
                      disabled={selectedIndex === index}
                    >
                      {selectedIndex === index ? 'Selected' : 'Apply All'}
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}