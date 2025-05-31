import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MassUploadData, CSVProduct } from '@/pages/admin/mass-upload';

interface MassUploadStep2Props {
  data: MassUploadData;
  onUpdate: (updates: Partial<MassUploadData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function MassUploadStep2({ data, onUpdate, onNext, onPrevious }: MassUploadStep2Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Please select a CSV file.');
      return;
    }

    setIsProcessing(true);
    setUploadError(null);

    try {
      const csvContent = await file.text();
      const products = parseCSV(csvContent);
      
      if (products.length === 0) {
        setUploadError('No valid products found in the CSV file.');
        setIsProcessing(false);
        return;
      }

      onUpdate({ 
        csvFile: file, 
        products: products 
      });

      toast({
        title: 'CSV Uploaded Successfully',
        description: `Found ${products.length} products in the file.`,
      });

    } catch (error) {
      console.error('Error processing CSV:', error);
      setUploadError('Failed to process the CSV file. Please check the format and try again.');
    }

    setIsProcessing(false);
  };

  const parseCSV = (csvContent: string): CSVProduct[] => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row.');
    }

    const headers = lines[0].split(';').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const products: CSVProduct[] = [];

    // Expected headers mapping
    const headerMap = {
      sku: ['sku', 'product sku', 'product_sku'],
      title: ['title', 'product title', 'product_title', 'name', 'product name', 'product_name'],
      description: ['description', 'product description', 'product_description'],
      parentCategory: ['parent category', 'parent_category', 'parentcategory', 'main category', 'main_category'],
      childCategory: ['child category', 'child_category', 'childcategory', 'sub category', 'sub_category', 'subcategory'],
      attribute: ['attribute', 'attributes'],
      attributeOptions: ['attribute options', 'attribute_options', 'attributeoptions', 'options'],
      costPrice: ['cost price', 'cost_price', 'costprice', 'cost'],
      salePrice: ['sale price', 'sale_price', 'saleprice', 'sale'],
      regularPrice: ['regular price', 'regular_price', 'regularprice', 'price', 'retail price', 'retail_price'],
      productUrl: ['product url', 'product_url', 'producturl', 'url', 'supplier url', 'supplier_url']
    };

    // Find column indices
    const columnIndices: Record<string, number> = {};
    for (const [key, possibleHeaders] of Object.entries(headerMap)) {
      const index = headers.findIndex(h => possibleHeaders.includes(h));
      if (index !== -1) {
        columnIndices[key] = index;
      }
    }

    // Validate required columns
    const requiredColumns = ['sku', 'title', 'description', 'parentCategory', 'childCategory', 'costPrice', 'regularPrice', 'productUrl'];
    const missingColumns = requiredColumns.filter(col => columnIndices[col] === undefined);
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length < Object.keys(columnIndices).length) {
        console.warn(`Row ${i + 1} has insufficient columns, skipping.`);
        continue;
      }

      try {
        const product: CSVProduct = {
          sku: values[columnIndices.sku] || '',
          title: values[columnIndices.title] || '',
          description: values[columnIndices.description] || '',
          parentCategory: values[columnIndices.parentCategory] || '',
          childCategory: values[columnIndices.childCategory] || '',
          attribute: values[columnIndices.attribute] || '',
          attributeOptions: values[columnIndices.attributeOptions] || '',
          costPrice: parseFloat(values[columnIndices.costPrice]) || 0,
          salePrice: parseFloat(values[columnIndices.salePrice]) || 0,
          regularPrice: parseFloat(values[columnIndices.regularPrice]) || 0,
          productUrl: values[columnIndices.productUrl] || '',
        };

        // Basic validation
        if (!product.sku || !product.title || !product.productUrl) {
          console.warn(`Row ${i + 1} missing required data, skipping.`);
          continue;
        }

        if (product.costPrice <= 0 || product.regularPrice <= 0) {
          console.warn(`Row ${i + 1} has invalid pricing, skipping.`);
          continue;
        }

        products.push(product);
      } catch (error) {
        console.warn(`Error parsing row ${i + 1}:`, error);
        continue;
      }
    }

    return products;
  };

  const handleNext = () => {
    if (!data.csvFile || data.products.length === 0) {
      toast({
        title: 'No File Selected',
        description: 'Please upload a CSV file with product data.',
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
          <Upload className="h-5 w-5" />
          Step 2: Upload CSV File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CSV Format Instructions */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>CSV Format Requirements:</strong>
            <br />
            Your CSV file must include the following columns: SKU, Product Title, Product Description, Parent Category, Child Category, Cost Price, Regular Price, and Product URL.
            <br />
            Optional columns: Attribute, Attribute Options, Sale Price.
          </AlertDescription>
        </Alert>

        {/* File Upload */}
        <div className="space-y-4">
          <Label htmlFor="csv-file">Select CSV File *</Label>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-file"
              disabled={isProcessing}
            />
            
            {!data.csvFile ? (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">Upload your CSV file</p>
                  <p className="text-muted-foreground">Click to browse or drag and drop</p>
                </div>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                <div>
                  <p className="text-lg font-medium text-green-600">File uploaded successfully</p>
                  <p className="text-muted-foreground">{data.csvFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.products.length} products found
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  Choose Different File
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {uploadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {/* Sample CSV Format */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <h4 className="font-medium mb-2">Sample CSV Format:</h4>
          <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
{`SKU,Product Title,Product Description,Parent Category,Child Category,Cost Price,Regular Price,Sale Price,Product URL
ABC123,Sample Product,This is a sample product description,Electronics,Phones,50.00,100.00,80.00,https://supplier.com/product/abc123
DEF456,Another Product,Another product description,Home & Garden,Kitchen,25.00,50.00,,https://supplier.com/product/def456`}
          </pre>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!data.csvFile || data.products.length === 0 || isProcessing}
          >
            Continue to Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}