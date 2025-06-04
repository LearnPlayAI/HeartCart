import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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

  // Get user's credit balance
  const { data: creditBalanceResponse, isLoading: balanceLoading, error: balanceError } = useQuery<CreditBalanceResponse>({
    queryKey: ['/api/credits/balance'],
    refetchInterval: 30000, // Refetch every 30 seconds to keep balance updated
  });

  // Get user's credit transaction history
  const { data: transactionsResponse, isLoading: transactionsLoading } = useQuery<CreditTransactionsResponse>({
    queryKey: ['/api/credits/transactions'],
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