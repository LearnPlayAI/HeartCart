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
    console.log('Existing drafts data:', existingDrafts);
    console.log('Published products data:', publishedProducts);
    
    // Extract drafts from API response
    const draftsArray = (existingDrafts as any)?.data?.drafts || (existingDrafts as any)?.drafts || [];
    const productsArray = (publishedProducts as any)?.data || (publishedProducts as any) || [];
    
    console.log('Drafts array length:', draftsArray.length);
    console.log('Products array length:', productsArray.length);
    
    // Debug: Check if DM9317 exists in either collection
    const dm9317InDrafts = draftsArray.find((d: any) => d.sku?.toLowerCase().includes('9317'));
    const dm9317InProducts = productsArray.find((p: any) => p.sku?.toLowerCase().includes('9317'));
    
    console.log('🔍 DM9317 search results:');
    console.log('- In drafts:', dm9317InDrafts ? `Found: ${dm9317InDrafts.sku}` : 'NOT FOUND');
    console.log('- In products:', dm9317InProducts ? `Found: ${dm9317InProducts.sku}` : 'NOT FOUND');
    
    // Log first few SKUs from each collection
    console.log('Sample draft SKUs:', draftsArray.slice(0, 5).map((d: any) => d.sku));
    console.log('Sample product SKUs:', productsArray.slice(0, 5).map((p: any) => p.sku));

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

      // Check for SKU duplicates in drafts (with partial matching)
      if (product.sku && product.sku.trim()) {
        const productSku = product.sku.toLowerCase().trim();
        
        // Find exact match or partial matches in draft SKUs
        const duplicateDraft = draftsArray.find((draft: any) => {
          if (!draft.sku) return false;
          
          const draftSku = draft.sku.toLowerCase().trim();
          
          // Log the comparison for debugging - especially for DM9317
          if (productSku === 'dm9317' || draftSku.includes('9317')) {
            console.log(`🔍 DEBUGGING DM9317: Comparing product SKU "${productSku}" with draft SKU "${draftSku}"`);
          } else {
            console.log(`Comparing product SKU "${productSku}" with draft SKU "${draftSku}"`);
          }
          
          // Check for exact match
          if (draftSku === productSku) {
            console.log(`✓ Exact match found: ${productSku} === ${draftSku}`);
            return true;
          }
          
          // Parse multiple SKUs from draft (patterns like "DM6666=red,DM7777=blue")
          const draftSkus = draftSku.split(',').map((s: string) => {
            // Extract SKU part before '=' if present
            const skuPart = s.split('=')[0].trim();
            return skuPart;
          });
          
          console.log(`Draft SKU parsed: "${draftSku}" → [${draftSkus.join(', ')}]`);
          
          // Check if any draft SKU matches the product SKU
          for (const sku of draftSkus) {
            if (sku === productSku) {
              console.log(`✓ Pattern match found: product "${productSku}" === parsed draft SKU "${sku}"`);
              return true;
            }
            // Also check partial matches for complex SKUs
            if (sku.length > 3 && productSku.length > 3) {
              if (sku.includes(productSku) || productSku.includes(sku)) {
                console.log(`✓ Substring match found: "${productSku}" ~ "${sku}"`);
                return true;
              }
            }
          }
          
          // Also check if product SKU contains multiple SKUs (reverse check)
          const productSkus = productSku.split(',').map((s: string) => {
            const skuPart = s.split('=')[0].trim();
            return skuPart;
          });
          
          if (productSkus.length > 1) {
            console.log(`Product SKU parsed: "${productSku}" → [${productSkus.join(', ')}]`);
          }
          
          // Check for any matches between product SKUs and draft SKUs
          for (const pSku of productSkus) {
            for (const dSku of draftSkus) {
              if (pSku === dSku) {
                console.log(`✓ Multi-pattern match found: product "${pSku}" === draft "${dSku}"`);
                return true;
              }
              // Check partial matches for complex multi-SKU patterns
              if (pSku.length > 3 && dSku.length > 3) {
                if (pSku.includes(dSku) || dSku.includes(pSku)) {
                  console.log(`✓ Multi-pattern substring match: "${pSku}" ~ "${dSku}"`);
                  return true;
                }
              }
            }
          }
          
          return false;
        });
        
        if (duplicateDraft) {
          console.log(`✓ Step 1: SKU match found for ${product.sku} with draft ${duplicateDraft.sku}`);
          
          // Store existing draft data for pricing comparison with proper type conversion
          const draftPrice = parseFloat(duplicateDraft.price) || 0;
          const draftSalePrice = parseFloat(duplicateDraft.salePrice) || 0;
          const draftCostPrice = parseFloat(duplicateDraft.costPrice) || 0;
          
          product.existingDraft = {
            id: duplicateDraft.id,
            name: duplicateDraft.name,
            price: draftPrice,
            salePrice: draftSalePrice,
            costPrice: draftCostPrice,
            draftStatus: duplicateDraft.draftStatus
          };

          // Step 2: Compare pricing to detect differences
          const pricingChanges = [];
          if (Math.abs(product.regularPrice - draftPrice) > 0.01) {
            pricingChanges.push(`Regular price: R${draftPrice.toFixed(2)} → R${product.regularPrice.toFixed(2)}`);
          }
          if (Math.abs((product.salePrice || 0) - draftSalePrice) > 0.01) {
            pricingChanges.push(`Sale price: R${draftSalePrice.toFixed(2)} → R${(product.salePrice || 0).toFixed(2)}`);
          }
          if (Math.abs(product.costPrice - draftCostPrice) > 0.01) {
            pricingChanges.push(`Cost price: R${draftCostPrice.toFixed(2)} → R${product.costPrice.toFixed(2)}`);
          }

          console.log(`✓ Step 2: Price comparison for ${product.sku} - ${pricingChanges.length} differences found`);

          // Mark as duplicate regardless of pricing differences
          product.isDuplicate = true;
          product.isSelected = false; // Default to deselected for duplicates
          product.hasPriceChanges = pricingChanges.length > 0;
          product.priceChanges = pricingChanges;

          if (pricingChanges.length > 0) {
            warnings.push(`SKU "${product.sku}" matches existing draft "${duplicateDraft.sku}" with pricing differences. Select to update: ${pricingChanges.join(', ')}`);
          } else {
            warnings.push(`SKU "${product.sku}" matches existing draft "${duplicateDraft.sku}" with identical pricing (Status: ${duplicateDraft.draftStatus})`);
          }
          
          console.log(`✓ Marked product ${product.sku} as duplicate:`, {
            isDuplicate: product.isDuplicate,
            hasWarnings: warnings.length > 0,
            warnings: warnings
          });
        } else {
          // Check published products for duplicates (with partial matching)
          const duplicateProduct = productsArray.find((prod: any) => {
            if (!prod.sku) return false;
            
            const publishedSku = prod.sku.toLowerCase().trim();
            
            // Debug DM9317 specifically
            if (productSku === 'dm9317' || publishedSku.includes('9317')) {
              console.log(`🔍 DEBUGGING DM9317: Comparing product SKU "${productSku}" with published SKU "${publishedSku}"`);
            }
            
            // Check for exact match
            if (publishedSku === productSku) {
              console.log(`✓ Exact match found with published product: ${productSku} === ${publishedSku}`);
              return true;
            }
            
            // Parse multiple SKUs from published product (patterns like "DM6666=red,DM7777=blue")
            const publishedSkus = publishedSku.split(',').map((s: string) => {
              // Extract SKU part before '=' if present
              const skuPart = s.split('=')[0].trim();
              return skuPart;
            });
            
            console.log(`Published SKU parsed: "${publishedSku}" → [${publishedSkus.join(', ')}]`);
            
            // Check if any published SKU matches the product SKU
            for (const sku of publishedSkus) {
              if (sku === productSku) {
                console.log(`✓ Pattern match found: product "${productSku}" === parsed published SKU "${sku}"`);
                return true;
              }
              // Also check partial matches for complex SKUs
              if (sku.length > 3 && productSku.length > 3) {
                if (sku.includes(productSku) || productSku.includes(sku)) {
                  console.log(`✓ Substring match found: "${productSku}" ~ "${sku}"`);
                  return true;
                }
              }
            }
            
            // Also check if product SKU contains multiple SKUs (reverse check)
            const productSkus = productSku.split(',').map((s: string) => {
              const skuPart = s.split('=')[0].trim();
              return skuPart;
            });
            
            if (productSkus.length > 1) {
              console.log(`Product SKU parsed: "${productSku}" → [${productSkus.join(', ')}]`);
            }
            
            // Check for any matches between product SKUs and published SKUs
            for (const pSku of productSkus) {
              for (const pubSku of publishedSkus) {
                if (pSku === pubSku) {
                  console.log(`✓ Multi-pattern match found: product "${pSku}" === published "${pubSku}"`);
                  return true;
                }
                // Check partial matches for complex multi-SKU patterns
                if (pSku.length > 3 && pubSku.length > 3) {
                  if (pSku.includes(pubSku) || pubSku.includes(pSku)) {
                    console.log(`✓ Multi-pattern substring match: "${pSku}" ~ "${pubSku}"`);
                    return true;
                  }
                }
              }
            }
            
            return false;
          });
          
          if (duplicateProduct) {
            console.log(`✓ Step 1: SKU match found for ${product.sku} with published product ${duplicateProduct.sku}`);
            
            // Store existing product data for pricing comparison with proper type conversion
            const productPrice = parseFloat(duplicateProduct.price) || 0;
            const productSalePrice = parseFloat(duplicateProduct.salePrice) || 0;
            const productCostPrice = parseFloat(duplicateProduct.costPrice) || 0;
            
            product.existingProduct = {
              id: duplicateProduct.id,
              name: duplicateProduct.name,
              price: productPrice,
              salePrice: productSalePrice,
              costPrice: productCostPrice
            };

            // Step 2: Compare pricing to detect differences  
            const pricingChanges = [];
            if (Math.abs(product.regularPrice - productPrice) > 0.01) {
              pricingChanges.push(`Regular price: R${productPrice.toFixed(2)} → R${product.regularPrice.toFixed(2)}`);
            }
            if (Math.abs((product.salePrice || 0) - productSalePrice) > 0.01) {
              pricingChanges.push(`Sale price: R${productSalePrice.toFixed(2)} → R${(product.salePrice || 0).toFixed(2)}`);
            }
            if (Math.abs(product.costPrice - productCostPrice) > 0.01) {
              pricingChanges.push(`Cost price: R${productCostPrice.toFixed(2)} → R${product.costPrice.toFixed(2)}`);
            }

            console.log(`✓ Step 2: Price comparison for ${product.sku} with published product - ${pricingChanges.length} differences found`);

            // Mark as duplicate regardless of pricing differences
            product.isDuplicate = true;
            product.isSelected = false;
            product.hasPriceChanges = pricingChanges.length > 0;
            product.priceChanges = pricingChanges;

            warnings.push(`SKU "${product.sku}" matches published product "${duplicateProduct.sku}". Cannot update published products through mass upload.`);
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

      console.log(`Final product state for ${product.sku}:`, {
        isDuplicate: product.isDuplicate,
        isValid: product.isValid,
        hasErrors: errors.length,
        hasWarnings: warnings.length,
        warnings: warnings,
        existingDraft: !!product.existingDraft
      });

      return product;
    });

    // Calculate validation summary with proper duplicate and error counts
    const duplicateProducts = validatedProducts.filter(p => p.isDuplicate);
    const errorProducts = validatedProducts.filter(p => p.validationErrors && p.validationErrors.length > 0);
    const validProducts = validatedProducts.filter(p => p.isValid && !p.isDuplicate && (!p.validationErrors || p.validationErrors.length === 0));
    
    const validationResult: ValidationResult = {
      hasErrors: errorProducts.length > 0,
      hasWarnings: validatedProducts.some(p => p.validationWarnings && p.validationWarnings.length > 0),
      totalProducts: validatedProducts.length,
      validProducts: validProducts.length,
      invalidProducts: errorProducts.length
    };

    console.log('Validation completed:', {
      ...validationResult,
      duplicateCount: duplicateProducts.length,
      errorCount: errorProducts.length,
      validCount: validProducts.length
    });

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
    } else if (product.isDuplicate) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    } else if (product.validationWarnings && product.validationWarnings.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getValidationStatus = (product: CSVProduct) => {
    if (product.validationErrors && product.validationErrors.length > 0) {
      return <span className="text-red-600 text-xs font-medium">Invalid</span>;
    } else if (product.isDuplicate) {
      return <span className="text-orange-600 text-xs font-medium">Duplicate</span>;
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
          <div className="grid grid-cols-5 gap-3">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {data.validationResults.totalProducts}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
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
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {data.products.filter(p => p.isDuplicate).length}
                </p>
                <p className="text-sm text-muted-foreground">Duplicates</p>
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
                  {data.products.filter(p => p.validationWarnings && p.validationWarnings.length > 0 && !p.isDuplicate).length}
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
                  {data.products.map((product, index) => {
                    // Debug duplicate products in UI
                    if (product.isDuplicate) {
                      console.log(`UI Rendering duplicate product ${product.sku}:`, {
                        isDuplicate: product.isDuplicate,
                        isValid: product.isValid,
                        hasWarnings: !!product.validationWarnings?.length,
                        warnings: product.validationWarnings
                      });
                    }
                    
                    return (
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
                  );
                  })}
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