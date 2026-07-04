import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import type { CommerceHttpClient } from '../http';
import {
  COMMERCE_LABEL_KEYS,
  resolveCommerceErrorLabel,
  type CommerceLabelResolver,
} from '../labels';
import { CommerceButton, CommerceCard, CommercePageHeader } from '../ui';
import { createGuestCheckoutAdapter, type CommerceGuestOrderResponse } from './contracts';

export interface CommerceGuestItem {
  listingSlug: string;
  listingHash: string;
  title?: string;
  quantity: number;
}

export interface GuestCheckoutPanelProps {
  client: CommerceHttpClient;
  items: readonly CommerceGuestItem[];
  labels: CommerceLabelResolver;
  settingsPath?: string;
  ordersPath?: string;
  title?: string;
  formatError?(error: unknown): string;
}

export function GuestCheckoutPanel({
  client,
  items,
  labels,
  settingsPath = '/v1/settings/guest-checkout',
  ordersPath = '/v1/guest/orders',
  title = labels(COMMERCE_LABEL_KEYS.checkout.title),
  formatError,
}: GuestCheckoutPanelProps) {
  const paymentMethodId = useId();
  const contactEmailId = useId();
  const [coins, setCoins] = useState<string[]>([]);
  const [coin, setCoin] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<CommerceGuestOrderResponse>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const errorLabel = useCallback(
    (next: unknown): string =>
      formatError ? formatError(next) : resolveCommerceErrorLabel(next, labels),
    [formatError, labels]
  );

  useEffect(() => {
    const checkout = createGuestCheckoutAdapter(client, { settingsPath, ordersPath });
    void checkout
      .getSettings()
      .then(settings => {
        const available = settings.enabled ? settings.availableCoins : [];
        setCoins(available);
        setCoin(current => current || available[0] || '');
      })
      .catch(next => setError(errorLabel(next)));
  }, [client, errorLabel, ordersPath, settingsPath]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!coin || items.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const checkout = createGuestCheckoutAdapter(client, { settingsPath, ordersPath });
      setOrder(
        await checkout.createOrder({
          items: [...items],
          paymentCoin: coin,
          contactEmail: email || undefined,
        })
      );
    } catch (next) {
      setError(errorLabel(next));
    } finally {
      setBusy(false);
    }
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

  return (
    <>
      <CommercePageHeader
        title={title}
        description={labels(COMMERCE_LABEL_KEYS.checkout.description)}
      />
      <form className="commerce-checkout" aria-busy={busy} onSubmit={submit}>
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
            value={coin}
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
        <CommerceButton type="submit" disabled={busy || !coin || items.length === 0}>
          {labels(
            busy
              ? COMMERCE_LABEL_KEYS.checkout.creatingOrder
              : COMMERCE_LABEL_KEYS.checkout.createOrder
          )}
        </CommerceButton>
      </form>
      {items.length === 0 ? <p>{labels(COMMERCE_LABEL_KEYS.checkout.noItems)}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </>
  );
}
