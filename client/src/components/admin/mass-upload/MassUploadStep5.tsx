import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, AlertTriangle, Edit, Trash2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CSVProduct, MassUploadData } from '@/pages/admin/mass-upload';

interface MassUploadStep5Props {
  data: MassUploadData;
  onUpdate: (updates: Partial<MassUploadData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function MassUploadStep5({ data, onUpdate, onNext, onPrevious }: MassUploadStep5Props) {
  const { toast } = useToast();
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);

  const getValidationIcon = (product: CSVProduct) => {
    if (product.validationErrors && product.validationErrors.length > 0) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (product.validationWarnings && product.validationWarnings.length > 0) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const handleEditProduct = (index: number) => {
    setEditingProductIndex(index);
  };

  const handleRemoveProduct = (index: number) => {
    const updatedProducts = data.products.filter((_, i) => i !== index);
    onUpdate({ products: updatedProducts });
  };

  const handleRevalidate = () => {
    console.log('Revalidating products - SKU and pricing validation only');
    
    const validatedProducts = data.products.map((product) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic product validation (no category checks)
      if (!product.title || product.title.trim() === '') {
        errors.push('Product title is required');
      }
      
      if (!product.sku || product.sku.trim() === '') {
        errors.push('SKU is required');
      }
      
      if (!product.description || product.description.trim() === '') {
        warnings.push('Product description is empty');
      }
      
      if (product.costPrice <= 0) {
        errors.push('Cost price must be greater than 0');
      }
      
      if (product.regularPrice <= 0) {
        errors.push('Regular price must be greater than 0');
      }
      
      if (!product.productUrl || product.productUrl.trim() === '') {
        warnings.push('Product URL is missing');
      }

      return {
        ...product,
        validationErrors: errors,
        validationWarnings: warnings,
        isValid: errors.length === 0,
      };
    });

    const validationResult = {
      hasErrors: validatedProducts.some(p => p.validationErrors!.length > 0),
      hasWarnings: validatedProducts.some(p => p.validationWarnings!.length > 0),
      totalProducts: validatedProducts.length,
      validProducts: validatedProducts.filter(p => p.isValid).length,
      invalidProducts: validatedProducts.filter(p => !p.isValid).length,
    };

    onUpdate({
      products: validatedProducts,
      validationResults: validationResult,
    });
  };

  const handleStartUpload = async () => {
    if (data.validationResults?.hasErrors) {
      toast({
        title: 'Validation Errors',
        description: 'Please fix all validation errors before starting upload.',
        variant: 'destructive',
      });
      return;
    }

    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Step 5: Make Adjustments
        </CardTitle>
        <p className="text-muted-foreground">
          Fix validation issues and edit product data. Categories will be assigned in the drafts system.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Summary */}
        {data.validationResults && (
          <Alert className={data.validationResults.hasErrors ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            {data.validationResults.hasErrors ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <AlertDescription>
              {data.validationResults.hasErrors ? (
                <span className="text-red-700">
                  {data.validationResults.invalidProducts} products have validation errors that need to be fixed.
                </span>
              ) : (
                <span className="text-green-700">
                  All {data.validationResults.validProducts} products are ready for upload!
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleRevalidate} variant="outline">
            Re-validate Products
          </Button>
        </div>

        {/* Products Table */}
        <div className="border rounded-lg">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Status</TableHead>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Categories (CSV)</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.products.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {getValidationIcon(product)}
                    </TableCell>
                    
                    <TableCell className="font-mono text-sm">
                      {product.sku}
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Cost: R{product.costPrice} | Regular: R{product.regularPrice}
                        </p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{product.parentCategory}</div>
                        {product.childCategory && (
                          <div className="text-xs text-muted-foreground">→ {product.childCategory}</div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {product.validationErrors?.map((error, i) => (
                          <div key={i} className="text-red-600 text-xs">
                            {error}
                          </div>
                        ))}
                        {product.validationWarnings?.map((warning, i) => (
                          <div key={i} className="text-yellow-600 text-xs">
                            {warning}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProduct(index)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button onClick={onPrevious} variant="outline">
            Previous
          </Button>
          <Button 
            onClick={handleStartUpload}
            disabled={data.validationResults?.hasErrors}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Start Upload Process
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}