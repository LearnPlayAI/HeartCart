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
  removeAttributeOption: (cartItemId: number, attributeName: string, attributeValue: string) => void;
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
  removeAttributeOption: () => {},
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
  const { data: responseData, isLoading, refetch } = useQuery<StandardApiResponse<CartItemWithDiscounts[]>>({
    queryKey: ['/api/cart'],
    retry: false,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
  
  // Safe extraction of cart items from the standardized response format
  // If response is not available or doesn't have success/data properties, fall back to empty array
  const cartItems = (responseData?.success ? responseData.data : []) || [];
  
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
  
  // Clean cart mutation implementation for attribute selections
  const addToCartMutation = useMutation({
    mutationFn: async (cartItem: {
      productId: number;
      quantity: number;
      itemPrice: number;
      attributeSelections: Record<string, string> | null;
    }) => {
      console.log('🔍 CLEAN CART MUTATION - Adding item:', cartItem);
      
      const res = await apiRequest('POST', '/api/cart', cartItem);
      
      // Check for 401 authentication error before parsing JSON
      if (res.status === 401) {
        setLocation('/auth');
        return;
      }
      
      const data: StandardApiResponse<any> = await res.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to add item to cart");
      }
      
      console.log('🔍 CLEAN CART MUTATION - Success:', data);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      
      // Show success toast
      toast({
        title: "Added to Cart",
        description: `Added ${variables.quantity} item(s) to your cart`,
        variant: "default"
      });
      
      // Open cart to show the added item
      setIsOpen(true);
    },
    onError: (error) => {
      // Only show error toast for non-authentication errors
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
      
      // Check for 401 authentication error before parsing JSON
      if (res.status === 401) {
        setLocation('/auth');
        return;
      }
      
      const data: StandardApiResponse<any> = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to update cart item");
      }
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      await refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update cart item",
        variant: "destructive"
      });
    }
  });
  
  // Remove from cart mutation
  const removeFromCartMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/cart/${id}`);
      
      // Check for 401 authentication error before parsing JSON
      if (res.status === 401) {
        setLocation('/auth');
        return;
      }
      
      const data: StandardApiResponse<any> = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to remove item from cart");
      }
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      await refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove item from cart",
        variant: "destructive"
      });
    }
  });
  
  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/cart');
      
      // Check for 401 authentication error before parsing JSON
      if (res.status === 401) {
        setLocation('/auth');
        return;
      }
      
      const data: StandardApiResponse<any> = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to clear cart");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear cart",
        variant: "destructive"
      });
    }
  });

  // Remove attribute option mutation
  const removeAttributeOptionMutation = useMutation({
    mutationFn: async ({ cartItemId, attributeName, attributeValue }: { cartItemId: number, attributeName: string, attributeValue: string }) => {
      const res = await apiRequest('PATCH', `/api/cart/${cartItemId}/remove-attribute`, {
        attributeName,
        attributeValue
      });
      
      // Check for 401 authentication error before parsing JSON
      if (res.status === 401) {
        setLocation('/auth');
        return;
      }
      
      const data: StandardApiResponse<any> = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to remove attribute option");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove attribute option",
        variant: "destructive"
      });
    }
  });
  
  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  
  // Clean addItem implementation that extracts only what the server needs
  const addItem = (item: Omit<CartItemWithDiscounts, 'id' | 'discountData' | 'totalDiscount'> & { itemPrice: number }) => {
    console.log('🔍 ADD ITEM DEBUG - Received item in cart hook:', item);
    console.log('🔍 ADD ITEM DEBUG - attributeSelections field:', item.attributeSelections);
    
    // Extract only the fields the server expects
    const cartItemData = {
      productId: item.productId,
      quantity: item.quantity,
      itemPrice: item.itemPrice,
      attributeSelections: item.attributeSelections
    };
    
    console.log('🔍 ADD ITEM DEBUG - Sending to mutation:', cartItemData);
    addToCartMutation.mutate(cartItemData);
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

  const removeAttributeOption = (cartItemId: number, attributeName: string, attributeValue: string) => {
    removeAttributeOptionMutation.mutate({ cartItemId, attributeName, attributeValue });
  };
  
  // Add comprehensive loading state that includes all mutation states
  const isLoadingState = isLoading || addToCartMutation.isPending || updateCartMutation.isPending || removeFromCartMutation.isPending;
  
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
        removeAttributeOption,
        clearCart,
        cartSummary,
        isLoading: isLoadingState
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}