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
import { Checkbox } from '@/components/ui/checkbox';
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
  duplicateProducts: number;
  selectedProducts: number;
}

export function MassUploadStep4({ data, onUpdate, onNext, onPrevious }: MassUploadStep4Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  
  // Category creation state
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

  // Fetch existing draft records for duplicate checking
  const { data: draftsData, isLoading: isLoadingDrafts } = useQuery({
    queryKey: ['/api/product-drafts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/product-drafts');
      return response.json();
    },
  });

  const categories = categoriesData?.data || [];
  const existingDrafts = draftsData?.data || [];

  // Auto-increment display order logic
  useEffect(() => {
    if (categories && categories.length > 0) {
      if (newParentId) {
        const parentIdNum = parseInt(newParentId);
        const siblingCategories = categories.filter((c: any) => c.parentId === parentIdNum);
        if (siblingCategories.length > 0) {
          const maxOrder = Math.max(...siblingCategories.map((c: any) => c.displayOrder || 0));
          setNewDisplayOrder(maxOrder + 1);
          return;
        }
      }
      
      const levelZeroCategories = categories.filter((c: any) => c.level === 0);
      if (levelZeroCategories.length > 0) {
        const maxOrder = Math.max(...levelZeroCategories.map((c: any) => c.displayOrder || 0));
        setNewDisplayOrder(maxOrder + 1);
      } else {
        setNewDisplayOrder(0);
      }
    }
  }, [categories, newParentId]);

  // Auto-update level based on parent selection
  useEffect(() => {
    if (newParentId) {
      const parentCategory = categories?.find((c: any) => c.id === parseInt(newParentId));
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
        const parentCategory = categories?.find((c: any) => c.id === parseInt(newParentId));
        if (parentCategory && parentCategory.slug) {
          generatedSlug = `${parentCategory.slug}-${slugify(newName)}`;
        } else {
          generatedSlug = slugify(newName);
        }
      } else {
        generatedSlug = slugify(newName);
      }
      
      setNewSlug(generatedSlug);
    } else {
      setNewSlug('');
    }
  }, [newName, newParentId, categories]);

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      slug: string; 
      description: string; 
      parentId: number | null; 
      level: number; 
      displayOrder: number; 
    }) => {
      const response = await apiRequest('POST', '/api/categories', {
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsCreateDialogOpen(false);
      setNewName("");
      setNewSlug("");
      setNewDescription("");
      setNewParentId(null);
      setNewLevel(0);
      setNewDisplayOrder(0);
      toast({
        title: "Success",
        description: "Category created successfully",
      });
      
      // Re-run validation after creating category
      setValidationComplete(false);
    },
    onError: (error: any) => {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle create category
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
    if (!isLoadingCategories && !isLoadingDrafts && !validationComplete) {
      runValidation();
    }
  }, [isLoadingCategories, isLoadingDrafts]);

  const runValidation = async () => {
    if (isLoadingCategories || isLoadingDrafts) return;
    
    setIsValidating(true);
    
    try {
      const validatedProducts = data.products.map(product => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for duplicate SKU in existing drafts
        const duplicateDraft = existingDrafts.find((draft: any) => 
          draft.sku && product.sku && draft.sku.toLowerCase() === product.sku.toLowerCase()
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

          // Mark as duplicate and allow user to deselect
          product.isDuplicate = true;
          product.isSelected = false; // Default to deselected for duplicates
          warnings.push(`Product with SKU "${product.sku}" already has a draft record (Status: ${duplicateDraft.draftStatus}). You can choose to upload anyway or skip this duplicate.`);
        } else {
          product.isSelected = true; // Default to selected for non-duplicates
        }

        // Check for duplicate name in existing drafts
        const duplicateName = existingDrafts.find((draft: any) => 
          draft.name && product.title && draft.name.toLowerCase() === product.title.toLowerCase()
        );
        if (duplicateName && !duplicateDraft) {
          warnings.push(`Product with similar name "${product.title}" already has a draft record`);
        }

        // Helper function to normalize text for comparison
        const normalizeText = (text: string): string => {
          return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/�/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        };

        // Helper function to find category with fuzzy matching
        const findCategoryByName = (searchName: string, parentId?: number | null): any => {
          const normalizedSearch = normalizeText(searchName);
          
          const availableCategories = parentId 
            ? categories.filter((c: any) => c.parentId === parentId)
            : categories.filter((c: any) => c.level === 0);

          // First try exact match
          let exactMatch = availableCategories.find((cat: any) => 
            normalizeText(cat.name) === normalizedSearch
          );
          if (exactMatch) return exactMatch;

          // Then try partial match
          let partialMatch = availableCategories.find((cat: any) => 
            normalizeText(cat.name).includes(normalizedSearch) || 
            normalizedSearch.includes(normalizeText(cat.name))
          );
          if (partialMatch) return partialMatch;

          return null;
        };

        // Validate parent category
        const parentCategory = findCategoryByName(product.parentCategory);
        if (!parentCategory) {
          errors.push(`Parent category "${product.parentCategory}" not found`);
        } else {
          product.parentCategoryId = parentCategory.id;
        }

        // Validate child category
        const childCategory = findCategoryByName(product.childCategory, parentCategory?.id);
        if (!childCategory && parentCategory) {
          errors.push(`Child category "${product.childCategory}" not found under "${product.parentCategory}"`);
        } else if (childCategory) {
          product.childCategoryId = childCategory.id;
        }

        return {
          ...product,
          validationErrors: errors,
          validationWarnings: warnings,
          isValid: errors.length === 0,
        };
      });

      const duplicateCount = validatedProducts.filter(p => p.isDuplicate).length;
      const selectedCount = validatedProducts.filter(p => p.isSelected).length;

      const validationResult: ValidationResult = {
        hasErrors: validatedProducts.some(p => p.validationErrors!.length > 0),
        hasWarnings: validatedProducts.some(p => p.validationWarnings!.length > 0),
        totalProducts: validatedProducts.length,
        validProducts: validatedProducts.filter(p => p.isValid).length,
        invalidProducts: validatedProducts.filter(p => !p.isValid).length,
        duplicateProducts: duplicateCount,
        selectedProducts: selectedCount,
      };

      onUpdate({
        products: validatedProducts,
        validationResults: validationResult,
      });

      setValidationComplete(true);
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Validation Error",
        description: "Failed to validate products. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsValidating(false);
  };

  const handleRevalidate = () => {
    setValidationComplete(false);
    runValidation();
  };

  const handleNext = () => {
    if (data.validationResults?.hasErrors) {
      toast({
        title: 'Validation Errors',
        description: 'Please fix all validation errors before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    // Check if any products are selected
    const selectedProducts = data.products.filter(p => p.isSelected);
    if (selectedProducts.length === 0) {
      toast({
        title: 'No Products Selected',
        description: 'Please select at least one product to upload.',
        variant: 'destructive',
      });
      return;
    }

    onNext();
  };

  const handleSelectAll = () => {
    const updatedProducts = data.products.map(product => ({
      ...product,
      isSelected: true
    }));
    onUpdate({ products: updatedProducts });
  };

  const handleDeselectAll = () => {
    const updatedProducts = data.products.map(product => ({
      ...product,
      isSelected: false
    }));
    onUpdate({ products: updatedProducts });
  };

  const handleDeselectDuplicates = () => {
    const updatedProducts = data.products.map(product => ({
      ...product,
      isSelected: product.isDuplicate ? false : product.isSelected
    }));
    onUpdate({ products: updatedProducts });
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

  if (isLoadingCategories || isLoadingDrafts) {
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
              <p>Loading categories and existing draft records...</p>
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
          Step 4: Validation & Duplicate Detection
        </CardTitle>
        <p className="text-muted-foreground">
          Checking for duplicate draft records and validating category assignments.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Summary */}
        {data.validationResults && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                <p className="text-2xl font-bold">{data.validationResults.selectedProducts}</p>
                <p className="text-sm text-muted-foreground">Selected</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{data.validationResults.duplicateProducts}</p>
                <p className="text-sm text-muted-foreground">Duplicates</p>
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
          </div>
        )}

        {/* Selection Controls */}
        {validationComplete && data.validationResults && data.validationResults.duplicateProducts > 0 && (
          <div className="flex gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">Duplicate Management</h4>
              <p className="text-sm text-blue-700">
                {data.validationResults.duplicateProducts} products already have draft records. 
                Use the controls below to manage which products to upload.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectDuplicates}>
                Deselect Duplicates
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Deselect All
              </Button>
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
                  Validation passed with warnings. {data.validationResults.selectedProducts} products selected for upload.
                </span>
              ) : (
                <span className="text-green-700">
                  All products passed validation successfully! {data.validationResults.selectedProducts} products selected for upload.
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
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
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
                    <TableHead className="w-[60px]">Select</TableHead>
                    <TableHead className="w-[60px]">Status</TableHead>
                    <TableHead className="w-[100px]">SKU</TableHead>
                    <TableHead>Product Title</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Draft Status</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((product, index) => (
                    <TableRow key={index} className={!product.isSelected ? 'opacity-50' : ''}>
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
                        <div className="max-w-[200px] truncate" title={product.title}>
                          {product.title}
                        </div>
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
                        {product.existingDraft ? (
                          <div className="space-y-1">
                            <Badge variant={
                              product.existingDraft.draftStatus === 'published' ? 'default' :
                              product.existingDraft.draftStatus === 'draft' ? 'secondary' :
                              'outline'
                            }>
                              {product.existingDraft.draftStatus}
                            </Badge>
                            <div className="text-xs text-gray-600">
                              Draft ID: {product.existingDraft.id}
                            </div>
                          </div>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            New Product
                          </Badge>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {product.validationErrors?.map((error, i) => (
                            <div key={i} className="text-xs text-red-600 flex items-start gap-1">
                              <XCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              {error}
                            </div>
                          ))}
                          {product.validationWarnings?.map((warning, i) => (
                            <div key={i} className="text-xs text-yellow-600 flex items-start gap-1">
                              <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              {warning}
                            </div>
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
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <Button 
            onClick={handleNext}
            disabled={!validationComplete || data.validationResults?.hasErrors || (data.validationResults?.selectedProducts || 0) === 0}
          >
            Continue with {data.validationResults?.selectedProducts || 0} Products
            <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
          </Button>
        </div>

        {/* Create Category Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Add a new category to the system.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter category name"
                />
              </div>
              
              <div>
                <Label htmlFor="category-slug">Slug</Label>
                <Input
                  id="category-slug"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="category-slug"
                />
              </div>
              
              <div>
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Category description (optional)"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="parent-category">Parent Category</Label>
                <Select value={newParentId || ""} onValueChange={setNewParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Parent (Top Level)</SelectItem>
                    {categories.filter((cat: any) => cat.level === 0).map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCategory} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Category'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default MassUploadStep4;