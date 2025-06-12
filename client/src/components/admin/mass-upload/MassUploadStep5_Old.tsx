import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Settings, 
  ArrowLeft, 
  RefreshCw, 
  Edit, 
  Trash2, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MassUploadData, CSVProduct } from '@/pages/admin/mass-upload';
import { apiRequest } from '@/lib/queryClient';
import slugify from 'slugify';

interface MassUploadStep5Props {
  data: MassUploadData;
  onUpdate: (updates: Partial<MassUploadData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function MassUploadStep5({ data, onUpdate, onNext, onPrevious }: MassUploadStep5Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [editedProduct, setEditedProduct] = useState<CSVProduct | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<'parent' | 'child'>('parent');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | null>(null);
  const [newCategoryDisplayOrder, setNewCategoryDisplayOrder] = useState(0);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      return response.json();
    },
  });

  const categories = categoriesData?.data || [];
  const parentCategories = categories.filter((c: any) => c.level === 0);

  // Auto-run revalidation when categories are loaded
  React.useEffect(() => {
    if (categories.length > 0 && data.products.length > 0) {
      handleRevalidate();
    }
  }, [categories.length, data.products.length]);

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const response = await apiRequest('POST', '/api/categories', categoryData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories/main/with-children'] });
      setIsCreateDialogOpen(false);
      resetCategoryForm();
      
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Create Category',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetCategoryForm = () => {
    setNewCategoryName('');
    setNewCategorySlug('');
    setNewCategoryDescription('');
    setNewCategoryParentId(null);
    setNewCategoryDisplayOrder(0);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a category name.',
        variant: 'destructive',
      });
      return;
    }

    const categoryData = {
      name: newCategoryName,
      slug: newCategorySlug || slugify(newCategoryName, { lower: true }),
      description: newCategoryDescription,
      parentId: newCategoryParentId,
      level: newCategoryParentId ? 1 : 0,
      displayOrder: newCategoryDisplayOrder,
    };

    createCategoryMutation.mutate(categoryData);
  };

  const handleEditProduct = (index: number) => {
    setEditingProductIndex(index);
    setEditedProduct({ ...data.products[index] });
  };

  const handleSaveProductEdit = () => {
    if (editingProductIndex === null || !editedProduct) return;

    const updatedProducts = [...data.products];
    updatedProducts[editingProductIndex] = editedProduct;

    onUpdate({ products: updatedProducts });
    setEditingProductIndex(null);
    setEditedProduct(null);

    
  };

  const handleRemoveProduct = (index: number) => {
    const updatedProducts = data.products.filter((_, i) => i !== index);
    onUpdate({ products: updatedProducts });

    
  };

  const handleRevalidate = () => {
    console.log('Revalidating products - SKU and pricing validation only');
    console.log('Sample product data:', data.products[0]);
    
    // Re-run validation logic - focus on product data quality only
    const validatedProducts = data.products.map((product, index) => {
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

  const openCreateCategoryDialog = (type: 'parent' | 'child', parentId?: number) => {
    setCreateDialogType(type);
    setNewCategoryParentId(parentId || null);
    resetCategoryForm();
    setIsCreateDialogOpen(true);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Step 5: Make Adjustments
        </CardTitle>
        <p className="text-muted-foreground">
          Fix validation issues, edit product data, or create missing categories.
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
          <Button variant="outline" onClick={handleRevalidate}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Revalidate
          </Button>
          <Button variant="outline" onClick={() => openCreateCategoryDialog('parent')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Parent Category
          </Button>
          <Button variant="outline" onClick={() => openCreateCategoryDialog('child')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Child Category
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
                  <TableHead>Categories</TableHead>
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
                        <Badge variant={product.parentCategoryId ? "default" : "destructive"} className="text-xs">
                          {product.parentCategory}
                        </Badge>
                        <br />
                        <Badge variant={product.childCategoryId ? "secondary" : "destructive"} className="text-xs">
                          {product.childCategory}
                        </Badge>
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
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button 
            onClick={handleStartUpload}
            disabled={data.validationResults?.hasErrors ?? true}
            className="bg-green-600 hover:bg-green-700"
          >
            Start Upload
          </Button>
        </div>

        {/* Edit Product Dialog */}
        <Dialog open={editingProductIndex !== null} onOpenChange={() => setEditingProductIndex(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Make changes to the product data.
              </DialogDescription>
            </DialogHeader>
            {editedProduct && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-sku">SKU</Label>
                    <Input
                      id="edit-sku"
                      value={editedProduct.sku}
                      onChange={(e) => setEditedProduct({...editedProduct, sku: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-title">Title</Label>
                    <Input
                      id="edit-title"
                      value={editedProduct.title}
                      onChange={(e) => setEditedProduct({...editedProduct, title: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editedProduct.description}
                    onChange={(e) => setEditedProduct({...editedProduct, description: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-parent-category">Parent Category</Label>
                    <Select 
                      value={editedProduct.parentCategory} 
                      onValueChange={(value) => setEditedProduct({...editedProduct, parentCategory: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {parentCategories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-child-category">Child Category</Label>
                    <Input
                      id="edit-child-category"
                      value={editedProduct.childCategory}
                      onChange={(e) => setEditedProduct({...editedProduct, childCategory: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-cost-price">Cost Price</Label>
                    <Input
                      id="edit-cost-price"
                      type="number"
                      step="0.01"
                      value={editedProduct.costPrice}
                      onChange={(e) => setEditedProduct({...editedProduct, costPrice: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-regular-price">Regular Price</Label>
                    <Input
                      id="edit-regular-price"
                      type="number"
                      step="0.01"
                      value={editedProduct.regularPrice}
                      onChange={(e) => setEditedProduct({...editedProduct, regularPrice: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-sale-price">Sale Price</Label>
                    <Input
                      id="edit-sale-price"
                      type="number"
                      step="0.01"
                      value={editedProduct.salePrice}
                      onChange={(e) => setEditedProduct({...editedProduct, salePrice: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProductIndex(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProductEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Category Dialog - Reusing existing modal structure */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Add a new {createDialogType} category to organize your products.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name*</Label>
                <Input 
                  id="name" 
                  value={newCategoryName} 
                  onChange={(e) => setNewCategoryName(e.target.value)} 
                  placeholder="Category Name" 
                />
              </div>
              
              {createDialogType === 'child' && (
                <div className="grid gap-2">
                  <Label htmlFor="parent">Parent Category</Label>
                  <Select value={newCategoryParentId?.toString() || ""} onValueChange={(value) => setNewCategoryParentId(parseInt(value))}>
                    <SelectTrigger id="parent">
                      <SelectValue placeholder="Select parent category" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentCategories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug</Label>
                <div className="flex gap-2">
                  <Input 
                    id="slug" 
                    value={newCategorySlug} 
                    onChange={(e) => setNewCategorySlug(e.target.value)} 
                    placeholder="category-slug" 
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setNewCategorySlug(slugify(newCategoryName, { lower: true }))}
                  >
                    Generate
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={newCategoryDescription} 
                  onChange={(e) => setNewCategoryDescription(e.target.value)} 
                  placeholder="Category description" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleCreateCategory} 
                disabled={createCategoryMutation.isPending}
              >
                {createCategoryMutation.isPending && (
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