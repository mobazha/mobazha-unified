'use client';

/**
 * CountdownSection — PG-201
 *
 * Countdown timer for sales, launches, or events.
 */

import { useState, useEffect, useRef } from 'react';
import type { CountdownSectionProps } from '@mobazha/core';
import { useI18n } from '@mobazha/core';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calcTimeLeft(target: string): TimeLeft {
  const ms = new Date(target).getTime();
  if (Number.isNaN(ms)) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const diff = ms - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[4.5rem]">
      <span
        className="text-3xl sm:text-4xl font-bold tabular-nums"
        style={{ color: 'var(--store-primary)' }}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-xs sm:text-sm text-muted-foreground mt-1 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

export function CountdownSection({
  title,
  targetDate,
  endMessage,
  showDays = true,
  showHours = true,
  showMinutes = true,
  showSeconds = true,
}: CountdownSectionProps) {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(targetDate));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(calcTimeLeft(targetDate));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [targetDate]);

  if (!targetDate) return null;

  return (
    <div className="py-6 text-center">
      {title && (
        <h2
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: 'var(--store-font, inherit)' }}
        >
          {title}
        </h2>
      )}
      {timeLeft.expired ? (
        <p className="text-lg text-muted-foreground">
          {endMessage || t('admin.storeBranding.countdownEnded')}
        </p>
      ) : (
        <div className="flex justify-center gap-3 sm:gap-6">
          {showDays && (
            <TimeUnit value={timeLeft.days} label={t('admin.storeBranding.countdownDays')} />
          )}
          {showHours && (
            <TimeUnit value={timeLeft.hours} label={t('admin.storeBranding.countdownHours')} />
          )}
          {showMinutes && (
            <TimeUnit value={timeLeft.minutes} label={t('admin.storeBranding.countdownMinutes')} />
          )}
          {showSeconds && (
            <TimeUnit value={timeLeft.seconds} label={t('admin.storeBranding.countdownSeconds')} />
          )}
        </div>
      )}
    </div>
  );
}
