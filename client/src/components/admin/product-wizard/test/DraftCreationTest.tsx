import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DraftTestOptions {
  includeImages: boolean;
  includeAttributes: boolean;
  includeMetadata: boolean;
  includeSEO: boolean;
  includePromotions: boolean;
  userId?: number;
  targetStatus: 'draft' | 'published';
}

export default function DraftCreationTest() {
  const { toast } = useToast();
  const [productId, setProductId] = useState<string>('');
  const [options, setOptions] = useState<DraftTestOptions>({
    includeImages: true,
    includeAttributes: true,
    includeMetadata: true,
    includeSEO: true,
    includePromotions: true,
    targetStatus: 'draft',
    userId: 2, // Default to admin user
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOptionChange = (key: keyof DraftTestOptions, value: any) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCreateDraft = async () => {
    if (!productId || isNaN(parseInt(productId))) {
      toast({
        title: 'Invalid Product ID',
        description: 'Please enter a valid product ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResult(null);
      
      // Advanced draft creation endpoint with options
      const response = await apiRequest('POST', `/api/products/${productId}/create-draft-test`, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create draft');
      }

      setResult(data.data);
      
      toast({
        title: 'Test Completed',
        description: `Draft created with ID: ${data.data.draftId}`,
      });
    } catch (err) {
      console.error('Error creating test draft:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      
      toast({
        title: 'Error Creating Test Draft',
        description: err instanceof Error ? err.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Draft Creation Test</CardTitle>
        <CardDescription>
          Test draft creation with specific options to verify component operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="productId">Product ID for Testing</Label>
            <Input
              id="productId"
              type="number"
              placeholder="Enter product ID"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Draft Creation Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeImages"
                  checked={options.includeImages}
                  onCheckedChange={(checked) => 
                    handleOptionChange('includeImages', checked === true)
                  }
                />
                <Label htmlFor="includeImages">Include Images</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAttributes"
                  checked={options.includeAttributes}
                  onCheckedChange={(checked) => 
                    handleOptionChange('includeAttributes', checked === true)
                  }
                />
                <Label htmlFor="includeAttributes">Include Attributes</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMetadata"
                  checked={options.includeMetadata}
                  onCheckedChange={(checked) => 
                    handleOptionChange('includeMetadata', checked === true)
                  }
                />
                <Label htmlFor="includeMetadata">Include Metadata</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSEO"
                  checked={options.includeSEO}
                  onCheckedChange={(checked) => 
                    handleOptionChange('includeSEO', checked === true)
                  }
                />
                <Label htmlFor="includeSEO">Include SEO</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includePromotions"
                  checked={options.includePromotions}
                  onCheckedChange={(checked) => 
                    handleOptionChange('includePromotions', checked === true)
                  }
                />
                <Label htmlFor="includePromotions">Include Promotions</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Target Status</Label>
                <Select
                  value={options.targetStatus}
                  onValueChange={(value) => 
                    handleOptionChange('targetStatus', value as 'draft' | 'published')
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userId">User ID (Admin)</Label>
                <Input
                  id="userId"
                  type="number"
                  value={options.userId || ''}
                  onChange={(e) => 
                    handleOptionChange('userId', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="User ID for draft creator"
                />
              </div>
            </div>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
              {error}
            </div>
          )}
          
          {result && (
            <div className="bg-green-50 p-4 rounded-md border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">Test Result</h3>
              <pre className="text-xs bg-green-100 p-3 rounded overflow-auto max-h-60">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleCreateDraft}
          disabled={isLoading}
        >
          {isLoading ? 'Running Test...' : 'Run Draft Creation Test'}
        </Button>
      </CardFooter>
    </Card>
  );
}