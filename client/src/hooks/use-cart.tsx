import React, { createContext, useContext, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product } from '@shared/schema';

type CartItem = {
  id: number;
  productId: number;
  quantity: number;
  product: Product;
  combinationId?: number | null;
  combinationHash?: string | null;
  selectedAttributes?: Record<string, any> | null;
  priceAdjustment?: number | null;
};

type CartContextType = {
  cartItems: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateItemQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  calculateSubtotal: () => number;
};

const defaultCartContext: CartContextType = {
  cartItems: [],
  isOpen: false,
  openCart: () => {},
  closeCart: () => {},
  addItem: () => {},
  updateItemQuantity: () => {},
  removeItem: () => {},
  clearCart: () => {},
  calculateSubtotal: () => 0
};

const CartContext = createContext<CartContextType>(defaultCartContext);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get cart items from server
  const { data } = useQuery<CartItem[]>({
    queryKey: ['/api/cart'],
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
  
  // Safe type casting with fallback to empty array
  const cartItems = (data as CartItem[] || []);
  
  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (item: Omit<CartItem, 'id'>) => {
      const { product, ...rest } = item;
      await apiRequest('POST', '/api/cart', rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Please log in to add items to your cart",
        variant: "destructive"
      });
    }
  });
  
  // Update cart item mutation
  const updateCartMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      await apiRequest('PUT', `/api/cart/${id}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Please log in to update your cart",
        variant: "destructive"
      });
    }
  });
  
  // Remove from cart mutation
  const removeFromCartMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/cart/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Please log in to modify your cart",
        variant: "destructive"
      });
    }
  });
  
  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', '/api/cart');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Please log in to modify your cart",
        variant: "destructive"
      });
    }
  });
  
  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  
  const addItem = (item: Omit<CartItem, 'id'>) => {
    addToCartMutation.mutate(item);
  };
  
  const updateItemQuantity = (id: number, quantity: number) => {
    updateCartMutation.mutate({ id, quantity });
  };
  
  const removeItem = (id: number) => {
    removeFromCartMutation.mutate(id);
  };
  
  const clearCart = () => {
    clearCartMutation.mutate();
  };
  
  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const basePrice = item.product.salePrice || item.product.price;
      const priceWithAdjustment = basePrice + (item.priceAdjustment || 0);
      return total + priceWithAdjustment * item.quantity;
    }, 0);
  };
  
  return (
    <CartContext.Provider 
      value={{
        cartItems,
        isOpen,
        openCart,
        closeCart,
        addItem,
        updateItemQuantity,
        removeItem,
        clearCart,
        calculateSubtotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}