import React, { createContext, useContext, useState, useMemo } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import type { Product } from '@shared/schema';
import { CartItemWithDiscounts, CartSummary } from '@/types/cart.types';
import { StandardApiResponse } from '@/types/api';

// CartContextType defines the shape of the cart context
type CartContextType = {
  cartItems: CartItemWithDiscounts[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItemWithDiscounts, 'id' | 'discountData' | 'totalDiscount' | 'itemPrice'>) => void;
  updateItemQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  cartSummary: CartSummary;
  isLoading: boolean;
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
  cartSummary: {
    itemCount: 0,
    subtotal: 0,
    totalDiscount: 0,
    finalTotal: 0
  },
  isLoading: false
};

const CartContext = createContext<CartContextType>(defaultCartContext);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Get cart items from server with improved typing for discount fields
  // API now returns StandardApiResponse format
  const { data: responseData, isLoading } = useQuery<StandardApiResponse<CartItemWithDiscounts[]>>({
    queryKey: ['/api/cart'],
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
  
  // Safe extraction of cart items from the standardized response format
  // If response is not available or doesn't have success/data properties, fall back to empty array
  const cartItems = (responseData?.success ? responseData.data : []);
  
  // Calculate cart summary with simplified approach
  // Since we're using database persistence, the pricing calculations are done server-side
  // Here we simply aggregate the information that was calculated and stored in the database
  const cartSummary = useMemo<CartSummary>(() => {
    return cartItems.reduce((summary, item) => {
      // For each item, accumulate total items and price
      const itemPrice = Number(item.itemPrice) || 0;
      return {
        itemCount: summary.itemCount + item.quantity,
        subtotal: summary.subtotal + (itemPrice * item.quantity),
        totalDiscount: 0, // No discounts in simplified cart
        finalTotal: summary.finalTotal + (itemPrice * item.quantity)
      };
    }, {
      itemCount: 0,
      subtotal: 0,
      totalDiscount: 0,
      finalTotal: 0
    });
  }, [cartItems]);
  
  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (item: Omit<CartItemWithDiscounts, 'id' | 'discountData' | 'totalDiscount' | 'itemPrice'>) => {
      console.log('🔍 CART MUTATION DEBUG - Original item:', item);
      
      const { product, ...rest } = item;
      
      // Build request data explicitly to ensure attributeSelections is included
      const requestData = {
        productId: item.productId,
        quantity: item.quantity,
        itemPrice: item.itemPrice,
        attributeSelections: item.attributeSelections || {}
      };
      
      console.log('🔍 CART MUTATION DEBUG - Sending to server:', requestData);
      
      try {
        const res = await apiRequest('POST', '/api/cart', requestData);
        const data: StandardApiResponse<any> = await res.json();
        if (!data.success) {
          throw new Error(data.error?.message || "Failed to add item to cart");
        }
        return data;
      } catch (error) {
        // Check if the error message contains authentication information
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('401') || errorMessage.includes('Authentication required')) {
          throw new Error('AUTHENTICATION_REQUIRED');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Added to cart",
        description: "Item successfully added to your cart",
      });
    },
    onError: (error) => {
      // Check if the error is authentication related
      if (error.message === 'AUTHENTICATION_REQUIRED') {
        // Redirect to auth page instead of showing error toast
        setLocation('/auth');
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to add item to cart",
        variant: "destructive"
      });
    }
  });
  
  // Update cart item mutation
  const updateCartMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      const res = await apiRequest('PUT', `/api/cart/${id}`, { quantity });
      const data: StandardApiResponse<any> = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to update cart item");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Please log in to update your cart",
        variant: "destructive"
      });
    }
  });
  
  // Remove from cart mutation
  const removeFromCartMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/cart/${id}`);
      const data: StandardApiResponse<any> = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to remove item from cart");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Please log in to modify your cart",
        variant: "destructive"
      });
    }
  });
  
  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/cart');
      const data: StandardApiResponse<any> = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to clear cart");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Please log in to modify your cart",
        variant: "destructive"
      });
    }
  });
  
  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  
  // Type-safe version of addItem that excludes the server-calculated fields
  const addItem = (item: Omit<CartItemWithDiscounts, 'id' | 'discountData' | 'totalDiscount' | 'itemPrice'>) => {
    addToCartMutation.mutate(item);
  };
  
  const updateItemQuantity = (id: number, quantity: number) => {
    if (quantity < 1) {
      removeItem(id);
      return;
    }
    updateCartMutation.mutate({ id, quantity });
  };
  
  const removeItem = (id: number) => {
    removeFromCartMutation.mutate(id);
  };
  
  const clearCart = () => {
    clearCartMutation.mutate();
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
        cartSummary,
        isLoading
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}