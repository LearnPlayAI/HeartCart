import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, Calendar, CreditCard, Package, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCredits } from '@/hooks/use-credits';
import { formatCurrency } from '@/lib/utils';

const CreditHistory = () => {
  const { creditBalance, transactions, balanceLoading, transactionsLoading } = useCredits();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'used':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'refund':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned':
        return 'text-green-600';
      case 'used':
        return 'text-red-600';
      case 'refund':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'earned':
        return 'default';
      case 'used':
        return 'destructive';
      case 'refund':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (balanceLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Credit History</h1>
          <p className="text-muted-foreground">Track your TeeMeYou store credits and transactions</p>
        </div>
      </div>

      {/* Credit Balance Card */}
      <Card className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CreditCard className="h-5 w-5" />
            Current Credit Balance
          </CardTitle>
          <CardDescription>
            Your available store credit for future purchases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-green-700">
              {creditBalance ? formatCurrency(parseFloat(creditBalance.availableCredits)) : 'R0.00'}
            </span>
            <span className="text-sm text-green-600">available</span>
          </div>
          {creditBalance && parseFloat(creditBalance.totalCredits) > parseFloat(creditBalance.availableCredits) && (
            <div className="mt-2 text-sm text-muted-foreground">
              Total earned: {formatCurrency(parseFloat(creditBalance.totalCredits))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Complete history of your credit earnings and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div key={transaction.id}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                        {getTransactionIcon(transaction.transactionType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {transaction.description || 
                              (transaction.transactionType === 'earned' ? 'Credit Earned' :
                               transaction.transactionType === 'used' ? 'Credit Used' : 'Credit Refund')
                            }
                          </span>
                          <Badge variant={getBadgeVariant(transaction.transactionType)}>
                            {transaction.transactionType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(transaction.createdAt)}
                          </div>
                          {transaction.orderId && (
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              <Link 
                                href={`/orders/${transaction.orderId}`}
                                className="hover:underline text-blue-600"
                              >
                                Order #{transaction.orderId}
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-semibold ${getTransactionColor(transaction.transactionType)}`}>
                      {transaction.transactionType === 'earned' || transaction.transactionType === 'refund' ? '+' : '-'}
                      {formatCurrency(parseFloat(transaction.amount))}
                    </div>
                  </div>
                  {index < transactions.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-500 mb-4">
                Your credit transactions will appear here when you earn or use store credits.
              </p>
              <Button asChild>
                <Link href="/">Start Shopping</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditHistory;