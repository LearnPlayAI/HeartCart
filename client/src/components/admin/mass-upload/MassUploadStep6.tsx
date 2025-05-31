import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Images, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Loader2,
  ExternalLink,
  Upload,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MassUploadData, CSVProduct } from '@/pages/admin/mass-upload';
import { apiRequest } from '@/lib/queryClient';
import slugify from 'slugify';

// Image upload will be handled through the product wizard

interface MassUploadStep6Props {
  data: MassUploadData;
  onUpdate: (updates: Partial<MassUploadData>) => void;
  onComplete: () => void;
  onPrevious: () => void;
}

export function MassUploadStep6({ data, onUpdate, onComplete, onPrevious }: MassUploadStep6Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creationProgress, setCreationProgress] = useState(0);
  const [isCreatingDrafts, setIsCreatingDrafts] = useState(false);
  const [draftsCreated, setDraftsCreated] = useState(false);
  const [selectedProductForImages, setSelectedProductForImages] = useState<CSVProduct | null>(null);
  const [creationErrors, setCreationErrors] = useState<string[]>([]);

  // Create product drafts mutation
  const createDraftsMutation = useMutation({
    mutationFn: async (products: CSVProduct[]) => {
      const results = [];
      const errors = [];
      
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        
        try {
          // Check if this is an existing product with price updates
          if (product.existingProduct && product.hasPriceChanges) {
            // Handle price updates for existing product
            const priceUpdateData: any = {};
            
            if (product.priceUpdateOptions?.updateRegularPrice) {
              priceUpdateData.price = product.regularPrice;
            }
            if (product.priceUpdateOptions?.updateSalePrice) {
              priceUpdateData.salePrice = product.salePrice > 0 ? product.salePrice : null;
            }
            if (product.priceUpdateOptions?.updateCostPrice) {
              priceUpdateData.costPrice = product.costPrice;
            }
            
            // Only update if at least one price option is selected
            if (Object.keys(priceUpdateData).length > 0) {
              const response = await apiRequest('PATCH', `/api/products/${product.existingProduct.id}`, priceUpdateData);
              const result = await response.json();
              
              if (result.success) {
                results.push({
                  ...product,
                  draftId: null, // No draft created, existing product updated
                  updated: true
                });
              } else {
                errors.push(`Failed to update prices for ${product.sku}: ${result.error || 'Unknown error'}`);
              }
            } else {
              // No price updates selected, skip this product
              results.push({
                ...product,
                draftId: null,
                skipped: true
              });
            }
          } else if (!product.existingProduct) {
            // Create new product draft
            const draftData = {
              name: product.title,
              sku: product.sku,
              description: product.description,
              categoryId: product.childCategoryId || product.parentCategoryId,
              catalogId: data.catalogId,
              supplierId: data.supplierId,
              supplierUrl: product.productUrl,
              costPrice: product.costPrice.toString(),
              regularPrice: product.regularPrice.toString(),
              salePrice: product.salePrice > 0 ? product.salePrice.toString() : null,
              onSale: product.salePrice > 0,
              slug: slugify(product.title, { lower: true }),
              isActive: true,
              stockLevel: 0,
              draftStatus: 'draft',
              wizardProgress: {
                'basic-info': true,
                'images': false,
                'additional-info': false,
                'attributes': false,
                'seo': false,
                'sales-promotions': false,
                'review': false
              }
            };

            const response = await apiRequest('POST', '/api/product-drafts', draftData);
            const result = await response.json();
            
            if (result.success) {
              results.push({
                ...product,
                draftId: result.data.id,
                created: true
              });
            } else {
              errors.push(`Failed to create draft for ${product.sku}: ${result.error || 'Unknown error'}`);
            }
          } else {
            // Existing product with no price changes, skip
            results.push({
              ...product,
              draftId: null,
              skipped: true
            });
          }
        } catch (error: any) {
          errors.push(`Failed to process ${product.sku}: ${error.message}`);
        }
        
        // Update progress
        setCreationProgress(((i + 1) / products.length) * 100);
      }
      
      return { results, errors };
    },
    onSuccess: ({ results, errors }) => {
      setCreationErrors(errors);
      
      // Update products with draft IDs
      onUpdate({ 
        products: results 
      });
      
      setDraftsCreated(true);
      setIsCreatingDrafts(false);
      
      if (errors.length === 0) {
        toast({
          title: 'Drafts Created Successfully',
          description: `${results.length} product drafts have been created. You can now upload images.`,
        });
      } else {
        toast({
          title: 'Some Drafts Failed',
          description: `${results.length} drafts created, ${errors.length} failed. Check the error list below.`,
          variant: 'destructive',
        });
      }
      
      // Invalidate product drafts query to refresh the management page
      queryClient.invalidateQueries({ queryKey: ['/api/product-drafts'] });
    },
    onError: (error: any) => {
      setIsCreatingDrafts(false);
      toast({
        title: 'Draft Creation Failed',
        description: error.message || 'Failed to create product drafts.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateDrafts = () => {
    if (!data.validationResults || data.validationResults.hasErrors) {
      toast({
        title: 'Validation Required',
        description: 'Please ensure all products pass validation before creating drafts.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingDrafts(true);
    setCreationProgress(0);
    createDraftsMutation.mutate(data.products.filter(p => p.isValid));
  };

  const handleImageUpload = (product: CSVProduct) => {
    if (!product.draftId) {
      toast({
        title: 'Draft Not Created',
        description: 'Please create the product draft first.',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedProductForImages(product);
  };

  const handleImageUploadComplete = () => {
    setSelectedProductForImages(null);
    toast({
      title: 'Images Uploaded',
      description: 'Product images have been uploaded successfully.',
    });
  };

  const handleComplete = () => {
    toast({
      title: 'Mass Upload Complete',
      description: `${data.products.length} products have been uploaded as drafts. You can now edit and publish them from the Product Management page.`,
    });
    onComplete();
  };

  // Auto-start draft creation when step loads
  useEffect(() => {
    if (!draftsCreated && !isCreatingDrafts && data.products.length > 0) {
      handleCreateDrafts();
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Images className="h-5 w-5" />
          Step 6: Upload Images
        </CardTitle>
        <p className="text-muted-foreground">
          Product drafts are being created. You can then upload images for each product.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Draft Creation Progress */}
        {isCreatingDrafts && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-medium">Creating Product Drafts...</span>
            </div>
            <Progress value={creationProgress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {Math.round(creationProgress)}% complete - Creating drafts in the database
            </p>
          </div>
        )}

        {/* Creation Errors */}
        {creationErrors.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Draft Creation Errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {creationErrors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Summary */}
        {draftsCreated && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              <div className="text-green-700">
                <p className="font-medium">Product Drafts Created Successfully!</p>
                <p className="text-sm mt-1">
                  {data.products.filter(p => p.draftId).length} product drafts have been created in the database. 
                  You can now upload images for each product by clicking the "Upload Images" button, 
                  or complete the process and manage them from the Product Management page.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Products Table with Image Upload Options */}
        {draftsCreated && (
          <div className="border rounded-lg">
            <div className="p-4 border-b">
              <h3 className="font-medium">Product Drafts - Ready for Image Upload</h3>
              <p className="text-sm text-muted-foreground">
                Click "Upload Images" to add product photos, or "View URL" to visit the supplier page.
              </p>
            </div>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Status</TableHead>
                    <TableHead className="w-[100px]">SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Action Taken</TableHead>
                    <TableHead>Supplier URL</TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {product.draftId ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      
                      <TableCell className="font-mono text-sm">
                        {product.sku}
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.parentCategory} → {product.childCategory}
                          </p>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {(product as any).created && (
                          <div className="space-y-1">
                            <Badge variant="default" className="bg-green-600">New Product Created</Badge>
                            <div className="text-xs text-muted-foreground">Draft #{product.draftId}</div>
                          </div>
                        )}
                        {(product as any).updated && (
                          <div className="space-y-1">
                            <Badge variant="default" className="bg-blue-600">Price Updated</Badge>
                            <div className="text-xs text-muted-foreground">Product #{product.existingProduct?.id}</div>
                          </div>
                        )}
                        {(product as any).skipped && (
                          <Badge variant="secondary">Skipped</Badge>
                        )}
                        {!((product as any).created || (product as any).updated || (product as any).skipped) && product.draftId && (
                          <div className="space-y-1">
                            <Badge variant="default" className="bg-green-600">Draft Created</Badge>
                            <div className="text-xs text-muted-foreground">#{product.draftId}</div>
                          </div>
                        )}
                        {!((product as any).created || (product as any).updated || (product as any).skipped) && !product.draftId && (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(product.productUrl, '_blank')}
                          className="h-8 px-2"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex gap-1">
                          {product.draftId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleImageUpload(product)}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Upload Images
                            </Button>
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

        {/* Instructions */}
        {draftsCreated && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-medium mb-2">Next Steps:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "View" to open the supplier product page in a new tab</li>
              <li>Download the product images from the supplier website</li>
              <li>Click "Upload Images" to add the downloaded images to each product</li>
              <li>Complete the mass upload process</li>
              <li>Go to Product Management to edit and publish the drafts</li>
            </ol>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious} disabled={isCreatingDrafts}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button 
            onClick={handleComplete}
            disabled={!draftsCreated}
            className="bg-green-600 hover:bg-green-700"
          >
            Complete Mass Upload
          </Button>
        </div>

        {/* Image Upload Dialog - Links to product wizard */}
        <Dialog 
          open={selectedProductForImages !== null} 
          onOpenChange={() => setSelectedProductForImages(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Images - {selectedProductForImages?.title}</DialogTitle>
              <DialogDescription>
                To upload images for this product, you'll be redirected to the product wizard.
                <br />
                <strong>Product URL:</strong> {selectedProductForImages?.productUrl}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Steps to upload images:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Click "View Supplier Page" to open the product page in a new tab</li>
                      <li>Download the product images from the supplier website</li>
                      <li>Click "Open Product Wizard" to upload images using the existing image management system</li>
                      <li>Upload the downloaded images in the wizard</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedProductForImages?.productUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Supplier Page
                </Button>
                
                <Button
                  onClick={() => {
                    if (selectedProductForImages?.draftId) {
                      window.open(`/admin/product-wizard/${selectedProductForImages.draftId}`, '_blank');
                    }
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Open Product Wizard
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}