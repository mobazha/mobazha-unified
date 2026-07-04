import { useCallback, useId, useState, type FormEvent } from 'react';
import {
  COMMERCE_LABEL_KEYS,
  resolveCommerceErrorLabel,
  type CommerceLabelResolver,
} from '../labels';
import { CommerceButton, CommerceCard, CommercePageHeader } from '../ui';
import type { CommerceGuestCheckoutPort } from './contracts';
import { useGuestCheckoutWorkflow } from './useGuestCheckoutWorkflow';

const EMPTY_COINS: readonly string[] = [];

export interface CommerceGuestItem {
  listingSlug: string;
  listingHash: string;
  title?: string;
  quantity: number;
}

export interface GuestCheckoutPanelProps {
  port: CommerceGuestCheckoutPort;
  items: readonly CommerceGuestItem[];
  labels: CommerceLabelResolver;
  title?: string;
  formatError?(error: unknown): string;
}

export function GuestCheckoutPanel({
  port,
  items,
  labels,
  title = labels(COMMERCE_LABEL_KEYS.checkout.title),
  formatError,
}: GuestCheckoutPanelProps) {
  const paymentMethodId = useId();
  const contactEmailId = useId();
  const [coin, setCoin] = useState('');
  const [email, setEmail] = useState('');
  const { state, reloadSettings, submit: submitOrder } = useGuestCheckoutWorkflow(port);
  const coins = state.settings?.availableCoins ?? EMPTY_COINS;
  const selectedCoin = coins.includes(coin) ? coin : coins[0] || '';
  const busy = state.status === 'submitting';
  const order = state.status === 'awaiting-payment' ? state.order : undefined;
  const error = state.status === 'error' ? state.error : undefined;
  const errorLabel = useCallback(
    (next: unknown): string =>
      formatError ? formatError(next) : resolveCommerceErrorLabel(next, labels),
    [formatError, labels]
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedCoin || items.length === 0) return;
    await submitOrder({
      items: [...items],
      paymentCoin: selectedCoin,
      contactEmail: email || undefined,
    });
  }

  if (order) {
    return (
      <>
        <CommercePageHeader title={labels(COMMERCE_LABEL_KEYS.checkout.paymentRequested)} />
        <CommerceCard aria-live="polite">
          <p>{labels(COMMERCE_LABEL_KEYS.checkout.sendExactly)}</p>
          <strong>
            {order.paymentAmount} {order.paymentCoin}
          </strong>
          <p className="commerce-monospace">{order.paymentAddress}</p>
          <p>
            {labels(COMMERCE_LABEL_KEYS.checkout.order)}: {order.orderToken}
          </p>
          <p>
            {labels(COMMERCE_LABEL_KEYS.checkout.expires)}: {order.expiresAt}
          </p>
        </CommerceCard>
      </>
    );
  }

  if (state.status === 'unavailable') {
    return (
      <>
        <CommercePageHeader title={title} />
        <CommerceCard role="status">
          {labels(
            state.reason === 'disabled'
              ? COMMERCE_LABEL_KEYS.checkout.disabled
              : COMMERCE_LABEL_KEYS.checkout.noPaymentMethods
          )}
        </CommerceCard>
      </>
    );
  }

  if (state.status === 'error' && state.operation === 'load-settings') {
    return (
      <>
        <CommercePageHeader title={title} />
        <CommerceCard role="alert">
          <p>{errorLabel(state.error)}</p>
          <CommerceButton type="button" onClick={() => void reloadSettings()}>
            {labels(COMMERCE_LABEL_KEYS.checkout.retry)}
          </CommerceButton>
        </CommerceCard>
      </>
    );
  }

  return (
    <>
      <CommercePageHeader
        title={title}
        description={labels(COMMERCE_LABEL_KEYS.checkout.description)}
      />
      <form className="commerce-checkout" aria-busy={busy} onSubmit={handleSubmit}>
        {items.map(item => (
          <CommerceCard key={`${item.listingHash}:${item.listingSlug}`}>
            <strong>{item.title || item.listingSlug}</strong>
            <p>
              {labels(COMMERCE_LABEL_KEYS.checkout.quantity)}: {item.quantity}
            </p>
          </CommerceCard>
        ))}
        <label htmlFor={paymentMethodId}>
          {labels(COMMERCE_LABEL_KEYS.checkout.paymentMethod)}
          <select
            id={paymentMethodId}
            value={selectedCoin}
            onChange={event => setCoin(event.target.value)}
            required
            disabled={busy}
          >
            <option value="" disabled>
              {labels(COMMERCE_LABEL_KEYS.checkout.selectPaymentMethod)}
            </option>
            {coins.map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={contactEmailId}>
          {labels(COMMERCE_LABEL_KEYS.checkout.contactEmailOptional)}
          <input
            id={contactEmailId}
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            disabled={busy}
          />
        </label>
        <CommerceButton type="submit" disabled={busy || !selectedCoin || items.length === 0}>
          {labels(
            busy
              ? COMMERCE_LABEL_KEYS.checkout.creatingOrder
              : COMMERCE_LABEL_KEYS.checkout.createOrder
          )}
        </CommerceButton>
      </form>
      {items.length === 0 ? <p>{labels(COMMERCE_LABEL_KEYS.checkout.noItems)}</p> : null}
      {error ? <p role="alert">{errorLabel(error)}</p> : null}
    </>
  );
}
