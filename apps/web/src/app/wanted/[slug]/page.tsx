// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.
/* global HTMLParagraphElement */

'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { copyToClipboard } from '@/lib/clipboard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { wantedCoinLabel } from '@/components/wanted/wantedCoins';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorAlert } from '@/components/ui/error-alert';
import { TokenIcon } from '@/components/Payment/TokenIcon';
import { BuyRequestStatusBadge } from '@/components/wanted/BuyRequestStatusBadge';
import { MessageBuyerButton } from '@/components/wanted/MessageBuyerButton';
import {
  getImageUrl,
  useTranslatedTexts,
  useAcceptBuyRequestOffer,
  useBuyRequestComments,
  useBuyRequestDetail,
  useCancelBuyRequest,
  useCreateBuyRequestComment,
  useCreateBuyRequestOffer,
  useI18n,
  useUserStore,
} from '@mobazha/core';
import type { BuyRequestComment, BuyRequestOffer } from '@mobazha/core';

/**
 * A request description, folded on small screens when it does not fit.
 *
 * The clamp is measured rather than guessed: the toggle only appears when
 * the rendered text is actually taller than the box showing it.
 */
function RequestDescription({ text }: { text: string }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [translated] = useTranslatedTexts([text]);
  const showingTranslation = Boolean(translated && translated !== text);
  const [overflowing, setOverflowing] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const measure = () => {
      const el = bodyRef.current;
      if (!el) return;
      setOverflowing(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text, expanded]);

  return (
    <div className="flex flex-col gap-1">
      {showingTranslation && (
        <p className="text-xs text-muted-foreground" title={t('common.machineTranslatedHint')}>
          {t('common.machineTranslated')}
        </p>
      )}
      <p
        ref={bodyRef}
        className={`whitespace-pre-line text-sm leading-relaxed text-muted-foreground ${
          expanded ? '' : 'line-clamp-4 sm:line-clamp-none'
        }`}
      >
        {translated || text}
      </p>
      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          className="self-start text-sm font-medium text-primary hover:underline"
        >
          {expanded ? t('common.collapse') : t('common.expand')}
        </button>
      )}
    </div>
  );
}

const OPEN_STATUS = 'open';
const ACCEPTED_OFFER_STATUS = 'accepted';

function shortPeer(peerID: string): string {
  if (!peerID) return '';
  return peerID.length > 14 ? `${peerID.slice(0, 14)}…` : peerID;
}

export default function BuyRequestDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const searchParams = useSearchParams();
  // A request is owned by one node and read everywhere else through that node,
  // which travels in the link as `peer`. Without it this node answers for
  // itself, which is what its own board links do.
  const peer = searchParams?.get('peer')?.trim() ?? '';
  const { profile } = useUserStore();

  const { request, offers, isLoading, error, refetch } = useBuyRequestDetail(slug || null, peer);
  // The node that owns this request: the one named in the link, or — once the
  // request has loaded — the buyer's node. A request found through the search
  // index arrives this way, and everything that reads or changes it has to
  // address that node rather than this one.
  const owner = peer || request?.buyerID?.peerID || '';
  const acceptOffer = useAcceptBuyRequestOffer(slug);
  const cancelRequest = useCancelBuyRequest(slug);
  const [actionFailed, setActionFailed] = useState(false);

  const isBuyer = !!request && !!profile?.peerID && request.buyerID.peerID === profile.peerID;
  const [title] = useTranslatedTexts([request?.title]);
  const showingTranslation = Boolean(title && title !== request?.title);
  const isOpen = request?.status === OPEN_STATUS;
  const budget = request?.budget?.max;

  // Only the seller whose offer won gets the bridge into the listing form:
  // publishing it is what turns this request into a real, escrowed order.
  const acceptedOffer = offers.find(offer => offer.status === ACCEPTED_OFFER_STATUS);
  const acceptedOfferIsMine =
    !!acceptedOffer && !!profile?.peerID && acceptedOffer.sellerID.peerID === profile.peerID;

  const handleAccept = async (offerID: string) => {
    setActionFailed(false);
    try {
      await acceptOffer.mutateAsync(offerID);
    } catch {
      setActionFailed(true);
    }
  };

  const handleCancel = async () => {
    setActionFailed(false);
    try {
      await cancelRequest.mutateAsync();
    } catch {
      setActionFailed(true);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <Container size="lg" className="py-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : !request ? (
            <>
              <ErrorAlert
                error={typeof error === 'string' ? error : null}
                onRetry={() => void refetch()}
              />
              <EmptyState
                title={t('wanted.emptyTitle', { defaultValue: 'No requests yet' })}
                description={t('wanted.errorLoad', {
                  defaultValue: 'Could not load requests. Please try again.',
                })}
              />
            </>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-2xl font-bold break-words sm:text-3xl">{title || request.title}</h1>
              {showingTranslation && (
                <p
                  className="text-xs text-muted-foreground"
                  title={t('common.machineTranslatedHint')}
                >
                  {t('common.machineTranslated')}
                </p>
              )}
                  <BuyRequestStatusBadge status={request.status} />
                </div>
                {request.description && <RequestDescription text={request.description} />}
              </div>

              {request.images && request.images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {request.images.map((image, index) => {
                    const src = getImageUrl(image.large || image.original);
                    return src ? (
                      <img
                        key={image.original + '-' + index}
                        src={src}
                        alt={title || request.title}
                        loading="lazy"
                        className="aspect-square w-full rounded-md border border-border object-cover"
                      />
                    ) : null;
                  })}
                </div>
              )}

              <Card>
                <CardContent className="p-6">
                  <dl className="grid grid-cols-2 gap-2.5 text-sm sm:grid-cols-3 lg:grid-cols-4">
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">
                        {t('wanted.newQuantity', { defaultValue: 'How many?' })}
                      </dt>
                      <dd className="mt-0.5 font-medium">
                        {request.quantity}
                        {request.unit ? ` ${request.unit}` : ''}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">
                        {t('wanted.newBudget', { defaultValue: 'Your maximum price' })}
                      </dt>
                      <dd className="mt-0.5 font-medium">
                        {budget ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-medium">{budget.amount}</span>
                            <TokenIcon token={budget.currency} size={16} />
                            {wantedCoinLabel(budget.currency)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">
                        {t('wanted.newCurrencies', { defaultValue: 'Accepted currencies' })}
                      </dt>
                      <dd className="mt-0.5 font-medium">
                        <span className="flex flex-wrap gap-x-3 gap-y-1">
                          {request.acceptedCurrencies.map(code => (
                            <span key={code} className="inline-flex items-center gap-1.5">
                              <TokenIcon token={code} size={16} />
                              {wantedCoinLabel(code)}
                            </span>
                          ))}
                        </span>
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">
                        {t('wanted.newDeliverTo', { defaultValue: 'Deliver to' })}
                      </dt>
                      <dd className="mt-0.5 font-medium">{request.deliverTo || '—'}</dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">
                        {t('wanted.newCategory', { defaultValue: 'Category' })}
                      </dt>
                      <dd className="mt-0.5 font-medium">{request.categorySlug || '—'}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <ErrorAlert
                error={
                  actionFailed
                    ? t('wanted.errorOffer', {
                        defaultValue: 'Could not send the offer. Please try again.',
                      })
                    : null
                }
              />

              {isBuyer && isOpen && (
                <div>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={cancelRequest.isPending}
                  >
                    {t('wanted.closeRequest', { defaultValue: 'Close request' })}
                  </Button>
                </div>
              )}

              {!isBuyer && <MessageBuyerButton buyerPeerID={request.buyerID.peerID} />}

              <section className="flex flex-col gap-4">
                <h2 className="text-xl font-semibold">
                  {t('wanted.offersTitle', { defaultValue: 'Offers' })}
                </h2>
                {offers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('wanted.offersEmpty', {
                      defaultValue: 'No offers yet. Sellers answer here.',
                    })}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {offers.map(offer => (
                      <OfferRow
                        key={offer.id}
                        offer={offer}
                        canAccept={isBuyer && isOpen}
                        accepting={acceptOffer.isPending}
                        onAccept={handleAccept}
                      />
                    ))}
                  </div>
                )}
              </section>

              {!isBuyer && isOpen && (
                <OfferForm
                  slug={slug}
                  peer={owner}
                  acceptedCurrencies={request.acceptedCurrencies}
                />
              )}

              {acceptedOfferIsMine && (
                <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground">
                    {t('wanted.createListingHint', {
                      defaultValue:
                        'The buyer picked your offer. Publish it as a product so the order can be placed normally.',
                    })}
                  </p>
                  <Button asChild className="self-start">
                    <Link
                      href={
                        `/listing/new?from=wanted&wanted=${encodeURIComponent(slug)}` +
                        `&offer=${encodeURIComponent(acceptedOffer.id)}` +
                        (owner ? `&peer=${encodeURIComponent(owner)}` : '')
                      }
                    >
                      {t('wanted.createListing', {
                        defaultValue: 'Create a product from this offer',
                      })}
                    </Link>
                  </Button>
                </div>
              )}

              {isBuyer && !peer && (
                <ShareRequestLink slug={slug} buyerPeerID={request.buyerID.peerID} />
              )}

              <CommentsSection
                slug={slug}
                peer={owner}
                canComment={isOpen || request.status === 'locked'}
              />
            </div>
          )}
        </Container>
      </div>
      <Footer />
    </>
  );
}

function OfferRow({
  offer,
  canAccept,
  accepting,
  onAccept,
}: {
  offer: BuyRequestOffer;
  canAccept: boolean;
  accepting: boolean;
  onAccept: (offerID: string) => void;
}) {
  const { t } = useI18n();
  const accepted = offer.status === 'accepted';
  const rejected = offer.status === 'rejected';

  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-semibold">
              {offer.unitPrice.amount} {wantedCoinLabel(offer.unitPrice.currency)}
            </span>
            <span className="text-xs text-muted-foreground">
              {shortPeer(offer.sellerID.peerID)}
            </span>
          </div>
          {accepted && (
            <Badge variant="secondary">
              {t('wanted.statusLocked', { defaultValue: 'Offer accepted' })}
            </Badge>
          )}
          {rejected && (
            <Badge variant="outline">
              {t('wanted.statusCancelled', { defaultValue: 'Closed' })}
            </Badge>
          )}
        </div>

        <dl className="grid grid-cols-3 gap-x-4 text-xs text-muted-foreground">
          <dt>{t('wanted.offerQuantity', { defaultValue: 'Quantity' })}</dt>
          <dt>{t('wanted.offerLeadTime', { defaultValue: 'Ships in (days)' })}</dt>
          <dt>{t('wanted.offerShipsFrom', { defaultValue: 'Ships from' })}</dt>
          <dd className="text-foreground">{offer.quantity}</dd>
          <dd className="text-foreground">{offer.leadTimeDays}</dd>
          <dd className="text-foreground">{offer.shipsFrom || '—'}</dd>
        </dl>

        {offer.note && <p className="text-sm text-muted-foreground">{offer.note}</p>}

        {canAccept && offer.status === 'submitted' && (
          <Button onClick={() => onAccept(offer.id)} disabled={accepting}>
            {t('wanted.offerAccept', { defaultValue: 'Accept this offer' })}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function OfferForm({
  slug,
  peer,
  acceptedCurrencies,
}: {
  slug: string;
  peer?: string;
  acceptedCurrencies: string[];
}) {
  const { t } = useI18n();
  const createOffer = useCreateBuyRequestOffer(slug, peer);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState(acceptedCurrencies[0] ?? '');
  const [quantity, setQuantity] = useState('1');
  const [leadTimeDays, setLeadTimeDays] = useState('3');
  const [shipsFrom, setShipsFrom] = useState('');
  const [note, setNote] = useState('');
  const [failed, setFailed] = useState(false);

  const canSubmit = price.trim().length > 0 && currency.trim().length > 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFailed(false);
    const parsedQuantity = Number.parseInt(quantity, 10);
    try {
      await createOffer.mutateAsync({
        unitPrice: { amount: price.trim(), currency },
        quantity: Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1,
        leadTimeDays: Number.parseInt(leadTimeDays, 10) || 0,
        shipsFrom: shipsFrom.trim().toUpperCase(),
        note: note.trim(),
      });
      setPrice('');
      setNote('');
    } catch {
      setFailed(true);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <h2 className="text-xl font-semibold">
            {t('wanted.offerFormTitle', { defaultValue: 'Your offer' })}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-price">
                {t('wanted.offerPrice', { defaultValue: 'Price' })}
              </Label>
              <Input
                id="offer-price"
                inputMode="decimal"
                value={price}
                onChange={event => setPrice(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-currency">
                {t('wanted.newCurrencies', { defaultValue: 'Accepted currencies' })}
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="offer-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {acceptedCurrencies.map(code => (
                    <SelectItem key={code} value={code}>
                      <span className="flex items-center gap-2">
                        <TokenIcon token={code} size={16} />
                        {wantedCoinLabel(code)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-quantity">
                {t('wanted.offerQuantity', { defaultValue: 'Quantity' })}
              </Label>
              <Input
                id="offer-quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={event => setQuantity(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-lead">
                {t('wanted.offerLeadTime', { defaultValue: 'Ships in (days)' })}
              </Label>
              <Input
                id="offer-lead"
                type="number"
                min={0}
                value={leadTimeDays}
                onChange={event => setLeadTimeDays(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-ships-from">
                {t('wanted.offerShipsFrom', { defaultValue: 'Ships from' })}
              </Label>
              <Input
                id="offer-ships-from"
                value={shipsFrom}
                onChange={event => setShipsFrom(event.target.value)}
                maxLength={2}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="offer-note">
              {t('wanted.offerNote', { defaultValue: 'Why your offer is better (optional)' })}
            </Label>
            <textarea
              id="offer-note"
              value={note}
              onChange={event => setNote(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <ErrorAlert
            error={
              failed
                ? t('wanted.errorOffer', {
                    defaultValue: 'Could not send the offer. Please try again.',
                  })
                : null
            }
          />

          <Button type="submit" disabled={!canSubmit || createOffer.isPending}>
            {createOffer.isPending
              ? t('wanted.offerSubmitting', { defaultValue: 'Sending...' })
              : t('wanted.offerSubmit', { defaultValue: 'Send offer' })}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CommentsSection({
  slug,
  peer,
  canComment,
}: {
  slug: string;
  peer?: string;
  canComment: boolean;
}) {
  const { t } = useI18n();
  const { comments, total, isLoading } = useBuyRequestComments(slug, peer);
  const createComment = useCreateBuyRequestComment(slug, peer);

  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<BuyRequestComment | null>(null);
  const [failed, setFailed] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    setFailed(false);
    try {
      await createComment.mutateAsync({
        body: text,
        ...(replyTo ? { parentCommentID: replyTo.id } : {}),
      });
      setBody('');
      setReplyTo(null);
    } catch {
      setFailed(true);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">
        {t('wanted.commentsTitle', { defaultValue: 'Comments' })}
        {total > 0 ? ` (${total})` : ''}
      </h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('wanted.commentsEmpty', { defaultValue: 'No comments yet.' })}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map(comment => (
            <div key={comment.id} className="flex flex-col gap-2">
              <CommentRow
                comment={comment}
                canReply={canComment}
                onReply={() => setReplyTo(comment)}
              />
              {(comment.replies ?? []).length > 0 && (
                <div className="ml-6 flex flex-col gap-2 border-l border-border pl-3">
                  {(comment.replies ?? []).map(reply => (
                    <CommentRow key={reply.id} comment={reply} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canComment ? (
        <form onSubmit={submit} className="flex flex-col gap-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {t('wanted.commentReplyingTo', { defaultValue: 'Replying to' })}{' '}
                {shortPeer(replyTo.authorID.peerID)}
              </span>
              <button type="button" className="underline" onClick={() => setReplyTo(null)}>
                {t('wanted.commentCancelReply', { defaultValue: 'Cancel' })}
              </button>
            </div>
          )}
          <textarea
            id="wanted-comment"
            value={body}
            onChange={event => setBody(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t('wanted.commentPlaceholder', {
              defaultValue: 'Ask a question or add a detail…',
            })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <ErrorAlert
            error={
              failed
                ? t('wanted.errorComment', {
                    defaultValue: 'Could not post the comment. Please try again.',
                  })
                : null
            }
          />
          <Button type="submit" disabled={!body.trim() || createComment.isPending}>
            {createComment.isPending
              ? t('wanted.commentSubmitting', { defaultValue: 'Posting...' })
              : t('wanted.commentSubmit', { defaultValue: 'Post comment' })}
          </Button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t('wanted.commentClosed', {
            defaultValue: 'This request is closed, so its thread is read-only.',
          })}
        </p>
      )}
    </section>
  );
}

/**
 * The link a buyer hands to sellers.
 *
 * The board is node-local, so a seller on another node reaches this request by
 * naming the node that owns it. The buyer is the one who knows that link, so it
 * is offered here rather than anywhere a seller could look it up.
 *
 * The origin is read when the link is built, not when the page is rendered, so
 * the same line of code works before and after hydration.
 */
function shareRequestLink(slug: string, buyerPeerID: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/wanted/${encodeURIComponent(slug)}?peer=${encodeURIComponent(buyerPeerID)}`;
}

function ShareRequestLink({ slug, buyerPeerID }: { slug: string; buyerPeerID: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  if (!buyerPeerID) return null;
  const link = shareRequestLink(slug, buyerPeerID);

  const copy = async () => {
    // A denied clipboard leaves the link on screen, so it can still be
    // copied by hand.
    setCopied(await copyToClipboard(link));
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground">
        {t('wanted.shareLinkHint', {
          defaultValue: 'Sellers on another node reach this request through this link.',
        })}
      </p>
      <code className="break-all rounded bg-muted px-2 py-1 text-xs">{link}</code>
      <Button variant="outline" className="self-start" onClick={copy}>
        {copied
          ? t('wanted.shareLinkCopied', { defaultValue: 'Link copied' })
          : t('wanted.shareLink', { defaultValue: 'Copy link' })}
      </Button>
    </div>
  );
}

function CommentRow({
  comment,
  canReply,
  onReply,
}: {
  comment: BuyRequestComment;
  canReply?: boolean;
  onReply?: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-md border border-border p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{shortPeer(comment.authorID.peerID)}</span>
        <span>{new Date(comment.createdAt).toLocaleString()}</span>
      </div>
      <p className="text-sm whitespace-pre-line">{comment.body}</p>
      {canReply && onReply && (
        <button type="button" className="self-start text-xs underline" onClick={onReply}>
          {t('wanted.commentReply', { defaultValue: 'Reply' })}
        </button>
      )}
    </div>
  );
}
