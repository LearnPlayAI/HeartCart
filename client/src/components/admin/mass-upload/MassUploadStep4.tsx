import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Loader2, CheckCircle, AlertTriangle, XCircle, ArrowLeft, RefreshCw, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MassUploadData, CSVProduct } from '@/pages/admin/mass-upload';
import { apiRequest } from '@/lib/queryClient';
import { slugify } from '@/lib/utils';

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
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  
  // Category creation state - exactly as in admin categories page
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newLevel, setNewLevel] = useState<number>(0);
  const [newDisplayOrder, setNewDisplayOrder] = useState<number>(0);

  // Fetch categories
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      return response.json();
    },
  });

  // Fetch existing products for duplicate checking and price comparison
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products', 'all-skus-with-pricing'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/products?fields=sku,name,price,salePrice,costPrice&limit=10000');
      return response.json();
    },
  });

  const categories = categoriesData?.data || [];
  const existingProducts = productsData?.data || [];

  // Auto-increment display order logic - same as admin categories page
  useEffect(() => {
    if (categories && categories.length > 0) {
      // If parent is selected, find the max display order among its children
      if (newParentId) {
        const parentIdNum = parseInt(newParentId);
        const siblingCategories = categories.filter(c => c.parentId === parentIdNum);
        if (siblingCategories.length > 0) {
          const maxOrder = Math.max(...siblingCategories.map(c => c.displayOrder || 0));
          setNewDisplayOrder(maxOrder + 1);
          return;
        }
      }
      
      // Otherwise, for level 0 categories
      const levelZeroCategories = categories.filter(c => c.level === 0);
      if (levelZeroCategories.length > 0) {
        const maxOrder = Math.max(...levelZeroCategories.map(c => c.displayOrder || 0));
        setNewDisplayOrder(maxOrder + 1);
      } else {
        setNewDisplayOrder(0);
      }
    }
  }, [categories, newParentId]);

  // Auto-update level based on parent selection
  useEffect(() => {
    if (newParentId) {
      const parentCategory = categories?.find(c => c.id === parseInt(newParentId));
      if (parentCategory) {
        setNewLevel((parentCategory.level || 0) + 1);
      }
    } else {
      setNewLevel(0);
    }
  }, [newParentId, categories]);

  // Auto-generate slug based on parent-child relationship
  useEffect(() => {
    if (newName) {
      let generatedSlug = '';
      
      if (newParentId) {
        // If there's a parent, combine parent slug with child name
        const parentCategory = categories?.find(c => c.id === parseInt(newParentId));
        if (parentCategory && parentCategory.slug) {
          generatedSlug = `${parentCategory.slug}-${slugify(newName)}`;
        } else {
          generatedSlug = slugify(newName);
        }
      } else {
        // If no parent, just use the name
        generatedSlug = slugify(newName);
      }
      
      setNewSlug(generatedSlug);
    } else {
      setNewSlug('');
    }
  }, [newName, newParentId, categories]);

  // Create category mutation - exactly as in admin categories page
  const createMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      slug: string; 
      description: string; 
      parentId: number | null; 
      level: number; 
      displayOrder: number;
    }) => {
      const response = await apiRequest('POST', '/api/categories', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories/main/with-children'] });
      setIsCreateDialogOpen(false);
      setNewName("");
      setNewSlug("");
      setNewDescription("");
      setNewParentId(null);
      setNewLevel(0);
      setNewDisplayOrder(0);
      
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Category",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle create category - exactly as in admin categories page
  const handleCreateCategory = () => {
    if (!newName) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive"
      });
      return;
    }
    
    createMutation.mutate({
      name: newName,
      slug: newSlug || slugify(newName),
      description: newDescription,
      parentId: newParentId ? parseInt(newParentId) : null,
      level: newLevel,
      displayOrder: newDisplayOrder
    });
  };

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

        // Check for duplicate SKU and store existing product data for price comparison
        const duplicateSku = existingProducts.find((p: any) => 
          p.sku && product.sku && p.sku.toLowerCase() === product.sku.toLowerCase()
        );
        if (duplicateSku) {
          // Store existing product data for price comparison
          product.existingProduct = {
            id: duplicateSku.id,
            name: duplicateSku.name,
            price: duplicateSku.price,
            salePrice: duplicateSku.salePrice,
            costPrice: duplicateSku.costPrice
          };

          // Check for price differences
          const hasRegularPriceChange = Math.abs(duplicateSku.price - product.regularPrice) > 0.01;
          const hasSalePriceChange = Math.abs((duplicateSku.salePrice || 0) - (product.salePrice || 0)) > 0.01;
          const hasCostPriceChange = Math.abs(duplicateSku.costPrice - product.costPrice) > 0.01;
          
          product.hasPriceChanges = hasRegularPriceChange || hasSalePriceChange || hasCostPriceChange;

          if (product.hasPriceChanges) {
            warnings.push(`Product with SKU "${product.sku}" exists with different pricing. You can choose to update the prices.`);
            // Initialize price update options to false by default
            product.priceUpdateOptions = {
              updateRegularPrice: false,
              updateSalePrice: false,
              updateCostPrice: false
            };
          } else {
            errors.push(`Product with SKU "${product.sku}" already exists with identical pricing`);
          }
        }

        // Check for duplicate name
        const duplicateName = existingProducts.find((p: any) => 
          p.name && product.title && p.name.toLowerCase() === product.title.toLowerCase()
        );
        if (duplicateName) {
          warnings.push(`Product with similar name "${product.title}" already exists`);
        }

        // Validate parent category - find by name and no parentId (main category)
        const parentCategory = categories.find((c: any) => 
          c.name.toLowerCase() === product.parentCategory.toLowerCase() && !c.parentId
        );
        if (!parentCategory) {
          errors.push(`Parent category "${product.parentCategory}" not found`);
        } else {
          product.parentCategoryId = parentCategory.id;
        }

        // Validate child category - find by name and parentId matching the parent
        const childCategory = categories.find((c: any) => 
          c.name.toLowerCase() === product.childCategory.toLowerCase() && 
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
        
      } else {
        
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
              <div className="flex gap-2">
                <Button 
                  className="space-x-2"
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setNewName("");
                    setNewSlug("");
                    setNewDescription("");
                    setNewParentId(null);
                    setNewLevel(0);
                    setNewDisplayOrder(0);
                    setIsCreateDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Category</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleRevalidate}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Revalidate
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Status</TableHead>
                    <TableHead className="w-[100px]">SKU</TableHead>
                    <TableHead>Product Title</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Price Comparison</TableHead>
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
                        {product.existingProduct ? (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-blue-600">Product Exists</div>
                            {product.hasPriceChanges ? (
                              <div className="space-y-2 p-2 border rounded bg-yellow-50">
                                <div className="text-xs font-medium text-yellow-700">Price Changes Detected:</div>
                                
                                {/* Regular Price Comparison */}
                                {Math.abs(product.existingProduct.price - product.regularPrice) > 0.01 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <div>
                                      <div>Regular: R{product.existingProduct.price.toFixed(2)} → R{product.regularPrice.toFixed(2)}</div>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={product.priceUpdateOptions?.updateRegularPrice || false}
                                      onChange={(e) => {
                                        const updatedProducts = data.products.map(p => 
                                          p.sku === product.sku 
                                            ? { ...p, priceUpdateOptions: { ...p.priceUpdateOptions, updateRegularPrice: e.target.checked } }
                                            : p
                                        );
                                        onUpdate({ products: updatedProducts });
                                      }}
                                      className="h-3 w-3"
                                    />
                                  </div>
                                )}
                                
                                {/* Sale Price Comparison */}
                                {Math.abs((product.existingProduct.salePrice || 0) - (product.salePrice || 0)) > 0.01 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <div>
                                      <div>Sale: R{(product.existingProduct.salePrice || 0).toFixed(2)} → R{(product.salePrice || 0).toFixed(2)}</div>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={product.priceUpdateOptions?.updateSalePrice || false}
                                      onChange={(e) => {
                                        const updatedProducts = data.products.map(p => 
                                          p.sku === product.sku 
                                            ? { ...p, priceUpdateOptions: { ...p.priceUpdateOptions, updateSalePrice: e.target.checked } }
                                            : p
                                        );
                                        onUpdate({ products: updatedProducts });
                                      }}
                                      className="h-3 w-3"
                                    />
                                  </div>
                                )}
                                
                                {/* Cost Price Comparison */}
                                {Math.abs(product.existingProduct.costPrice - product.costPrice) > 0.01 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <div>
                                      <div>Cost: R{product.existingProduct.costPrice.toFixed(2)} → R{product.costPrice.toFixed(2)}</div>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={product.priceUpdateOptions?.updateCostPrice || false}
                                      onChange={(e) => {
                                        const updatedProducts = data.products.map(p => 
                                          p.sku === product.sku 
                                            ? { ...p, priceUpdateOptions: { ...p.priceUpdateOptions, updateCostPrice: e.target.checked } }
                                            : p
                                        );
                                        onUpdate({ products: updatedProducts });
                                      }}
                                      className="h-3 w-3"
                                    />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-green-600">Identical pricing</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">New Product</div>
                        )}
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

        {/* Create Category Dialog - exactly as in admin categories page */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Add a new category to organize your products.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name*</Label>
                <Input 
                  id="name" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  placeholder="Category Name" 
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="parent">Parent Category</Label>
                <Select value={newParentId || "none"} onValueChange={(value) => setNewParentId(value === "none" ? null : value)}>
                  <SelectTrigger id="parent">
                    <SelectValue placeholder="No Parent (Main Category)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent (Main Category)</SelectItem>
                    {categories?.filter(cat => cat.level === 0).map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Current level: {newLevel} {newLevel === 0 ? "(Main Category)" : "(Subcategory)"}
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug</Label>
                <Input 
                  id="slug" 
                  value={newSlug} 
                  readOnly
                  className="bg-gray-50"
                />
                <p className="text-sm text-muted-foreground">
                  Auto-generated based on parent category and name (e.g., parent-slug-child-name).
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input 
                  id="displayOrder" 
                  type="number" 
                  value={newDisplayOrder} 
                  readOnly
                  className="bg-gray-50"
                />
                <p className="text-sm text-muted-foreground">
                  Auto-calculated based on existing categories at the same level.
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={newDescription} 
                  onChange={(e) => setNewDescription(e.target.value)} 
                  placeholder="Category description" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleCreateCategory} 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}