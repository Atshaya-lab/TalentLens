import React, { useState, useEffect } from 'react';

interface RealTimeTimerProps {
  startTime: string;
  endTime?: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  className?: string;
}

const RealTimeTimer: React.FC<RealTimeTimerProps> = ({ startTime, endTime, status, className }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const end = endTime ? new Date(endTime).getTime() : start + (30 * 60 * 1000); // Default 30 min if no end time

      if (status === 'scheduled') {
        // Show countdown to start
        if (now < start) {
          const diff = start - now;
          setTimeLeft(formatTimeDifference(diff));
          setIsActive(false);
        } else {
          setTimeLeft('Starting soon...');
          setIsActive(true);
        }
      } else if (status === 'in_progress') {
        // Show time remaining or elapsed
        if (now < end) {
          const diff = end - now;
          setTimeLeft(formatTimeDifference(diff));
          setIsActive(true);
        } else {
          setTimeLeft('Time up!');
          setIsActive(false);
        }
      } else if (status === 'completed') {
        const duration = end - start;
        setTimeLeft(`Duration: ${formatTimeDifference(duration)}`);
        setIsActive(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime, status]);

  const formatTimeDifference = (diff: number): string => {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getTimerColor = () => {
    if (status === 'completed') return 'text-gray-500';
    if (status === 'scheduled') return 'text-blue-600';
    if (isActive) {
      const remaining = timeLeft.includes('h') ? 60 : parseInt(timeLeft.split('m')[0]) || 0;
      if (remaining < 5) return 'text-red-600 animate-pulse';
      if (remaining < 15) return 'text-orange-600';
      return 'text-green-600';
    }
    return 'text-gray-500';
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'scheduled':
        return '⏰';
      case 'in_progress':
        return isActive ? '🔴' : '⏸️';
      case 'completed':
        return '✅';
      default:
        return '⏱️';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-lg">{getStatusIcon()}</span>
      <span className={`font-mono font-semibold ${getTimerColor()}`}>
        {timeLeft}
      </span>
      {status === 'in_progress' && isActive && (
        <span className="text-xs text-gray-500">remaining</span>
      )}
      {status === 'scheduled' && (
        <span className="text-xs text-gray-500">until start</span>
      )}
    </div>
  );
};

export default RealTimeTimer;
