import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function DraftCreationTest() {
  const [productId, setProductId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCreateDraft = async () => {
    if (!productId || isNaN(parseInt(productId))) {
      toast({
        title: "Invalid Product ID",
        description: "Please enter a valid product ID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiRequest(
        'POST',
        `/api/products/${productId}/create-draft`
      );
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        toast({
          title: "Draft Created",
          description: `Successfully created draft with ID: ${data.data.id}`,
          variant: "default"
        });
      } else {
        setError(data.error || "Failed to create draft");
        toast({
          title: "Error",
          description: data.error || "Failed to create draft",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      const errorMessage = err.message || "An error occurred while creating the draft";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Test Draft Creation</CardTitle>
        <CardDescription>
          Create a draft from an existing product ID to test the functionality.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center space-x-4">
          <Input
            type="number"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="Enter Product ID"
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            onClick={handleCreateDraft} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Draft'
            )}
          </Button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}
        
        {result && (
          <div className="mt-4">
            <p className="font-semibold mb-2">API Response:</p>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <p className="text-sm text-gray-500">
          This component is for testing purposes only.
        </p>
      </CardFooter>
    </Card>
  );
}

export default DraftCreationTest;