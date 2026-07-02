import { useEffect, useState, type FormEvent } from 'react';
import type { CommerceHttpClient } from '../http';
import { CommerceButton, CommerceCard, CommercePageHeader } from '../ui';

export interface CommerceGuestItem {
  listingSlug: string;
  listingHash: string;
  title?: string;
  quantity: number;
}

interface GuestCheckoutSettingsDTO {
  enabled: boolean;
  acceptedCoins?: string;
  availableCoins?: string;
}

interface GuestOrderResponse {
  orderToken: string;
  paymentAddress: string;
  paymentAmount: string;
  paymentCoin: string;
  expiresAt: string;
}

export interface GuestCheckoutPanelProps {
  client: CommerceHttpClient;
  items: readonly CommerceGuestItem[];
  settingsPath?: string;
  ordersPath?: string;
  title?: string;
}

function coinList(settings: GuestCheckoutSettingsDTO): string[] {
  return (settings.availableCoins ?? settings.acceptedCoins ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

export function GuestCheckoutPanel({
  client,
  items,
  settingsPath = '/v1/guest-checkout/settings',
  ordersPath = '/v1/guest/orders',
  title = 'Guest checkout',
}: GuestCheckoutPanelProps) {
  const [coins, setCoins] = useState<string[]>([]);
  const [coin, setCoin] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<GuestOrderResponse>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void client
      .request<GuestCheckoutSettingsDTO>(settingsPath)
      .then(settings => {
        const available = settings.enabled ? coinList(settings) : [];
        setCoins(available);
        setCoin(current => current || available[0] || '');
      })
      .catch(next => setError(next instanceof Error ? next.message : String(next)));
  }, [client, settingsPath]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!coin || items.length === 0) return;
    setBusy(true);
    setError('');
    try {
      setOrder(
        await client.request<GuestOrderResponse>(ordersPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, paymentCoin: coin, contactEmail: email || undefined }),
        })
      );
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
