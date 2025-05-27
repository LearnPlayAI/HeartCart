import { useState, useEffect, useCallback, useMemo } from 'react';
import { getTimeRemaining, formatTimeRemaining } from '@/lib/utils';

type UseCountdownReturnType = {
  timeRemaining: {
    total: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  formattedTime: string;
  humanReadableTime: string;
  isExpired: boolean;
};

export const useCountdown = (endDate: Date | string): UseCountdownReturnType => {
  // Memoize the target end date to prevent unnecessary recalculations
  const targetEndDate = useMemo(() => {
    return typeof endDate === 'string' ? endDate : endDate.toISOString();
  }, [endDate]);

  const [currentTime, setCurrentTime] = useState(Date.now());

  // Calculate time remaining based on current time
  const timeRemaining = useMemo(() => {
    return getTimeRemaining(targetEndDate);
  }, [targetEndDate, currentTime]);

  const formatHumanReadable = useCallback((time: { days: number; hours: number; minutes: number; seconds: number }) => {
    const parts = [];
    
    if (time.days > 0) {
      parts.push(`${time.days} day${time.days !== 1 ? 's' : ''}`);
    }
    if (time.hours > 0) {
      parts.push(`${time.hours} hour${time.hours !== 1 ? 's' : ''}`);
    }
    if (time.days === 0 && time.minutes > 0) {
      parts.push(`${time.minutes} min${time.minutes !== 1 ? 's' : ''}`);
    }
    
    if (parts.length === 0) {
      return time.seconds > 0 ? `${time.seconds} sec${time.seconds !== 1 ? 's' : ''}` : 'Expired';
    }
    
    return parts.slice(0, 2).join(', ');
  }, []);

  // Derived values
  const isExpired = timeRemaining.total <= 0;
  const formattedTime = isExpired ? '00:00:00' : formatTimeRemaining({
    hours: timeRemaining.days * 24 + timeRemaining.hours,
    minutes: timeRemaining.minutes,
    seconds: timeRemaining.seconds
  });
  const humanReadableTime = isExpired ? 'Expired' : formatHumanReadable(timeRemaining);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    timeRemaining,
    formattedTime,
    humanReadableTime,
    isExpired
  };
};
