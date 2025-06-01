import { useState } from 'react';
import { X, Tag, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PromotionCountdownCompact } from './PromotionCountdown';

interface Promotion {
  id: number;
  promotionName: string;
  description?: string;
  startDate: string;
  endDate: string;
  promotionType: string;
  discountValue: number;
  minimumOrderValue?: number;
  status: string;
}

interface PromotionBannerProps {
  promotion: Promotion;
  onDismiss?: () => void;
  className?: string;
  variant?: 'banner' | 'card' | 'compact';
}

export function PromotionBanner({ 
  promotion, 
  onDismiss, 
  className = '',
  variant = 'banner' 
}: PromotionBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  const formatDiscount = () => {
    if (promotion.promotionType === 'percentage') {
      return `${promotion.discountValue}% OFF`;
    }
    return `R${promotion.discountValue} OFF`;
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return 'bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4';
      case 'compact':
        return 'bg-primary/5 border-l-4 border-primary p-3';
      default:
        return 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4';
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`${getVariantStyles()} ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <Tag className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{promotion.promotionName}</p>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>{formatDiscount()}</span>
                {promotion.minimumOrderValue && (
                  <span>• Min R{promotion.minimumOrderValue}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <PromotionCountdownCompact endDate={promotion.endDate} />
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`${getVariantStyles()} ${className}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-primary" />
            <Badge variant="secondary" className="text-xs">
              {promotion.status}
            </Badge>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{promotion.promotionName}</h3>
          {promotion.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {promotion.description}
            </p>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{formatDiscount()}</div>
                {promotion.minimumOrderValue && (
                  <div className="text-xs text-muted-foreground">
                    Min R{promotion.minimumOrderValue}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span>Ends in</span>
              </div>
              <PromotionCountdownCompact endDate={promotion.endDate} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Banner variant (default)
  return (
    <div className={`${getVariantStyles()} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <Tag className="w-6 h-6 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="font-bold text-lg truncate">{promotion.promotionName}</h3>
              <Badge variant="secondary" className="text-xs">
                {formatDiscount()}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-sm opacity-90">
              {promotion.description && (
                <span className="truncate">{promotion.description}</span>
              )}
              {promotion.minimumOrderValue && (
                <span className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>Min R{promotion.minimumOrderValue}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 flex-shrink-0">
          <div className="text-right">
            <div className="text-sm opacity-90 mb-1">Ends in</div>
            <PromotionCountdownCompact 
              endDate={promotion.endDate} 
              className="text-primary-foreground font-medium"
            />
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}