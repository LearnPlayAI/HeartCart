/**
 * Description Generator Component
 * 
 * This component provides AI-powered description generation for products.
 * It uses the AI API to generate multiple description options that the user can choose from.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateDescriptions, checkAiAvailability } from '../utils/ai-utils';

// Component props
interface DescriptionGeneratorProps {
  productName: string;
  category: string;
  attributes: any[];
  onSelectDescription: (description: string) => void;
}

// Tone options for description generation
const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
  { value: 'informative', label: 'Informative' },
  { value: 'persuasive', label: 'Persuasive' }
];

export function DescriptionGenerator({
  productName,
  category,
  attributes,
  onSelectDescription
}: DescriptionGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isAiAvailable, setIsAiAvailable] = useState<boolean | null>(null);
  const [keywords, setKeywords] = useState<string>('');
  const [tone, setTone] = useState<string>('professional');
  const [descriptions, setDescriptions] = useState<string[]>([]);
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

  // Generate descriptions with the AI API
  const generateProductDescriptions = async () => {
    if (!productName.trim()) {
      toast({
        title: "Product name required",
        description: "Please enter a product name to generate descriptions.",
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
    setDescriptions([]);
    setSelectedIndex(null);

    try {
      // Parse the keywords string into an array
      const keywordArray = keywords
        .split(',')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0);

      // Format attributes for the AI
      const formattedAttributes = attributes
        .filter(attr => attr.name && attr.value)
        .map(attr => ({
          name: attr.name,
          value: attr.value
        }));

      // Call the API
      const generatedDescriptions = await generateDescriptions({
        productName,
        category,
        keywords: keywordArray,
        tone,
        attributes: formattedAttributes
      });

      if (generatedDescriptions && generatedDescriptions.length > 0) {
        setDescriptions(generatedDescriptions);
        toast({
          title: "Descriptions Generated",
          description: `${generatedDescriptions.length} product descriptions have been generated.`,
          variant: "default"
        });
      } else {
        toast({
          title: "No Descriptions Generated",
          description: "The AI couldn't generate any descriptions. Try different inputs or try again later.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating descriptions:', error);
      toast({
        title: "Generation Failed",
        description: "An error occurred while generating descriptions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting a description
  const handleSelectDescription = (index: number) => {
    setSelectedIndex(index);
    onSelectDescription(descriptions[index]);
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
          AI Description Generator
        </CardTitle>
        <CardDescription>
          Generate professional product descriptions with AI assistance
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
            <label className="text-sm font-medium mb-1 block">Keywords (comma separated)</label>
            <Input 
              placeholder="premium, durable, lightweight, sustainable" 
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Tone</label>
            <Select 
              value={tone} 
              onValueChange={setTone}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a tone" />
              </SelectTrigger>
              <SelectContent>
                {toneOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={generateProductDescriptions} 
            disabled={loading || isAiAvailable === false || !productName.trim()}
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
                Generate Descriptions
              </>
            )}
          </Button>
        </div>

        {descriptions.length > 0 && (
          <div className="mt-6">
            <Tabs defaultValue="0">
              <TabsList className="w-full">
                {descriptions.map((_, index) => (
                  <TabsTrigger key={index} value={index.toString()} className="flex-1">
                    Option {index + 1}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {descriptions.map((description, index) => (
                <TabsContent key={index} value={index.toString()} className="pt-4">
                  <div className="relative">
                    <Textarea 
                      value={description}
                      readOnly
                      className="min-h-[200px] p-4"
                    />
                    
                    {selectedIndex === index && (
                      <Badge 
                        variant="default" 
                        className="absolute top-2 right-2 bg-green-600"
                      >
                        <Check size={12} className="mr-1" /> Selected
                      </Badge>
                    )}
                    
                    <Button
                      variant={selectedIndex === index ? "outline" : "default"}
                      className="mt-2 w-full"
                      onClick={() => handleSelectDescription(index)}
                      disabled={selectedIndex === index}
                    >
                      {selectedIndex === index ? 'Selected' : 'Use This Description'}
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