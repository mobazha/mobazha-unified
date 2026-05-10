/**
 * Outpost Store Seeder — API-based seeding for real backend tests.
 *
 * Creates a profile, a listing, and enables guest checkout via Basic Auth API calls.
 * Also completes the setup wizard (POST /v1/system/setup) so the admin UI works.
 * Used in Layer B (smoke) and Layer C (payment loop) tests.
 */

import type { APIRequestContext } from '@playwright/test';

const DUMMY_CID = 'QmfQkD8pBSBCBxWEwFSu4XaDVSWK6bjnNuaWZjMyQbyDub';

export const BTC_ASSET_ID = 'crypto:bip122:000000000019d6689c085ae165831e93:native';
export const XMR_ASSET_ID = 'crypto:monero:mainnet:native';

function basicAuth(password: string): string {
  return 'Basic ' + Buffer.from(`admin:${password}`).toString('base64');
}

export async function waitForHealthy(baseUrl: string, timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(`${baseUrl}/v1/system/setup`);
      if (resp.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`Outpost at ${baseUrl} not healthy after ${timeoutMs}ms`);
}

/**
 * Complete the one-time setup wizard. Without this, GET /v1/system/setup returns
 * setupComplete=false and the admin UI shows the wizard instead of the dashboard.
 * autoInit generates admin_password but does NOT write the setup_complete flag.
 */
async function completeSetupWizard(
  request: APIRequestContext,
  baseUrl: string,
  password: string,
  headers: Record<string, string>
): Promise<boolean> {
  try {
    const checkResp = await request.get(`${baseUrl}/v1/system/setup`);
    if (checkResp.ok()) {
      const body = await checkResp.json();
      const data = body.data ?? body;
      if (data.setupComplete) return true;
    }
  } catch {
    /* continue */
  }

  try {
    const resp = await request.post(`${baseUrl}/v1/system/setup`, {
      headers,
      data: { password },
    });
    return resp.ok() || resp.status() === 409;
  } catch {
    return false;
  }
}

async function ensureBtcReceivingAccount(
  request: APIRequestContext,
  baseUrl: string,
  headers: Record<string, string>
): Promise<boolean> {
  try {
    const listResp = await request.get(`${baseUrl}/v1/wallet/receiving-accounts`, { headers });
    if (listResp.ok()) {
      const body = await listResp.json();
      const accounts = body.data ?? body;
      if (
        Array.isArray(accounts) &&
        accounts.some((a: Record<string, unknown>) => a.chainType === 'BTC' && a.isActive)
      ) {
        return true;
      }
    }
  } catch {
    /* continue to create */
  }

  try {
    const resp = await request.post(`${baseUrl}/v1/wallet/receiving-accounts`, {
      headers,
      data: {
        chainType: 'BTC',
        name: 'BTC E2E Receiving',
        address: 'bcrt1qe2e000000000000000000000000000000sweep',
        isActive: true,
        source: 'e2e-seed',
      },
    });
    return resp.ok();
  } catch {
    return false;
  }
}

export interface SeedOptions {
  acceptedCoins?: string;
  btcSweepAddress?: string;
  /** Coin type for the listing price (default BTC). */
  listingCoinCode?: string;
  listingCoinDivisibility?: number;
  /** Listing price in minimal units (default 100000 = 0.001 BTC). */
  listingPrice?: string;
  listingSlug?: string;
  listingTitle?: string;
}

export interface SeedResult {
  setupOk: boolean;
  profileOk: boolean;
  listingSlug: string | null;
  guestCheckoutOk: boolean;
  receivingAccountOk: boolean;
}

export async function seedOutpostStore(
  request: APIRequestContext,
  baseUrl: string,
  password: string,
  opts: SeedOptions = {}
): Promise<SeedResult> {
  const auth = basicAuth(password);
  const headers = { Authorization: auth, 'Content-Type': 'application/json' };
  const acceptedCoins = opts.acceptedCoins ?? BTC_ASSET_ID;
  const coinCode = opts.listingCoinCode ?? 'BTC';
  const coinDiv = opts.listingCoinDivisibility ?? 8;
  const price = opts.listingPrice ?? '100000';
  const slug = opts.listingSlug ?? `${coinCode.toLowerCase()}-e2e-test-product`;
  const title = opts.listingTitle ?? `${coinCode} E2E Test Product`;

  const setupOk = await completeSetupWizard(request, baseUrl, password, headers);

  let profileOk = false;
  try {
    const resp = await request.post(`${baseUrl}/v1/profiles`, {
      headers,
      data: {
        name: 'Outpost E2E Store',
        shortDescription: 'Privacy-first store for automated testing',
        about: 'Seeded by seed-outpost-store.ts',
      },
    });
    profileOk = resp.ok() || resp.status() === 409;
  } catch {
    profileOk = true;
  }

  let listingSlug: string | null = null;
  try {
    const resp = await request.post(`${baseUrl}/v1/listings`, {
      headers,
      data: {
        slug,
        item: {
          title,
          description: `Digital item priced in ${coinCode} for E2E payment loop testing.`,
          tags: ['test', 'e2e'],
          condition: 'New',
          images: [
            {
              filename: 'placeholder.jpg',
              original: DUMMY_CID,
              large: DUMMY_CID,
              medium: DUMMY_CID,
              small: DUMMY_CID,
              tiny: DUMMY_CID,
            },
          ],
          skus: [{ bigQuantity: '100', bigSurcharge: '0' }],
          nsfw: false,
          price,
        },
        metadata: {
          contractType: 'DIGITAL_GOOD',
          format: 'FIXED_PRICE',
          expiry: '2030-01-01T00:00:00.000Z',
          pricingCurrency: { code: coinCode, divisibility: coinDiv },
        },
      },
    });
    if (resp.ok()) {
      const body = await resp.json();
      listingSlug = body?.data?.slug ?? body?.slug ?? null;
    } else if (resp.status() === 409) {
      listingSlug = slug;
    } else {
      const errorBody = await resp.text();
      console.warn(`Listing creation failed (${resp.status()}): ${errorBody}`);
    }
  } catch (e) {
    console.warn('Listing creation error:', e);
  }

  if (!listingSlug) {
    try {
      const indexResp = await request.get(`${baseUrl}/v1/listings/index`, { headers });
      if (indexResp.ok()) {
        const indexBody = await indexResp.json();
        const listings = indexBody.data ?? indexBody;
        if (Array.isArray(listings) && listings.length > 0) {
          listingSlug = listings[0].slug ?? null;
        }
      }
    } catch {
      /* ignore */
    }
  }

  let receivingAccountOk = false;
  const needsBtcAccount = acceptedCoins.includes('bip122');
  if (opts.btcSweepAddress) {
    try {
      const resp = await request.post(`${baseUrl}/v1/wallet/receiving-accounts`, {
        headers,
        data: {
          chainType: 'BTC',
          name: 'BTC E2E Receiving',
          address: opts.btcSweepAddress,
          isActive: true,
          source: 'e2e-seed',
        },
      });
      receivingAccountOk = resp.ok();
    } catch {
      /* ignore */
    }
  } else if (needsBtcAccount) {
    receivingAccountOk = await ensureBtcReceivingAccount(request, baseUrl, headers);
  } else {
    receivingAccountOk = true;
  }

  let guestCheckoutOk = false;
  try {
    const resp = await request.put(`${baseUrl}/v1/settings/guest-checkout`, {
      headers,
      data: { enabled: true, acceptedCoins },
    });
    guestCheckoutOk = resp.ok();
  } catch {
    // guest checkout config may not be available
  }

  return { setupOk, profileOk, listingSlug, guestCheckoutOk, receivingAccountOk };
}
