import { useEffect, useState, type FormEvent } from 'react';
import type { CommerceHttpClient } from '../http';
import { CommerceButton, CommerceCard, CommercePageHeader } from '../ui';
import {
  createGuestCheckoutAdapter,
  type CommerceGuestOrderResponse,
} from './contracts';

export interface CommerceGuestItem {
  listingSlug: string;
  listingHash: string;
  title?: string;
  quantity: number;
}

export interface GuestCheckoutPanelProps {
  client: CommerceHttpClient;
  items: readonly CommerceGuestItem[];
  settingsPath?: string;
  ordersPath?: string;
  title?: string;
}

export function GuestCheckoutPanel({
  client,
  items,
  settingsPath = '/v1/settings/guest-checkout',
  ordersPath = '/v1/guest/orders',
  title = 'Guest checkout',
}: GuestCheckoutPanelProps) {
  const [coins, setCoins] = useState<string[]>([]);
  const [coin, setCoin] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<CommerceGuestOrderResponse>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const checkout = createGuestCheckoutAdapter(client, { settingsPath, ordersPath });
    void checkout
      .getSettings()
      .then(settings => {
        const available = settings.enabled ? settings.availableCoins : [];
        setCoins(available);
        setCoin(current => current || available[0] || '');
      })
      .catch(next => setError(next instanceof Error ? next.message : String(next)));
  }, [client, ordersPath, settingsPath]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!coin || items.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const checkout = createGuestCheckoutAdapter(client, { settingsPath, ordersPath });
      setOrder(await checkout.createOrder({ items: [...items], paymentCoin: coin, contactEmail: email || undefined }));
    } catch (next) {
      setError(next instanceof Error ? next.message : String(next));
    } finally {
      setBusy(false);
    }
  }

  if (order) {
    return (
      <>
        <CommercePageHeader title="Payment requested" />
        <CommerceCard>
          <p>Send exactly</p>
          <strong>
            {order.paymentAmount} {order.paymentCoin}
          </strong>
          <p className="commerce-monospace">{order.paymentAddress}</p>
          <p>Order: {order.orderToken}</p>
          <p>Expires: {order.expiresAt}</p>
        </CommerceCard>
      </>
    );
  }

  return (
    <>
      <CommercePageHeader title={title} description="No account is required." />
      <form className="commerce-checkout" onSubmit={submit}>
        {items.map(item => (
          <CommerceCard key={`${item.listingHash}:${item.listingSlug}`}>
            <strong>{item.title || item.listingSlug}</strong>
            <p>Quantity: {item.quantity}</p>
          </CommerceCard>
        ))}
        <label>
          Payment method
          <select value={coin} onChange={event => setCoin(event.target.value)} required>
            <option value="" disabled>
              Select a payment method
            </option>
            {coins.map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Contact email (optional)
          <input type="email" value={email} onChange={event => setEmail(event.target.value)} />
        </label>
        <CommerceButton type="submit" disabled={busy || !coin || items.length === 0}>
          {busy ? 'Creating order…' : 'Create order'}
        </CommerceButton>
      </form>
      {items.length === 0 ? <p>No checkout item was supplied.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </>
  );
}
