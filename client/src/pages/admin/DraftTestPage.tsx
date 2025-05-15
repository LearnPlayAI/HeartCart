import React, { useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import DraftCreationTest from '@/components/admin/product-wizard/test/DraftCreationTest';

export default function DraftTestPage() {
  const { toast } = useToast();
  const [productId, setProductId] = useState<string>('');
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [draftCreated, setDraftCreated] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setIsCreatingDraft(true);
      setError(null);
      
      const response = await apiRequest('POST', `/api/products/${productId}/create-draft`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create draft');
      }

      setDraftCreated(true);
      setDraftId(data.data.id);
      
      toast({
        title: 'Draft Created Successfully',
        description: `Draft ID: ${data.data.id}`,
      });
    } catch (err) {
      console.error('Error creating draft:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      
      toast({
        title: 'Error Creating Draft',
        description: err instanceof Error ? err.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const resetTest = () => {
    setDraftCreated(false);
    setDraftId(null);
    setError(null);
  };

  return (
    <AdminLayout title="Draft System Test" subtitle="Testing draft creation functionality">
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Draft Creation</CardTitle>
            <CardDescription>
              This page allows you to test the draft creation functionality by creating a draft from an existing product.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!draftCreated ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="productId">Product ID</Label>
                    <Input
                      id="productId"
                      type="number"
                      placeholder="Enter product ID"
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                    />
                  </div>
                  
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
                      {error}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="font-medium text-green-800">Draft created successfully!</p>
                  <p className="text-green-700">Draft ID: {draftId}</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            {!draftCreated ? (
              <Button 
                onClick={handleCreateDraft}
                disabled={isCreatingDraft}
              >
                {isCreatingDraft ? 'Creating...' : 'Create Draft'}
              </Button>
            ) : (
              <Button variant="outline" onClick={resetTest}>
                Reset Test
              </Button>
            )}
          </CardFooter>
        </Card>

        <DraftCreationTest />
      </div>
    </AdminLayout>
  );
}