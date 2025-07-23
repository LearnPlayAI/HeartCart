import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const addItemSchema = z.object({
  productId: z.number().min(1, 'Product is required'),
  productName: z.string().min(1, 'Product name is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.string().regex(/^\d+(\.\d{2})?$/, 'Invalid price format'),
  totalPrice: z.string().regex(/^\d+(\.\d{2})?$/, 'Invalid total price'),
  size: z.string().optional(),
  color: z.string().optional(),
  adminNotes: z.string().optional(),
});

type AddItemFormData = z.infer<typeof addItemSchema>;

interface AddProductToCorporateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  corporateOrderId: number;
}

export function AddProductToCorporateOrderModal({
  isOpen,
  onClose,
  corporateOrderId,
}: AddProductToCorporateOrderModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddItemFormData>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      quantity: 1,
      unitPrice: '0.00',
      totalPrice: '0.00',
    },
  });

  const quantity = watch('quantity');
  const unitPrice = watch('unitPrice');

  // Calculate total price when quantity or unit price changes
  React.useEffect(() => {
    if (quantity && unitPrice) {
      const total = (quantity * parseFloat(unitPrice || '0')).toFixed(2);
      setValue('totalPrice', total);
    }
  }, [quantity, unitPrice, setValue]);

  const addItemMutation = useMutation({
    mutationFn: async (data: AddItemFormData) => {
      return apiRequest('POST', `/api/admin/corporate-orders/${corporateOrderId}/items`, data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Product added to corporate order successfully',
      });
      
      // Refresh the corporate order data
      queryClient.invalidateQueries({ queryKey: [`/api/admin/corporate-orders/${corporateOrderId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/corporate-orders/${corporateOrderId}/items`] });
      
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add product to corporate order',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: AddItemFormData) => {
    setIsLoading(true);
    try {
      await addItemMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Product to Corporate Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Product Selection - Simple inputs for now */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productId">Product ID</Label>
              <Input
                id="productId"
                type="number"
                {...register('productId', { valueAsNumber: true })}
                placeholder="Enter product ID"
              />
              {errors.productId && (
                <p className="text-sm text-red-600">{errors.productId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                {...register('productName')}
                placeholder="Enter product name"
              />
              {errors.productName && (
                <p className="text-sm text-red-600">{errors.productName.message}</p>
              )}
            </div>
          </div>

          {/* Product Variations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size (Optional)</Label>
              <Select onValueChange={(value) => setValue('size', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XS">XS</SelectItem>
                  <SelectItem value="S">S</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="XL">XL</SelectItem>
                  <SelectItem value="2XL">2XL</SelectItem>
                  <SelectItem value="3XL">3XL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color (Optional)</Label>
              <Input
                id="color"
                {...register('color')}
                placeholder="Enter color"
              />
            </div>
          </div>

          {/* Quantity and Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && (
                <p className="text-sm text-red-600">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price (R)</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                min="0"
                {...register('unitPrice')}
                placeholder="0.00"
              />
              {errors.unitPrice && (
                <p className="text-sm text-red-600">{errors.unitPrice.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalPrice">Total Price (R)</Label>
              <Input
                id="totalPrice"
                {...register('totalPrice')}
                readOnly
                className="bg-gray-50"
              />
              {errors.totalPrice && (
                <p className="text-sm text-red-600">{errors.totalPrice.message}</p>
              )}
            </div>
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
            <Textarea
              id="adminNotes"
              {...register('adminNotes')}
              placeholder="Any additional notes for this item..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {isLoading ? 'Adding...' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}