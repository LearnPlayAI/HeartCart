/**
 * Description Generator
 * 
 * This component provides AI-powered product description generation
 * using the Google Gemini API.
 */

import { useState } from 'react';
import { useDraftContext } from '../DraftContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, SparklesIcon, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DescriptionGeneratorProps {
  className?: string;
}

export function DescriptionGenerator({ className }: DescriptionGeneratorProps) {
  const { draft, updateDraft, saveDraft } = useDraftContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [style, setStyle] = useState('informative');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [generatedDescriptions, setGeneratedDescriptions] = useState<string[]>([]);
  const [selectedDescription, setSelectedDescription] = useState<string | null>(null);
  
  const toneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'enthusiastic', label: 'Enthusiastic' },
    { value: 'technical', label: 'Technical' },
    { value: 'persuasive', label: 'Persuasive' },
  ];
  
  const lengthOptions = [
    { value: 'short', label: 'Short (50-100 words)' },
    { value: 'medium', label: 'Medium (100-200 words)' },
    { value: 'long', label: 'Long (200-300 words)' },
  ];
  
  const styleOptions = [
    { value: 'informative', label: 'Informative' },
    { value: 'storytelling', label: 'Storytelling' },
    { value: 'benefit-focused', label: 'Benefit-focused' },
    { value: 'comparison', label: 'Comparison' },
    { value: 'problem-solution', label: 'Problem-Solution' },
  ];
  
  // Generate description using AI
  const generateDescription = async () => {
    if (!draft) return;
    
    try {
      setLoading(true);
      setGeneratedDescriptions([]);
      setSelectedDescription(null);
      
      const response = await apiRequest('/api/ai/generate-description', {
        method: 'POST',
        body: JSON.stringify({
          productName: draft.name,
          productCategory: draft.category?.name || '',
          existingDescription: draft.description || '',
          shortDescription: draft.shortDescription || '',
          brand: draft.brand || '',
          tone,
          length,
          style,
          additionalInfo: additionalInfo.trim() || '',
        }),
      });
      
      if (response.success && response.data?.descriptions) {
        setGeneratedDescriptions(response.data.descriptions);
      } else {
        throw new Error(response.message || 'Failed to generate descriptions');
      }
    } catch (error) {
      console.error('Error generating descriptions:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate descriptions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Use the selected description
  const useDescription = async (description: string) => {
    if (!draft) return;
    
    try {
      updateDraft({ description });
      await saveDraft();
      
      toast({
        title: 'Description Updated',
        description: 'The product description has been updated.',
      });
      
      // Close the generator
      setGeneratedDescriptions([]);
      setSelectedDescription(null);
    } catch (error) {
      console.error('Error updating description:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update description. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Preview a description
  const previewDescription = (description: string) => {
    setSelectedDescription(description);
  };
  
  // Regenerate descriptions
  const handleRegenerate = () => {
    generateDescription();
  };
  
  // Handle use of selected description
  const handleUseSelected = async () => {
    if (selectedDescription) {
      await useDescription(selectedDescription);
    }
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-primary" />
          AI Description Generator
        </CardTitle>
        <CardDescription>
          Generate compelling product descriptions with AI to save time and improve quality.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {generatedDescriptions.length === 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger id="tone">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {toneOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="length">Length</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger id="length">
                    <SelectValue placeholder="Select length" />
                  </SelectTrigger>
                  <SelectContent>
                    {lengthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="style">Writing Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger id="style">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    {styleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
              <Textarea
                id="additionalInfo"
                placeholder="Enter any additional details about the product you'd like to include in the description..."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={3}
              />
            </div>
            
            <Button 
              onClick={generateDescription}
              disabled={loading || !draft?.name}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating descriptions...
                </>
              ) : (
                <>
                  <SparklesIcon className="mr-2 h-4 w-4" />
                  Generate Descriptions
                </>
              )}
            </Button>
            
            {!draft?.name && (
              <p className="text-sm text-destructive">
                Please enter a product name before generating descriptions.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Generated Descriptions</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {generatedDescriptions.map((description, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer border ${selectedDescription === description ? 'border-primary' : 'border-border'}`}
                  onClick={() => previewDescription(description)}
                >
                  <CardContent className="p-4">
                    <div className="text-sm line-clamp-3 mb-2">{description}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {description.length} characters • {description.split(/\s+/).length} words
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          useDescription(description);
                        }}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Use This
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {selectedDescription && (
              <div className="border rounded-md p-4 mt-4 space-y-3">
                <h4 className="font-medium">Preview</h4>
                <div className="whitespace-pre-wrap text-sm">{selectedDescription}</div>
                <div className="flex justify-end">
                  <Button onClick={handleUseSelected}>
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    Use This Description
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between border-t px-6 py-4">
        <div className="text-xs text-muted-foreground">
          Powered by Google Gemini AI
        </div>
      </CardFooter>
    </Card>
  );
}