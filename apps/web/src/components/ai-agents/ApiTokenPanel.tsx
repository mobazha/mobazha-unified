'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useI18n, apiTokensApi } from '@mobazha/core';
import type { ApiTokenInfo, ScopeInfo } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Key, Loader2, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiTokenPanelProps {
  refreshKey?: number;
}

export function ApiTokenPanel({ refreshKey }: ApiTokenPanelProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<ApiTokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiTokenInfo | null>(null);

  const loadTokens = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiTokensApi.listTokens();
      setTokens(Array.isArray(data) ? data : []);
    } catch {
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens, refreshKey]);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await apiTokensApi.revokeToken(String(revokeTarget.id));
      toast({ title: 'Token revoked' });
      setRevokeTarget(null);
      loadTokens();
    } catch {
      toast({ title: 'Failed to revoke token', variant: 'destructive' });
    }
  };

  const activeTokens = tokens.filter(t => !t.revoked);
  const revokedTokens = tokens.filter(t => t.revoked);

  return (
    <div className="border border-border rounded-lg">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {t('aiAgents.connectionKeysAdvanced')}
          </span>
          {activeTokens.length > 0 && (
            <span className="text-xs text-muted-foreground">({activeTokens.length})</span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">{t('aiAgents.tokens.title')}</h4>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              {t('aiAgents.tokens.create')}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t('aiAgents.tokens.empty')}
            </p>
          ) : (
            <div className="space-y-2">
              {activeTokens.map(token => (
                <TokenRow key={token.id} token={token} onRevoke={() => setRevokeTarget(token)} />
              ))}
              {revokedTokens.map(token => (
                <TokenRow key={token.id} token={token} />
              ))}
            </div>
          )}
        </div>
      )}

      <CreateTokenDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={loadTokens} />

      <AlertDialog open={!!revokeTarget} onOpenChange={open => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('aiAgents.tokens.revoke')}</AlertDialogTitle>
            <AlertDialogDescription>{t('aiAgents.tokens.revokeConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground"
            >
              {t('aiAgents.tokens.revoke')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TokenRow({ token, onRevoke }: { token: ApiTokenInfo; onRevoke?: () => void }) {
  const { t } = useI18n();
  const created = new Date(token.created_at).toLocaleDateString();

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border',
        token.revoked && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Shield className="w-4 h-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {token.name}
            {token.auto_label && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({t('aiAgents.tokens.autoLabel', { client: token.auto_label })})
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {created}
            {token.scopes?.length > 0 && ` · ${token.scopes.join(', ')}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={cn(
            'text-xs px-1.5 py-0.5 rounded',
            token.revoked ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          )}
        >
          {token.revoked ? t('aiAgents.tokens.revoked') : t('aiAgents.tokens.active')}
        </span>
        {!token.revoked && onRevoke && (
          <button
            onClick={onRevoke}
            className="p-1 rounded hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        )}
      </div>
    </div>
  );
}

interface CreateTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function CreateTokenDialog({ open, onOpenChange, onCreated }: CreateTokenDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [expiryDays, setExpiryDays] = useState(90);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const resp = await apiTokensApi.createToken({
        name: name.trim(),
        scopes: ['seller:*'],
        expires_in_days: expiryDays,
      });
      setNewToken(resp.token);
      onCreated();
    } catch {
      toast({ title: t('aiAgents.tokens.createFailed'), variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setName('');
      setNewToken(null);
      setCopied(false);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('aiAgents.tokens.createTitle')}</DialogTitle>
        </DialogHeader>

        {newToken ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
              {t('aiAgents.tokenOnlyOnce')}
            </p>
            <div className="flex items-start gap-2 bg-muted rounded-md p-3">
              <code className="flex-1 text-xs font-mono break-all text-foreground">{newToken}</code>
              <button onClick={handleCopy} className="shrink-0 p-1 rounded hover:bg-background">
                {copied ? (
                  <span className="text-xs text-primary">{t('aiAgents.copied')}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{t('aiAgents.copyCommand')}</span>
                )}
              </button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>{t('common.done')}</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">
                {t('aiAgents.tokens.nameLabel')}
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('aiAgents.tokens.namePlaceholder')}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                {t('aiAgents.tokens.expiresLabel')}
              </label>
              <div className="flex gap-2 mt-1">
                {[
                  { days: 90, label: t('aiAgents.tokens.expires90') },
                  { days: 365, label: t('aiAgents.tokens.expires365') },
                  { days: 0, label: t('aiAgents.tokens.expiresNever') },
                ].map(opt => (
                  <button
                    key={opt.days}
                    onClick={() => setExpiryDays(opt.days)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md border transition-colors',
                      expiryDays === opt.days
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim() || creating}>
                {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {t('aiAgents.tokens.create')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
