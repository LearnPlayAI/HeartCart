import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

export interface CreditBalance {
  userId: number;
  totalCredits: string;
  availableCredits: string;
}

export interface CreditTransaction {
  id: number;
  userId: number;
  orderId?: number;
  transactionType: 'earned' | 'used';
  amount: string;
  description: string;
  createdAt: string;
}

export interface CreditBalanceResponse {
  success: boolean;
  data: CreditBalance;
}

export interface CreditTransactionsResponse {
  success: boolean;
  data: CreditTransaction[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export function useCredits() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Only make API calls if user is authenticated
  const isAuthenticated = !!user;

  // Get user's credit balance
  const { data: creditBalanceResponse, isLoading: balanceLoading, error: balanceError } = useQuery<CreditBalanceResponse>({
    queryKey: ['/api/credits/balance'],
    enabled: isAuthenticated, // Only run query if user is authenticated
    staleTime: 0, // No cache - always fetch fresh credit data
    gcTime: 0, // Don't keep in cache when component unmounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
    refetchInterval: 30000, // Refetch every 30 seconds to keep balance updated
  });

  // Get user's credit transaction history
  const { data: transactionsResponse, isLoading: transactionsLoading } = useQuery<CreditTransactionsResponse>({
    queryKey: ['/api/credits/transactions'],
    enabled: isAuthenticated, // Only run query if user is authenticated
    staleTime: 0, // No cache - always fetch fresh transaction data
    gcTime: 0, // Don't keep in cache when component unmounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });

  const creditBalance = creditBalanceResponse?.success ? creditBalanceResponse.data : null;
  const transactions = transactionsResponse?.success ? transactionsResponse.data : [];

  // Helper to invalidate credit-related queries
  const invalidateCredits = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
    queryClient.invalidateQueries({ queryKey: ['/api/credits/transactions'] });
  };

  return {
    creditBalance,
    transactions,
    balanceLoading,
    transactionsLoading,
    balanceError,
    invalidateCredits,
    // Formatted credit balance for display
    formattedBalance: creditBalance ? `R${parseFloat(creditBalance.availableCredits.toString()).toFixed(2)}` : 'R0.00',
    hasCredits: creditBalance ? parseFloat(creditBalance.availableCredits.toString()) > 0 : false,
  };
}