import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  // Fetch categories
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      return response.json();
    },
  });

  // Fetch existing products for duplicate checking
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products', 'all-skus'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/products?fields=sku,name&limit=10000');
      return response.json();
    },
  });

  const categories = categoriesData?.data || [];
  const existingProducts = productsData?.data || [];

  useEffect(() => {
    if (!isLoadingCategories && !isLoadingProducts && !validationComplete) {
      runValidation();
    }
  }, [isLoadingCategories, isLoadingProducts]);

  const runValidation = async () => {
    if (isLoadingCategories || isLoadingProducts) return;
    
    setIsValidating(true);
    
    try {
      const validatedProducts = data.products.map(product => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for duplicate SKU
        const duplicateSku = existingProducts.find((p: any) => 
          p.sku && product.sku && p.sku.toLowerCase() === product.sku.toLowerCase()
        );
        if (duplicateSku) {
          errors.push(`Product with SKU "${product.sku}" already exists`);
        }

        // Check for duplicate name
        const duplicateName = existingProducts.find((p: any) => 
          p.name && product.title && p.name.toLowerCase() === product.title.toLowerCase()
        );
        if (duplicateName) {
          warnings.push(`Product with similar name "${product.title}" already exists`);
        }

        // Validate parent category
        const parentCategory = categories.find((c: any) => 
          c.name.toLowerCase() === product.parentCategory.toLowerCase() && c.level === 0
        );
        if (!parentCategory) {
          errors.push(`Parent category "${product.parentCategory}" not found`);
        } else {
          product.parentCategoryId = parentCategory.id;
        }

        // Validate child category
        const childCategory = categories.find((c: any) => 
          c.name.toLowerCase() === product.childCategory.toLowerCase() && 
          c.level === 1 && 
          c.parentId === parentCategory?.id
        );
        if (!childCategory && parentCategory) {
          errors.push(`Child category "${product.childCategory}" not found under "${product.parentCategory}"`);
        } else if (childCategory) {
          product.childCategoryId = childCategory.id;
        }

        // Validate pricing
        if (product.costPrice >= product.regularPrice) {
          warnings.push('Cost price should be less than regular price');
        }

        if (product.salePrice > 0 && product.salePrice >= product.regularPrice) {
          warnings.push('Sale price should be less than regular price');
        }

        // Check URL format
        if (!product.productUrl.startsWith('http')) {
          warnings.push('Product URL should start with http or https');
        }

        return {
          ...product,
          validationErrors: errors,
          validationWarnings: warnings,
          isValid: errors.length === 0,
        };
      });

      const validationResult: ValidationResult = {
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

      setValidationComplete(true);
      
      if (validationResult.hasErrors) {
        toast({
          title: 'Validation Issues Found',
          description: `${validationResult.invalidProducts} products have validation errors that need to be fixed.`,
          variant: 'destructive',
        });
      } else if (validationResult.hasWarnings) {
        toast({
          title: 'Validation Warnings',
          description: `All products passed validation, but there are ${validatedProducts.filter(p => p.validationWarnings!.length > 0).length} warnings to review.`,
        });
      } else {
        toast({
          title: 'Validation Passed',
          description: 'All products passed validation successfully!',
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: 'Validation Failed',
        description: 'Failed to validate products. Please try again.',
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

  if (isLoadingCategories || isLoadingProducts) {
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
              <p>Loading categories and existing products...</p>
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
          Checking for duplicate products and validating category assignments.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Summary */}
        {data.validationResults && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{data.validationResults.totalProducts}</p>
                <p className="text-sm text-muted-foreground">Total Products</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{data.validationResults.validProducts}</p>
                <p className="text-sm text-muted-foreground">Valid Products</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{data.validationResults.invalidProducts}</p>
                <p className="text-sm text-muted-foreground">Invalid Products</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
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
                  Validation passed with warnings. Review warnings in the next step.
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
                    <TableHead className="w-[60px]">Status</TableHead>
                    <TableHead className="w-[100px]">SKU</TableHead>
                    <TableHead>Product Title</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((product, index) => (
                    <TableRow key={index}>
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
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={product.parentCategoryId ? "default" : "destructive"} className="text-xs">
                              {product.parentCategory}
                            </Badge>
                            {!product.parentCategoryId && <XCircle className="h-3 w-3 text-red-500" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={product.childCategoryId ? "secondary" : "destructive"} className="text-xs">
                              {product.childCategory}
                            </Badge>
                            {!product.childCategoryId && <XCircle className="h-3 w-3 text-red-500" />}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {product.validationErrors?.map((error, i) => (
                            <div key={i} className="flex items-center gap-1 text-red-600 text-sm">
                              <XCircle className="h-3 w-3" />
                              <span>{error}</span>
                            </div>
                          ))}
                          {product.validationWarnings?.map((warning, i) => (
                            <div key={i} className="flex items-center gap-1 text-yellow-600 text-sm">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{warning}</span>
                            </div>
                          ))}
                          {(!product.validationErrors?.length && !product.validationWarnings?.length) && (
                            <div className="flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle className="h-3 w-3" />
                              <span>No issues</span>
                            </div>
                          )}
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
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!validationComplete || (data.validationResults?.hasErrors ?? true)}
          >
            {data.validationResults?.hasErrors ? 'Fix Errors First' : 'Continue to Adjustments'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}