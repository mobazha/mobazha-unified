'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n, acquireSaaSToken, systemApi } from '@mobazha/core';
import { Link2, Loader2 } from 'lucide-react';

export interface ConnectPlatformCardProps {
  onConnected: () => void;
  title?: string;
  description?: string;
  featureList?: string[];
  children?: React.ReactNode;
}

export function ConnectPlatformCard({
  onConnected,
  title,
  description,
  featureList,
  children,
}: ConnectPlatformCardProps) {
  const { t } = useI18n();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const result = await acquireSaaSToken();
      if (!result.success || !result.token) {
        setError(result.error || 'Failed to connect');
        return;
      }

      try {
        await systemApi.connectPlatform(result.token);
      } catch (err) {
        console.warn('connect-platform call failed (binding still works):', err);
      }

      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  }, [onConnected]);

  const displayTitle =
    title ||
    t('connectPlatform.title', {
      defaultValue: 'Connect to Mobazha Platform',
    });
  const displayDesc =
    description ||
    t('connectPlatform.description', {
      defaultValue: 'Connect to the Mobazha Platform to unlock additional features for your store.',
    });

  return (
    <Card className="p-6 md:p-8">
      <div className="text-center py-6">
        <Link2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">{displayTitle}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">{displayDesc}</p>

        {featureList && featureList.length > 0 && (
          <ul className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 space-y-1.5 text-left">
            {featureList.map((feature, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg max-w-sm mx-auto">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button onClick={handleConnect} disabled={connecting} className="mx-auto">
          {connecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {t('common.connecting', { defaultValue: 'Connecting...' })}
            </>
          ) : (
            t('connectPlatform.button', { defaultValue: 'Connect to Mobazha Platform' })
          )}
        </Button>

        {children}
      </div>
    </Card>
  );
}
