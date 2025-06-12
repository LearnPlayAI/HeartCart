import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { CSVProduct, MassUploadData } from '@/pages/admin/mass-upload';

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
  const [validationComplete, setValidationComplete] = useState(false);

  // Fetch existing drafts for duplicate detection
  const { data: existingDrafts, isLoading: draftsLoading } = useQuery({
    queryKey: ['/api/product-drafts'],
    enabled: true
  });

  // Fetch published products for duplicate detection
  const { data: publishedProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    enabled: true
  });

  // Validate products when drafts and products data is loaded
  useEffect(() => {
    if (existingDrafts && publishedProducts && !draftsLoading && !productsLoading) {
      validateProducts();
    }
  }, [existingDrafts, publishedProducts, draftsLoading, productsLoading]);

  const validateProducts = () => {
    console.log('Starting validation with products:', data.products.length);
    console.log('Existing drafts:', (existingDrafts as any)?.drafts?.length || 0);
    console.log('Published products:', (publishedProducts as any)?.products?.length || 0);

    const validatedProducts = data.products.map(product => {
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

      // Check for SKU duplicates in drafts
      if (product.sku && product.sku.trim()) {
        const duplicateDraft = (existingDrafts as any)?.drafts?.find((draft: any) => 
          draft.sku && draft.sku.toLowerCase() === product.sku.toLowerCase()
        );
        
        if (duplicateDraft) {
          // Store existing draft data for pricing comparison
          product.existingDraft = {
            id: duplicateDraft.id,
            name: duplicateDraft.name,
            price: duplicateDraft.price || 0,
            salePrice: duplicateDraft.salePrice || 0,
            costPrice: duplicateDraft.costPrice || 0,
            draftStatus: duplicateDraft.draftStatus
          };

          // Compare pricing to detect changes
          const pricingChanges = [];
          if (Math.abs(product.regularPrice - (duplicateDraft.price || 0)) > 0.01) {
            pricingChanges.push(`Regular price: R${(duplicateDraft.price || 0).toFixed(2)} → R${product.regularPrice.toFixed(2)}`);
          }
          if (Math.abs((product.salePrice || 0) - (duplicateDraft.salePrice || 0)) > 0.01) {
            pricingChanges.push(`Sale price: R${(duplicateDraft.salePrice || 0).toFixed(2)} → R${(product.salePrice || 0).toFixed(2)}`);
          }
          if (Math.abs(product.costPrice - (duplicateDraft.costPrice || 0)) > 0.01) {
            pricingChanges.push(`Cost price: R${(duplicateDraft.costPrice || 0).toFixed(2)} → R${product.costPrice.toFixed(2)}`);
          }

          product.isDuplicate = true;
          product.isSelected = false; // Default to deselected for duplicates
          product.hasPriceChanges = pricingChanges.length > 0;
          product.priceChanges = pricingChanges;

          if (pricingChanges.length > 0) {
            warnings.push(`SKU "${product.sku}" exists with pricing differences. Select to update: ${pricingChanges.join(', ')}`);
          } else {
            warnings.push(`SKU "${product.sku}" already exists with identical pricing (Status: ${duplicateDraft.draftStatus})`);
          }
        } else {
          // Check published products for duplicates
          const duplicateProduct = (publishedProducts as any)?.products?.find((prod: any) => 
            prod.sku && prod.sku.toLowerCase() === product.sku.toLowerCase()
          );
          
          if (duplicateProduct) {
            product.existingProduct = {
              id: duplicateProduct.id,
              name: duplicateProduct.name,
              price: duplicateProduct.price || 0,
              salePrice: duplicateProduct.salePrice || 0,
              costPrice: duplicateProduct.costPrice || 0
            };

            const pricingChanges = [];
            if (Math.abs(product.regularPrice - (duplicateProduct.price || 0)) > 0.01) {
              pricingChanges.push(`Regular price: R${(duplicateProduct.price || 0).toFixed(2)} → R${product.regularPrice.toFixed(2)}`);
            }
            if (Math.abs((product.salePrice || 0) - (duplicateProduct.salePrice || 0)) > 0.01) {
              pricingChanges.push(`Sale price: R${(duplicateProduct.salePrice || 0).toFixed(2)} → R${(product.salePrice || 0).toFixed(2)}`);
            }
            if (Math.abs(product.costPrice - (duplicateProduct.costPrice || 0)) > 0.01) {
              pricingChanges.push(`Cost price: R${(duplicateProduct.costPrice || 0).toFixed(2)} → R${product.costPrice.toFixed(2)}`);
            }

            product.isDuplicate = true;
            product.isSelected = false;
            product.hasPriceChanges = pricingChanges.length > 0;
            product.priceChanges = pricingChanges;

            warnings.push(`SKU "${product.sku}" exists in published products. Cannot update published products through mass upload.`);
          } else {
            product.isSelected = true; // Default to selected for non-duplicates
          }
        }
      }

      // Validate pricing (optional warnings)
      if (product.costPrice > 0 && product.regularPrice > 0 && product.costPrice >= product.regularPrice) {
        warnings.push('Cost price should be less than regular price');
      }

      // Set validation results
      product.validationErrors = errors;
      product.validationWarnings = warnings;
      product.isValid = errors.length === 0;

      return product;
    });

    // Calculate validation summary
    const validationResult: ValidationResult = {
      hasErrors: validatedProducts.some(p => p.validationErrors && p.validationErrors.length > 0),
      hasWarnings: validatedProducts.some(p => p.validationWarnings && p.validationWarnings.length > 0),
      totalProducts: validatedProducts.length,
      validProducts: validatedProducts.filter(p => p.isValid).length,
      invalidProducts: validatedProducts.filter(p => !p.isValid).length
    };

    console.log('Validation completed:', validationResult);

    onUpdate({ 
      products: validatedProducts,
      validationResults: validationResult
    });
    setValidationComplete(true);
  };

  const handleRevalidate = () => {
    setValidationComplete(false);
    setTimeout(() => validateProducts(), 100);
  };

  const getValidationIcon = (product: CSVProduct) => {
    if (product.validationErrors && product.validationErrors.length > 0) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else if (product.validationWarnings && product.validationWarnings.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getValidationStatus = (product: CSVProduct) => {
    if (product.validationErrors && product.validationErrors.length > 0) {
      return <span className="text-red-600 text-xs font-medium">Invalid</span>;
    } else if (product.validationWarnings && product.validationWarnings.length > 0) {
      return <span className="text-yellow-600 text-xs font-medium">Warning</span>;
    } else {
      return <span className="text-green-600 text-xs font-medium">Valid</span>;
    }
  };

  if (draftsLoading || productsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Step 4: Validate Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading validation data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4: Validate Products & Check Duplicates</CardTitle>
        <p className="text-sm text-muted-foreground">
          Checking for SKU duplicates and pricing differences. Categories will be assigned in the drafts system.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Summary */}
        {validationComplete && data.validationResults && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {data.validationResults.totalProducts}
                </p>
                <p className="text-sm text-muted-foreground">Total Products</p>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {data.validationResults.validProducts}
                </p>
                <p className="text-sm text-muted-foreground">Valid</p>
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {data.validationResults.invalidProducts}
                </p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {data.products.filter(p => p.validationWarnings && p.validationWarnings.length > 0).length}
                </p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
            </div>
          </div>
        )}

        {/* Validation Status */}
        {data.validationResults && (
          <Alert className={data.validationResults.hasErrors ? 'border-red-200 bg-red-50' : 
                          data.validationResults.hasWarnings ? 'border-yellow-200 bg-yellow-50' : 
                          'border-green-200 bg-green-50'}>
            {data.validationResults.hasErrors ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : data.validationResults.hasWarnings ? (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <AlertDescription>
              {data.validationResults.hasErrors ? (
                <span className="text-red-700">
                  Validation failed. Please fix all errors before proceeding.
                </span>
              ) : data.validationResults.hasWarnings ? (
                <span className="text-yellow-700">
                  Validation passed with warnings. Review and select products to import.
                </span>
              ) : (
                <span className="text-green-700">
                  All products passed validation successfully!
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Results Table */}
        {validationComplete && (
          <div className="border rounded-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium">Validation Results</h3>
              <Button variant="outline" size="sm" onClick={handleRevalidate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Revalidate
              </Button>
            </div>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Select</TableHead>
                    <TableHead className="w-[60px]">Status</TableHead>
                    <TableHead className="w-[100px]">SKU</TableHead>
                    <TableHead>Product Title</TableHead>
                    <TableHead>Duplicate Status</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Checkbox
                          checked={product.isSelected || false}
                          onCheckedChange={(checked) => {
                            const updatedProducts = [...data.products];
                            updatedProducts[index] = {
                              ...updatedProducts[index],
                              isSelected: checked as boolean
                            };
                            onUpdate({ products: updatedProducts });
                          }}
                          disabled={product.isValid === false}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getValidationIcon(product)}
                          {getValidationStatus(product)}
                        </div>
                      </TableCell>
                      
                      <TableCell className="font-mono text-sm">
                        {product.sku}
                      </TableCell>
                      
                      <TableCell>
                        <p className="font-medium">{product.title}</p>
                      </TableCell>
                      
                      <TableCell>
                        {product.isDuplicate ? (
                          <div className="space-y-2">
                            <Badge variant="destructive" className="text-xs">
                              Duplicate {product.existingDraft ? `(Draft: ${product.existingDraft.draftStatus})` : '(Published)'}
                            </Badge>
                            {product.hasPriceChanges && product.priceChanges && (
                              <div className="text-xs space-y-1">
                                <div className="font-medium text-orange-700">Price Changes:</div>
                                {product.priceChanges.map((change, idx) => (
                                  <div key={idx} className="text-xs text-gray-600">{change}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="default" className="text-xs">
                            New Product
                          </Badge>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {product.validationErrors && product.validationErrors.length > 0 ? (
                          <div className="space-y-1">
                            {product.validationErrors.map((error, idx) => (
                              <div key={idx} className="text-xs text-red-600 flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                {error}
                              </div>
                            ))}
                          </div>
                        ) : product.validationWarnings && product.validationWarnings.length > 0 ? (
                          <div className="space-y-1">
                            {product.validationWarnings.map((warning, idx) => (
                              <div key={idx} className="text-xs text-yellow-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {warning}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Valid
                          </div>
                        )}
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
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button 
            onClick={onNext}
            disabled={!validationComplete || (data.validationResults?.hasErrors ?? true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Next Step
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}