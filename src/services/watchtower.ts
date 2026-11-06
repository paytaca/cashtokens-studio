import { HttpError, withRetry, type RetryOptions } from 'src/core/utils';

export async function ping() {
    const controller = new AbortController();
    const { signal } = controller;

    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(import.meta.env.VITE_WATCHTOWER_URL, { 
        method: 'HEAD',
        signal
        });
        
        return response.ok;

    } catch (error) {
        if ((error as any).name === 'AbortError') {
        console.error('❌ Ping request timed out after 3 seconds');
        } else {
        console.error('❌ Ping failed due to a network error:', (error as any).message);
        }
        return false
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function broadcastTransaction(transactionHex: string) {

    const response = await fetch(`${import.meta.env.VITE_WATCHTOWER_URL}/api/broadcast/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: transactionHex }),
    });
  
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }
  
    return response.json();
  }
  
export async function subscribe(address: string, options?: RetryOptions): Promise<any> {
    return withRetry(async (signal) => {
      const response = await fetch(`${import.meta.env.VITE_WATCHTOWER_URL}/subscription/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address }),
        signal,
      });
      if (!response.ok) {
        throw new HttpError(response.status, `HTTP Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }, options);
  }

export type BchBalance = {
    valid?: boolean;
    address?: string;
    spendable?: number;
    balance?: number;
};

/**
 * BCH balance of an address from the AuthKey watchtower.
 *
 * Still reads `VITE_WATCHTOWER_API`: unlike broadcast, subscribe and authenticate, the balance
 * endpoint has not moved to `VITE_WATCHTOWER_URL`.
 */
export async function fetchBchBalance(ownerAddress: string, options?: RetryOptions): Promise<BchBalance> {
    return withRetry(async (signal) => {
        const response = await fetch(`${import.meta.env.VITE_WATCHTOWER_API}balance/bch/${ownerAddress}`, { signal });
        if (!response.ok) {
            throw new HttpError(response.status, `HTTP Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }, options);
}

/**
 * Authenticates an authhead against its authbase via Watchtower
 * (`POST /api/cts/authhead/authenticate/`).
 *
 * The endpoint returns HTTP 200 for both outcomes:
 * - authenticated -> `{ authhead: {...}, address, success: 'Authhead checked ok' }`
 * - not authenticated -> `{ failed: 'Authhead checked nok' }`
 */
export async function authenticateAuthhead(
  authbase: string,
  authhead: string,
  options?: RetryOptions
): Promise<boolean> {
  return withRetry(async (signal) => {
    const url =
      `${import.meta.env.VITE_WATCHTOWER_URL}/api/cts/authhead/authenticate/` +
      `?authbase=${encodeURIComponent(authbase)}&authhead=${encodeURIComponent(authhead)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
    });

    if (!response.ok) {
      throw new HttpError(response.status, `HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    // Failure is expressed as HTTP 200 with a `failed` key, not a non-2xx status.
    return Boolean(data?.success) && !data?.failed;
  }, options);
}

export type WatchtowerAssetPrice = {
  id: number;
  asset: string;        // or a union of specific tickers like "BCH" | "BTC"
  asset_type: string;   // or a union like "bch" | "btc"
  asset_name: string;   // e.g., "Bitcoin Cash"
  asset_symbol: string; // e.g., "BCH"
  currency: string;     // e.g. "USD"
  price_value: string;  // Kept as a string to preserve high precision decimal points
  timestamp: string;    // ISO 8601 DateTime string (e.g., "2026-11-06T10:32:22Z")
  source: "coingecko" | string;
  source_ids: string[] | null; // Typed as an array or null assuming it scales to hold IDs
  calculation: string | null;  // Typed as string or null based on your fallback payload
}

  
/**
 * @param {string} asset 'bch' or token category
 * @param {string} currency comma separated currency symbols example, USD,BCH to get price of token in USD and BCH
 */
export async function getAssetPrices(asset: 'bch'| string, currency: string, options?: RetryOptions): Promise<WatchtowerAssetPrice> {
  return withRetry(async (signal) => {
    const response = await fetch(`${import.meta.env.VITE_WATCHTOWER_API}asset-prices/?assets=${encodeURI(asset)}&vs_currencies=${encodeURI(currency)}`, { signal });
    if (!response.ok) {
        throw new HttpError(response.status, `HTTP Error ${response.status}: ${response.statusText}`);
    }
      return response.json();
  }, options);
}