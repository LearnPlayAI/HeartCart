import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface PromotionCountdownProps {
  endDate: string;
  className?: string;
  showIcon?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function PromotionCountdown({ endDate, className = '', showIcon = true }: PromotionCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endDate);
      const now = new Date();
      const difference = end.getTime() - now.getTime();

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
      setIsExpired(false);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  if (isExpired) {
    return (
      <div className={`flex items-center text-sm text-muted-foreground ${className}`}>
        {showIcon && <Clock className="w-4 h-4 mr-1" />}
        <span>Promotion ended</span>
      </div>
    );
  }

  const formatTimeUnit = (value: number, unit: string) => {
    return (
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold text-primary">{value.toString().padStart(2, '0')}</span>
        <span className="text-xs text-muted-foreground uppercase">{unit}</span>
      </div>
    );
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showIcon && <Clock className="w-4 h-4 text-primary" />}
      <div className="flex items-center space-x-2">
        {timeLeft.days > 0 && (
          <>
            {formatTimeUnit(timeLeft.days, 'days')}
            <span className="text-muted-foreground">:</span>
          </>
        )}
        {formatTimeUnit(timeLeft.hours, 'hrs')}
        <span className="text-muted-foreground">:</span>
        {formatTimeUnit(timeLeft.minutes, 'min')}
        <span className="text-muted-foreground">:</span>
        {formatTimeUnit(timeLeft.seconds, 'sec')}
      </div>
    </div>
  );
}

// Mobile-optimized compact version
export function PromotionCountdownCompact({ endDate, className = '' }: PromotionCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endDate);
      const now = new Date();
      const difference = end.getTime() - now.getTime();

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
      setIsExpired(false);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  if (isExpired) {
    return (
      <span className={`text-sm text-red-500 font-medium ${className}`}>
        Ended
      </span>
    );
  }

  const formatCompact = () => {
    if (timeLeft.days > 0) {
      return `${timeLeft.days}d ${timeLeft.hours}h`;
    }
    if (timeLeft.hours > 0) {
      return `${timeLeft.hours}h ${timeLeft.minutes}m`;
    }
    return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
  };

  return (
    <span className={`text-sm text-primary font-medium ${className}`}>
      {formatCompact()}
    </span>
  );
}