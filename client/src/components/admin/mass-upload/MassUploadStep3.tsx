import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, ArrowLeft, DollarSign, Package, ExternalLink } from 'lucide-react';
import { MassUploadData } from '@/pages/admin/mass-upload';

interface MassUploadStep3Props {
  data: MassUploadData;
  onUpdate: (updates: Partial<MassUploadData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function MassUploadStep3({ data, onNext, onPrevious }: MassUploadStep3Props) {
  const { products } = data;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(price);
  };

  const handleNext = () => {
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Step 3: Preview Products
        </CardTitle>
        <p className="text-muted-foreground">
          Review all products that will be uploaded. Check the details before proceeding to validation.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Package className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{products.length}</p>
              <p className="text-sm text-muted-foreground">Total Products</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">
                {formatPrice(products.reduce((sum, p) => sum + p.regularPrice, 0))}
              </p>
              <p className="text-sm text-muted-foreground">Total Value</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Badge className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">
                {new Set(products.map(p => p.parentCategory)).size}
              </p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="border rounded-lg">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead className="min-w-[200px]">Product Title</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead className="w-[100px]">URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {product.sku}
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{product.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                        {product.attribute && (
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">
                              {product.attribute}
                            </Badge>
                            {product.attributeOptions && (
                              <Badge variant="secondary" className="text-xs">
                                {product.attributeOptions}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="default" className="text-xs">
                          {product.parentCategory}
                        </Badge>
                        <br />
                        <Badge variant="secondary" className="text-xs">
                          {product.childCategory}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Cost:</span>{' '}
                          {formatPrice(product.costPrice)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Regular:</span>{' '}
                          {formatPrice(product.regularPrice)}
                        </div>
                        {product.salePrice > 0 && (
                          <div>
                            <span className="text-muted-foreground">Sale:</span>{' '}
                            <span className="text-green-600 font-medium">
                              {formatPrice(product.salePrice)}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(product.productUrl, '_blank')}
                        className="h-8 w-8 p-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* Category Summary */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <h4 className="font-medium mb-3">Category Distribution</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-medium mb-2">Parent Categories:</h5>
              <div className="space-y-1">
                {Array.from(new Set(products.map(p => p.parentCategory))).map(category => (
                  <div key={category} className="flex justify-between text-sm">
                    <span>{category}</span>
                    <Badge variant="outline" className="text-xs">
                      {products.filter(p => p.parentCategory === category).length}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h5 className="text-sm font-medium mb-2">Child Categories:</h5>
              <div className="space-y-1">
                {Array.from(new Set(products.map(p => p.childCategory))).map(category => (
                  <div key={category} className="flex justify-between text-sm">
                    <span>{category}</span>
                    <Badge variant="outline" className="text-xs">
                      {products.filter(p => p.childCategory === category).length}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Price Analysis */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <h4 className="font-medium mb-3">Price Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Average Cost Price:</p>
              <p className="font-medium">
                {formatPrice(products.reduce((sum, p) => sum + p.costPrice, 0) / products.length)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Average Regular Price:</p>
              <p className="font-medium">
                {formatPrice(products.reduce((sum, p) => sum + p.regularPrice, 0) / products.length)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Average Markup:</p>
              <p className="font-medium">
                {Math.round(
                  products.reduce((sum, p) => {
                    const markup = ((p.regularPrice - p.costPrice) / p.costPrice) * 100;
                    return sum + markup;
                  }, 0) / products.length
                )}%
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button onClick={handleNext}>
            Continue to Validation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}