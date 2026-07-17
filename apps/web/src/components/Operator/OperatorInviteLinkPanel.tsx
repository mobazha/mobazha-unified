// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { useI18n } from '@mobazha/core';
import {
  createMarketplaceInviteLink,
  listMarketplaceInviteLinks,
  revokeMarketplaceInviteLink,
} from '@mobazha/core/services/api/marketplace';
import type { MarketplaceInviteLink } from '@mobazha/core/types/marketplace';
import { Link2, Copy, Trash2 } from 'lucide-react';

function inviteLinkUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/join/marketplace/${encodeURIComponent(token)}`;
}

/**
 * Shareable seller-recruitment links: mint, copy, revoke. Replaces the
 * peerID-only invite flow for community recruiting — the operator posts the
 * URL where their sellers already are.
 */
export function OperatorInviteLinkPanel({ marketplaceId }: { marketplaceId: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [links, setLinks] = useState<MarketplaceInviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [maxUses, setMaxUses] = useState('');

  const reload = useCallback(async () => {
    try {
      const list = await listMarketplaceInviteLinks(marketplaceId);
      setLinks(list);
    } catch {
      // list failures are non-fatal; the mint flow surfaces its own errors
    } finally {
      setLoading(false);
    }
  }, [marketplaceId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    const parsedMax = maxUses.trim() === '' ? 0 : Number(maxUses);
    if (!Number.isInteger(parsedMax) || parsedMax < 0 || parsedMax > 10000) {
      toast({
        variant: 'destructive',
        description: t('marketplace.operator.inviteLinkMaxUsesInvalid', {
          defaultValue: 'Max uses must be a whole number between 0 (unlimited) and 10000.',
        }),
      });
      return;
    }
    setCreating(true);
    try {
      const link = await createMarketplaceInviteLink(marketplaceId, {
        autoApprove,
        maxUses: parsedMax,
      });
      setLinks(current => [link, ...current]);
      const copied = await copyToClipboard(inviteLinkUrl(link.token));
      toast({
        description: copied
          ? t('marketplace.operator.inviteLinkCreatedCopied', {
              defaultValue: 'Invite link created and copied.',
            })
          : t('marketplace.operator.inviteLinkCreated', { defaultValue: 'Invite link created.' }),
      });
    } catch {
      toast({
        variant: 'destructive',
        description: t('marketplace.operator.inviteLinkCreateFailed', {
          defaultValue: 'Could not create the invite link.',
        }),
      });
    } finally {
      setCreating(false);
    }
  }, [autoApprove, creating, marketplaceId, maxUses, t, toast]);

  const handleCopy = useCallback(
    async (link: MarketplaceInviteLink) => {
      const copied = await copyToClipboard(inviteLinkUrl(link.token));
      toast({
        description: copied
          ? t('marketplace.operator.inviteLinkCopied', { defaultValue: 'Link copied.' })
          : inviteLinkUrl(link.token),
      });
    },
    [t, toast]
  );

  const handleRevoke = useCallback(
    async (link: MarketplaceInviteLink) => {
      try {
        await revokeMarketplaceInviteLink(marketplaceId, link.id);
        // Reflect the revoke locally first — a failed refresh must not leave a
        // revoked link looking active.
        setLinks(current => current.filter(item => item.id !== link.id));
        void reload();
        toast({
          description: t('marketplace.operator.inviteLinkRevoked', {
            defaultValue: 'Invite link revoked.',
          }),
        });
      } catch {
        toast({
          variant: 'destructive',
          description: t('marketplace.operator.inviteLinkRevokeFailed', {
            defaultValue: 'Could not revoke the link.',
          }),
        });
      }
    },
    [marketplaceId, reload, t, toast]
  );

  const activeLinks = links.filter(link => !link.revokedAt);

  return (
    <Card className="mt-6" data-testid="operator-invite-link-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          {t('marketplace.operator.inviteLinksTitle', { defaultValue: 'Seller invite links' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          {t('marketplace.operator.inviteLinksDescription', {
            defaultValue:
              'Share a link in your community instead of inviting sellers one by one. Anyone opening it sees your marketplace terms — including your commission rate — and can join directly.',
          })}
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="invite-link-max-uses" className="text-xs">
              {t('marketplace.operator.inviteLinkMaxUses', {
                defaultValue: 'Max uses (0 = unlimited)',
              })}
            </Label>
            <Input
              id="invite-link-max-uses"
              inputMode="numeric"
              placeholder="0"
              className="max-w-[10rem]"
              value={maxUses}
              onChange={event => setMaxUses(event.target.value)}
              data-testid="invite-link-max-uses"
            />
          </div>
          <div className="flex items-center gap-2 pb-1.5">
            <Switch
              id="invite-link-auto-approve"
              checked={autoApprove}
              onCheckedChange={setAutoApprove}
              data-testid="invite-link-auto-approve"
            />
            <Label htmlFor="invite-link-auto-approve" className="text-xs">
              {t('marketplace.operator.inviteLinkAutoApprove', {
                defaultValue: 'Auto-approve sellers from this link',
              })}
            </Label>
          </div>
          <Button
            size="sm"
            onClick={() => void handleCreate()}
            disabled={creating}
            data-testid="invite-link-create"
          >
            {t('marketplace.operator.inviteLinkCreate', { defaultValue: 'Create link' })}
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">
            {t('common.loading', { defaultValue: 'Loading…' })}
          </p>
        ) : activeLinks.length === 0 ? (
          <p className="text-muted-foreground" data-testid="invite-links-empty">
            {t('marketplace.operator.inviteLinksEmpty', {
              defaultValue: 'No active invite links yet.',
            })}
          </p>
        ) : (
          <ul className="space-y-2" data-testid="invite-links-list">
            {activeLinks.map(link => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{inviteLinkUrl(link.token)}</p>
                  <p className="text-xs text-muted-foreground">
                    {link.autoApprove
                      ? t('marketplace.operator.inviteLinkModeAuto', {
                          defaultValue: 'Auto-approve',
                        })
                      : t('marketplace.operator.inviteLinkModeReview', {
                          defaultValue: 'Manual review',
                        })}
                    {' · '}
                    {t('marketplace.operator.inviteLinkUses', { defaultValue: 'Uses' })}:{' '}
                    {link.useCount}
                    {link.maxUses > 0 ? `/${link.maxUses}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => void handleCopy(link)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleRevoke(link)}
                    data-testid={`invite-link-revoke-${link.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
