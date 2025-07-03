import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MassUploadData } from '@/pages/admin/mass-upload';
import { apiRequest } from '@/lib/queryClient';

interface MassUploadStep1Props {
  data: MassUploadData;
  onUpdate: (updates: Partial<MassUploadData>) => void;
  onNext: () => void;
}

export function MassUploadStep1({ data, onUpdate, onNext }: MassUploadStep1Props) {
  const { toast } = useToast();
  const [selectedSupplierId, setSelectedSupplierId] = useState(data.supplierId || 0);
  const [selectedCatalogId, setSelectedCatalogId] = useState(data.catalogId || 0);

  // Fetch suppliers
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/suppliers');
    },
  });

  // Fetch catalogs for selected supplier
  const { data: catalogsData, isLoading: isLoadingCatalogs } = useQuery({
    queryKey: ['/api/suppliers', selectedSupplierId, 'catalogs'],
    queryFn: async () => {
      if (!selectedSupplierId) return { success: true, data: [] };
      return await apiRequest('GET', `/api/suppliers/${selectedSupplierId}/catalogs`);
    },
    enabled: !!selectedSupplierId,
  });

  const suppliers = suppliersData?.data || [];
  const catalogs = catalogsData?.data || [];

  const handleSupplierChange = (supplierId: string) => {
    const id = parseInt(supplierId);
    setSelectedSupplierId(id);
    setSelectedCatalogId(0); // Reset catalog selection
    
    const supplier = suppliers.find((s: any) => s.id === id);
    onUpdate({
      supplierId: id,
      supplierName: supplier?.name || '',
      catalogId: 0,
      catalogName: '',
    });
  };

  const handleCatalogChange = (catalogId: string) => {
    const id = parseInt(catalogId);
    setSelectedCatalogId(id);
    
    const catalog = catalogs.find((c: any) => c.id === id);
    onUpdate({
      catalogId: id,
      catalogName: catalog?.name || '',
    });
  };

  const handleNext = () => {
    if (!selectedSupplierId || !selectedCatalogId) {
      toast({
        title: 'Missing Selection',
        description: 'Please select both a supplier and catalog to continue.',
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
          <Building2 className="h-5 w-5" />
          Step 1: Select Supplier & Catalog
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier *</Label>
            {isLoadingSuppliers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading suppliers...</span>
              </div>
            ) : (
              <Select value={selectedSupplierId.toString()} onValueChange={handleSupplierChange}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{supplier.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedSupplierId > 0 && (
              <p className="text-sm text-muted-foreground">
                Selected: {data.supplierName}
              </p>
            )}
          </div>

          {/* Catalog Selection */}
          <div className="space-y-2">
            <Label htmlFor="catalog">Catalog *</Label>
            {!selectedSupplierId ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <FolderOpen className="h-6 w-6 mr-2" />
                <span>Select a supplier first</span>
              </div>
            ) : isLoadingCatalogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading catalogs...</span>
              </div>
            ) : (
              <Select 
                value={selectedCatalogId.toString()} 
                onValueChange={handleCatalogChange}
                disabled={!selectedSupplierId}
              >
                <SelectTrigger id="catalog">
                  <SelectValue placeholder="Select a catalog" />
                </SelectTrigger>
                <SelectContent>
                  {catalogs.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No catalogs available
                    </SelectItem>
                  ) : (
                    catalogs.map((catalog: any) => (
                      <SelectItem key={catalog.id} value={catalog.id.toString()}>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          <span>{catalog.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            {selectedCatalogId > 0 && (
              <p className="text-sm text-muted-foreground">
                Selected: {data.catalogName}
              </p>
            )}
          </div>
        </div>

        {/* Selection Summary */}
        {selectedSupplierId > 0 && selectedCatalogId > 0 && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-medium mb-2">Selection Summary</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Supplier:</strong> {data.supplierName}</p>
              <p><strong>Catalog:</strong> {data.catalogName}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All products uploaded will be assigned to this supplier and catalog.
            </p>
          </div>
        )}

        {/* Next Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleNext}
            disabled={!selectedSupplierId || !selectedCatalogId}
          >
            Continue to CSV Upload
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}