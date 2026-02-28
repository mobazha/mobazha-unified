'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n, profileApi } from '@mobazha/core';
import type { UserProfile } from '@mobazha/core';
import { ArrowLeft, FileText, RotateCcw } from 'lucide-react';

type ProfileWithPolicies = UserProfile & {
  termsAndConditions?: string;
  refundPolicy?: string;
};
import { VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function StorePoliciesPage() {
  const { peerId } = useParams<{ peerId: string }>();
  const { t } = useI18n();
  const [profile, setProfile] = useState<ProfileWithPolicies | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!peerId) return;
    let cancelled = false;
    profileApi
      .getProfile(peerId)
      .then(p => {
        if (!cancelled) setProfile(p as ProfileWithPolicies | null);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [peerId]);

  const hasTerms = !!profile?.termsAndConditions?.trim();
  const hasRefund = !!profile?.refundPolicy?.trim();
  const hasPolicies = hasTerms || hasRefund;

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/store/${peerId}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            {t('policies.backToStore')}
          </Button>
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">{t('settings.storePolicies')}</h1>

      {loading ? (
        <VStack gap="lg">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </VStack>
      ) : !hasPolicies ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>{t('policies.noPolicies')}</p>
          </CardContent>
        </Card>
      ) : (
        <VStack gap="lg">
          {hasTerms && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  {t('policies.termsOfService')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {profile!.termsAndConditions}
                </div>
              </CardContent>
            </Card>
          )}

          {hasRefund && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RotateCcw className="h-5 w-5 text-muted-foreground" />
                  {t('policies.returns')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {profile!.refundPolicy}
                </div>
              </CardContent>
            </Card>
          )}
        </VStack>
      )}
    </div>
  );
}
