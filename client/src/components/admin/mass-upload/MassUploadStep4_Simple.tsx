import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle, AlertTriangle, XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MassUploadData, CSVProduct } from '@/pages/admin/mass-upload';
import { apiRequest } from '@/lib/queryClient';

interface MassUploadStep4Props {
  data: MassUploadData;
  onUpdate: (updates: Partial<MassUploadData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface ValidationResult {
  hasErrors: boolean;
  hasWarnings: boolean;
  totalProducts: number;
  validProducts: number;
  invalidProducts: number;
}

export function MassUploadStep4({ data, onUpdate, onNext, onPrevious }: MassUploadStep4Props) {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);

  // Fetch existing draft records for duplicate checking
  const { data: draftsData, isLoading: isLoadingDrafts } = useQuery({
    queryKey: ['/api/product-drafts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/product-drafts');
      return response.json();
    },
  });

  const existingDrafts = draftsData?.data?.drafts || [];

  useEffect(() => {
    if (!isLoadingDrafts && !validationComplete) {
      runValidation();
    }
  }, [isLoadingDrafts]);

  const runValidation = async () => {
    if (isLoadingDrafts) return;
    
    setIsValidating(true);
    
    try {
      console.log('Starting validation with products:', data.products.length);
      console.log('Existing drafts:', existingDrafts.length);
      
      const validatedProducts = data.products.map((product, index) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!product.sku || !product.sku.trim()) {
          errors.push('SKU is required');
        }
        if (!product.title || !product.title.trim()) {
          errors.push('Product title is required');
        }
        if (!product.description || !product.description.trim()) {
          errors.push('Product description is required');
        }
        if (!product.productUrl || !product.productUrl.trim()) {
          errors.push('Product URL is required');
        }

        // Check for duplicates if we have a valid SKU
        if (product.sku && product.sku.trim()) {
          const duplicateDraft = existingDrafts.find((draft: any) => 
            draft.sku && draft.sku.toLowerCase() === product.sku.toLowerCase()
          );
          
          if (duplicateDraft) {
            // Store existing draft data for comparison
            product.existingDraft = {
              id: duplicateDraft.id,
              name: duplicateDraft.name,
              price: duplicateDraft.price,
              salePrice: duplicateDraft.salePrice,
              costPrice: duplicateDraft.costPrice,
              draftStatus: duplicateDraft.draftStatus
            };

            // Mark as duplicate and allow user to deselect or update
            product.isDuplicate = true;
            product.isSelected = false; // Default to deselected for duplicates
            warnings.push(`Product with SKU "${product.sku}" already exists (Status: ${duplicateDraft.draftStatus}). You can choose to update the existing product or skip this duplicate.`);
          } else {
            product.isSelected = true; // Default to selected for non-duplicates
          }
        }

        // Category handling - optional for upload
        const hasValidCategory = product.parentCategory && 
          product.parentCategory.trim() !== '' && 
          product.parentCategory !== 'Mass Upload';
        
        if (!hasValidCategory) {
          product.needsCategoryAssignment = true;
          warnings.push(`Product "${product.title}" has no category assignments. You can assign categories in the next step.`);
        }

        // Pricing validation (warnings only)
        if (product.costPrice > 0 && product.regularPrice > 0 && product.costPrice >= product.regularPrice) {
          warnings.push('Cost price should be less than regular price');
        }

        if (product.salePrice > 0 && product.regularPrice > 0 && product.salePrice >= product.regularPrice) {
          warnings.push('Sale price should be less than regular price');
        }

        // URL format check
        if (product.productUrl && !product.productUrl.startsWith('http')) {
          warnings.push('Product URL should start with http or https');
        }

        // Return validated product
        return {
          ...product,
          validationErrors: errors,
          validationWarnings: warnings,
          isValid: errors.length === 0,
        };
      });

      const validationResult: ValidationResult = {
        hasErrors: validatedProducts.some(p => p.validationErrors && p.validationErrors.length > 0),
        hasWarnings: validatedProducts.some(p => p.validationWarnings && p.validationWarnings.length > 0),
        totalProducts: validatedProducts.length,
        validProducts: validatedProducts.filter(p => p.isValid).length,
        invalidProducts: validatedProducts.filter(p => !p.isValid).length,
      };

      console.log('Validation completed:', validationResult);

      onUpdate({
        products: validatedProducts,
        validationResults: validationResult,
      });

      setValidationComplete(true);
      
      if (validationResult.hasErrors) {
        toast({
          title: 'Validation Issues Found',
          description: `${validationResult.invalidProducts} products have validation errors that need to be fixed.`,
          variant: 'destructive',
        });
      } else if (validationResult.hasWarnings) {
        toast({
          title: 'Validation Complete',
          description: `${validationResult.validProducts} products are ready for upload. Some have warnings to review.`,
        });
      } else {
        toast({
          title: 'Validation Complete',
          description: `All ${validationResult.validProducts} products are ready for upload.`,
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationComplete(false);
      toast({
        title: 'Validation Failed',
        description: error instanceof Error ? error.message : 'Failed to validate products. Please try again.',
        variant: 'destructive',
      });
    }
    
    setIsValidating(false);
  };

  const handleRevalidate = () => {
    setValidationComplete(false);
    runValidation();
  };

  const handleNext = () => {
    if (!data.validationResults) {
      toast({
        title: 'Validation Required',
        description: 'Please run validation before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    if (data.validationResults.hasErrors) {
      toast({
        title: 'Validation Errors',
        description: 'Please fix all validation errors before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    onNext();
  };

  const getValidationIcon = (product: CSVProduct) => {
    if (product.validationErrors && product.validationErrors.length > 0) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (product.validationWarnings && product.validationWarnings.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getValidationStatus = (product: CSVProduct) => {
    if (product.validationErrors && product.validationErrors.length > 0) {
      return <Badge variant="destructive">Error</Badge>;
    }
    if (product.validationWarnings && product.validationWarnings.length > 0) {
      return <Badge variant="secondary">Warning</Badge>;
    }
    return <Badge variant="default">Valid</Badge>;
  };

  const handleProductSelection = (productIndex: number, isSelected: boolean) => {
    const updatedProducts = [...data.products];
    updatedProducts[productIndex].isSelected = isSelected;
    onUpdate({ products: updatedProducts });
  };

  if (isLoadingDrafts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Validation Data...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
              <p>Loading existing products...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isValidating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle className="h-5 w-5" />
          )}
          Step 4: Validation
        </CardTitle>
        <p className="text-muted-foreground">
          Checking for duplicate products and validating required fields.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Validation Summary */}
        {data.validationResults && (
          <Alert>
            <AlertDescription>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Products:</span> {data.validationResults.totalProducts}
                </div>
                <div>
                  <span className="font-medium">Valid:</span> {data.validationResults.validProducts}
                </div>
                <div>
                  <span className="font-medium">Issues:</span> {data.validationResults.invalidProducts}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={handleRevalidate} 
            variant="outline" 
            disabled={isValidating}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Revalidate
          </Button>
        </div>

        {/* Products Table */}
        {data.products.length > 0 && (
          <div className="border rounded-lg">
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead className="w-16">Status</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Title</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Checkbox
                          checked={product.isSelected ?? true}
                          onCheckedChange={(checked) => 
                            handleProductSelection(index, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getValidationIcon(product)}
                          {getValidationStatus(product)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>{product.title}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {product.validationErrors?.map((error, i) => (
                            <div key={i} className="text-red-600 text-xs">{error}</div>
                          ))}
                          {product.validationWarnings?.map((warning, i) => (
                            <div key={i} className="text-yellow-600 text-xs">{warning}</div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!validationComplete || (data.validationResults?.hasErrors ?? false)}
          >
            Next: Adjustments
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}