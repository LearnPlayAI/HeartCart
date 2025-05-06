import { useState, useEffect } from 'react';
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
  isExpired: boolean;
};

export const useCountdown = (endDate: Date | string): UseCountdownReturnType => {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(endDate));
  const [formattedTime, setFormattedTime] = useState('00:00:00');
  const [isExpired, setIsExpired] = useState(false);
  
  useEffect(() => {
    const updateCountdown = () => {
      const time = getTimeRemaining(endDate);
      setTimeRemaining(time);
      
      if (time.total <= 0) {
        setIsExpired(true);
        setFormattedTime('00:00:00');
        clearInterval(interval);
      } else {
        setFormattedTime(formatTimeRemaining({
          hours: time.days * 24 + time.hours,
          minutes: time.minutes,
          seconds: time.seconds
        }));
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [endDate]);
  
  return {
    timeRemaining,
    formattedTime,
    isExpired
  };
};
