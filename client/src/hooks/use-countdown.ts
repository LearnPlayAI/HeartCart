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
  humanReadableTime: string;
  isExpired: boolean;
};

export const useCountdown = (endDate: Date | string): UseCountdownReturnType => {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(endDate));
  const [formattedTime, setFormattedTime] = useState('00:00:00');
  const [humanReadableTime, setHumanReadableTime] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  
  const formatHumanReadable = (time: { days: number; hours: number; minutes: number; seconds: number }) => {
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
  };
  
  useEffect(() => {
    const updateCountdown = () => {
      const time = getTimeRemaining(endDate);
      setTimeRemaining(time);
      
      if (time.total <= 0) {
        setIsExpired(true);
        setFormattedTime('00:00:00');
        setHumanReadableTime('Expired');
        clearInterval(interval);
      } else {
        setFormattedTime(formatTimeRemaining({
          hours: time.days * 24 + time.hours,
          minutes: time.minutes,
          seconds: time.seconds
        }));
        setHumanReadableTime(formatHumanReadable(time));
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [endDate]);
  
  return {
    timeRemaining,
    formattedTime,
    humanReadableTime,
    isExpired
  };
};
