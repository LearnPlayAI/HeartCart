import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2 } from 'lucide-react';
import { useProductAnalysis } from '@/hooks/use-ai';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface AiProductAnalyzerProps {
  imageUrl: string;
  productName: string;
  onApplyChanges: (changes: {
    name?: string;
    description?: string;
    category?: string;
    brand?: string;
    tags?: string[];
  }) => void;
}

export function AiProductAnalyzer({ imageUrl, productName, onApplyChanges }: AiProductAnalyzerProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedFields, setSelectedFields] = useState<{
    name: boolean;
    description: boolean;
    category: boolean; 
    brand: boolean;
    tags: boolean;
  }>({
    name: true,
    description: true,
    category: true,
    brand: true,
    tags: true,
  });

  const { 
    analyzeProduct, 
    isProcessing, 
    productAnalysisData 
  } = useProductAnalysis({
    onSuccess: () => {
      setShowAnalysis(true);
    },
  });

  const handleAnalyze = () => {
    if (imageUrl && productName) {
      analyzeProduct({ imageUrl, productName });
    }
  };

  const handleApplyChanges = () => {
    if (!productAnalysisData) return;
    
    const changes: any = {};
    
    if (selectedFields.name && productAnalysisData.suggestedName) {
      changes.name = productAnalysisData.suggestedName;
    }
    
    if (selectedFields.description && productAnalysisData.suggestedDescription) {
      changes.description = productAnalysisData.suggestedDescription;
    }
    
    if (selectedFields.category && productAnalysisData.suggestedCategory) {
      changes.category = productAnalysisData.suggestedCategory;
    }
    
    if (selectedFields.brand && productAnalysisData.suggestedBrand) {
      changes.brand = productAnalysisData.suggestedBrand;
    }
    
    if (selectedFields.tags && productAnalysisData.suggestedTags) {
      changes.tags = productAnalysisData.suggestedTags;
    }
    
    onApplyChanges(changes);
    setShowAnalysis(false);
  };

  const toggleField = (field: keyof typeof selectedFields) => {
    setSelectedFields(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  if (!imageUrl) {
    return (
      <div className="text-center p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">Upload an image first to use AI features</p>
      </div>
    );
  }
  
  if (!productName) {
    return (
      <div className="text-center p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">Enter a product name first to use AI features</p>
      </div>
    );
  }

  if (!showAnalysis) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-center">
        <div className="flex flex-col items-center">
          <Wand2 className="h-8 w-8 mb-2 text-pink-600" />
          <h3 className="text-lg font-medium mb-1">AI Product Analysis</h3>
          <p className="text-zinc-500 dark:text-zinc-400 mb-4 max-w-md">
            Use AI to analyze the product image and suggest details like name, description, category, and tags
          </p>
        </div>
        
        <Button
          onClick={handleAnalyze}
          disabled={isProcessing}
          className="bg-pink-600 hover:bg-pink-700"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Analyze Product Image
            </>
          )}
        </Button>
      </div>
    );
  }

  if (productAnalysisData) {
    return (
      <Card className="border-pink-200 dark:border-pink-900/40 shadow-sm">
        <CardHeader className="bg-pink-50 dark:bg-pink-900/10 border-b border-pink-100 dark:border-pink-900/20">
          <CardTitle className="flex items-center text-lg">
            <Wand2 className="h-5 w-5 mr-2 text-pink-600" />
            AI Analysis Results
          </CardTitle>
          <CardDescription>
            Select which suggestions to apply to your product
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {productAnalysisData.suggestedName && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Suggested Name</h4>
                <Button
                  variant={selectedFields.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleField('name')}
                  className={selectedFields.name ? "bg-pink-600 hover:bg-pink-700" : ""}
                >
                  {selectedFields.name ? "Selected" : "Select"}
                </Button>
              </div>
              <p className={`text-sm p-2 rounded-md ${selectedFields.name ? "bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                {productAnalysisData.suggestedName}
              </p>
            </div>
          )}

          {productAnalysisData.suggestedDescription && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Suggested Description</h4>
                <Button
                  variant={selectedFields.description ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleField('description')}
                  className={selectedFields.description ? "bg-pink-600 hover:bg-pink-700" : ""}
                >
                  {selectedFields.description ? "Selected" : "Select"}
                </Button>
              </div>
              <Textarea 
                readOnly 
                value={productAnalysisData.suggestedDescription}
                className={`text-sm h-24 ${selectedFields.description ? "bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20" : "bg-zinc-100 dark:bg-zinc-800"}`}
              />
            </div>
          )}

          {productAnalysisData.suggestedCategory && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Suggested Category</h4>
                <Button
                  variant={selectedFields.category ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleField('category')}
                  className={selectedFields.category ? "bg-pink-600 hover:bg-pink-700" : ""}
                >
                  {selectedFields.category ? "Selected" : "Select"}
                </Button>
              </div>
              <p className={`text-sm p-2 rounded-md ${selectedFields.category ? "bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                {productAnalysisData.suggestedCategory}
              </p>
            </div>
          )}

          {productAnalysisData.suggestedBrand && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Suggested Brand</h4>
                <Button
                  variant={selectedFields.brand ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleField('brand')}
                  className={selectedFields.brand ? "bg-pink-600 hover:bg-pink-700" : ""}
                >
                  {selectedFields.brand ? "Selected" : "Select"}
                </Button>
              </div>
              <p className={`text-sm p-2 rounded-md ${selectedFields.brand ? "bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                {productAnalysisData.suggestedBrand}
              </p>
            </div>
          )}

          {productAnalysisData.suggestedTags && productAnalysisData.suggestedTags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Suggested Tags</h4>
                <Button
                  variant={selectedFields.tags ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleField('tags')}
                  className={selectedFields.tags ? "bg-pink-600 hover:bg-pink-700" : ""}
                >
                  {selectedFields.tags ? "Selected" : "Select"}
                </Button>
              </div>
              <div className={`flex flex-wrap gap-2 p-2 rounded-md ${selectedFields.tags ? "bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                {productAnalysisData.suggestedTags.map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className={selectedFields.tags ? "bg-pink-100 text-pink-800 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300" : ""}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between bg-zinc-50 dark:bg-zinc-900 border-t p-4">
          <Button variant="outline" onClick={() => setShowAnalysis(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleApplyChanges}
            className="bg-pink-600 hover:bg-pink-700"
          >
            Apply Selected Changes
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return null;
}