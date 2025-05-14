import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { useGenerateDescriptions, useAiStatus } from '../utils/ai-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface DescriptionGeneratorProps {
  productName: string;
  category?: string;
  attributes?: any[];
  onSelectDescription: (description: string) => void;
}

export function DescriptionGenerator({
  productName,
  category,
  attributes,
  onSelectDescription
}: DescriptionGeneratorProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const { available, isLoading: isCheckingStatus } = useAiStatus();
  const { 
    generateDescriptions, 
    descriptions, 
    isGenerating, 
    error, 
    reset 
  } = useGenerateDescriptions();

  const handleGenerateDescriptions = () => {
    if (!productName) {
      toast({
        title: "Product name required",
        description: "Please enter a product name before generating descriptions.",
        variant: "destructive"
      });
      return;
    }
    
    generateDescriptions({ productName, category, attributes });
    setExpanded(true);
  };

  const handleSelectDescription = (description: string) => {
    onSelectDescription(description);
    toast({
      title: "Description selected",
      description: "The AI-generated description has been applied."
    });
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
          AI-powered product description generation is not available. Contact your administrator to configure the AI service.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Description Generator
        </CardTitle>
        <CardDescription>
          Generate product descriptions using AI based on your product details
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Generation Failed</AlertTitle>
            <AlertDescription>
              {error.message || "Failed to generate descriptions. Please try again."}
            </AlertDescription>
          </Alert>
        )}

        {descriptions.length > 0 && (
          <div className="space-y-4 mb-4">
            <div className="border rounded-md p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">AI-Generated Descriptions</h4>
                <Badge variant="outline">
                  {descriptions.length} options
                </Badge>
              </div>
              <div className="space-y-3">
                {descriptions.map((description, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm mb-2 text-pretty">{description}</p>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="mt-1"
                      onClick={() => handleSelectDescription(description)}
                    >
                      Use This Description
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateDescriptions}
            disabled={isGenerating || !productName}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Descriptions
              </>
            )}
          </Button>
          
          {descriptions.length > 0 && (
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
        This feature generates product descriptions based on AI. Review and edit as needed.
      </CardFooter>
    </Card>
  );
}