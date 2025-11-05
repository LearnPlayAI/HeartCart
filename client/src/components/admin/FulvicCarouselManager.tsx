import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, GripVertical, Search, Save } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { Product } from '@shared/schema';

interface CarouselProduct {
  productId: number;
  position: number;
}

interface CarouselConfig {
  enabled: boolean;
  products: CarouselProduct[];
}

export function FulvicCarouselManager() {
  const { toast } = useToast();
  const [config, setConfig] = useState<CarouselConfig>({
    enabled: true,
    products: []
  });
  const [productSearch, setProductSearch] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);

  const { data: settingData, isLoading } = useQuery({
    queryKey: ['/api/admin/settings/fulvicCarouselProducts'],
    retry: false
  });

  const { data: searchResults } = useQuery({
    queryKey: ['/api/products', { search: productSearch, limit: 20 }],
    enabled: showProductSelector && productSearch.length > 2
  });

  const { data: selectedProductsData } = useQuery({
    queryKey: ['/api/products/by-ids', { ids: config.products.map(p => p.productId).join(',') }],
    enabled: config.products.length > 0
  });

  useEffect(() => {
    if (settingData?.success && settingData.data?.settingValue) {
      try {
        const parsed = JSON.parse(settingData.data.settingValue);
        setConfig(parsed);
      } catch (error) {
        console.error('Error parsing carousel config:', error);
      }
    }
  }, [settingData]);

  const updateMutation = useMutation({
    mutationFn: async (newConfig: CarouselConfig) => {
      return await apiRequest('/api/admin/settings/fulvicCarouselProducts', {
        method: 'PUT',
        body: JSON.stringify({
          settingValue: JSON.stringify(newConfig)
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/fulvicCarouselProducts'] });
      toast({
        title: 'Carousel Updated',
        description: 'Fulvic products carousel has been saved successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update carousel configuration.',
        variant: 'destructive',
      });
    }
  });

  const handleAddProduct = (product: Product) => {
    if (config.products.some(p => p.productId === product.id)) {
      toast({
        title: 'Already Added',
        description: 'This product is already in the carousel.',
        variant: 'destructive',
      });
      return;
    }

    const newProduct: CarouselProduct = {
      productId: product.id,
      position: config.products.length
    };

    setConfig(prev => ({
      ...prev,
      products: [...prev.products, newProduct]
    }));

    setProductSearch('');
    setShowProductSelector(false);
    
    toast({
      title: 'Product Added',
      description: `${product.name} has been added to the carousel.`,
    });
  };

  const handleRemoveProduct = (productId: number) => {
    setConfig(prev => ({
      ...prev,
      products: prev.products
        .filter(p => p.productId !== productId)
        .map((p, index) => ({ ...p, position: index }))
    }));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(config.products);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const reorderedProducts = items.map((item, index) => ({
      ...item,
      position: index
    }));

    setConfig(prev => ({
      ...prev,
      products: reorderedProducts
    }));
  };

  const handleSave = () => {
    updateMutation.mutate(config);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedProducts = selectedProductsData?.success ? selectedProductsData.data : [];
  const productsMap = new Map(selectedProducts.map((p: Product) => [p.id, p]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fulvic Products Carousel</CardTitle>
        <CardDescription>
          Select and arrange products to feature in the Fulvic Wellness carousel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="carousel-enabled"
            checked={config.enabled}
            onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            className="h-4 w-4"
            data-testid="checkbox-carousel-enabled"
          />
          <Label htmlFor="carousel-enabled">Enable Carousel</Label>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Featured Products ({config.products.length})</Label>
            <Button
              onClick={() => setShowProductSelector(!showProductSelector)}
              size="sm"
              variant="outline"
              className="border-pink-500 text-pink-500 hover:bg-pink-50"
              data-testid="button-add-carousel-product"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>

          {showProductSelector && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-carousel-products"
                />
              </div>

              {productSearch.length > 2 && searchResults?.data && (
                <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
                  {searchResults.data.map((product: Product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-pink-300 cursor-pointer"
                      onClick={() => handleAddProduct(product)}
                      data-testid={`product-option-${product.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">R {product.price}</p>
                        </div>
                      </div>
                      <Plus className="h-5 w-5 text-pink-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="carousel-products">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {config.products.map((item, index) => {
                    const product = productsMap.get(item.productId);
                    if (!product) return null;

                    return (
                      <Draggable
                        key={item.productId}
                        draggableId={String(item.productId)}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center justify-between p-3 bg-white rounded-lg border ${
                              snapshot.isDragging ? 'border-pink-500 shadow-lg' : 'border-gray-200'
                            }`}
                            data-testid={`carousel-product-${item.productId}`}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="h-5 w-5 text-gray-400" />
                              </div>
                              {product.imageUrl && (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-gray-500">Position {index + 1}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveProduct(item.productId)}
                              data-testid={`button-remove-carousel-product-${item.productId}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {config.products.length === 0 && (
            <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
              <p>No products selected</p>
              <p className="text-sm mt-1">Click "Add Product" to get started</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-pink-500 hover:bg-pink-600"
            data-testid="button-save-carousel"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Saving...' : 'Save Carousel'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
