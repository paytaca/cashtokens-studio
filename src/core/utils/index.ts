import { binToHex, encodeTransactionOutput, hexToBin, isHex, ReadResult, readTransactionOutput } from 'bitauth-libauth-v3';
import type { DecoratedUtxo } from '../types'
import { stringify } from '@bitauth/libauth';

export function shortenTokenId(tokenId = '') {
    return tokenId.replace(tokenId.substring(5, 60), '...')
}

export function shortenCashAddress(address = '') {
    return address.replace(address.substring(15, 45), '...')
}

export function formatTokenAmount(
  amount: number | bigint, 
  customSymbol: string, 
  decimals?: number,
  symbolPosition: 'prefix' | 'suffix' | 'none' = 'prefix'
) {
  const decs = decimals ?? 0;
  let valueString = "";

  if (typeof amount === 'bigint') {
      // Handle bigint safely without losing precision via float division
      const BigDecimals = BigInt(decs);
      const divisor = 10n ** BigDecimals;
      
      const integerPart = amount / divisor;
      const fractionalPart = amount % divisor;
      
      // Pad the fractional part with leading zeros if necessary
      let fractionalStr = fractionalPart.toString().padStart(decs, '0');
      // Trim or pad to exactly match the requested decimal places
      fractionalStr = fractionalStr.slice(0, decs);

      // Format the integer part natively using the user's locale
      const intFormatter = new Intl.NumberFormat(navigator.language, {
          style: 'decimal',
      });
      
      const formattedInteger = intFormatter.format(integerPart);
      valueString = decs > 0 ? `${formattedInteger}.${fractionalStr}` : formattedInteger;
  } else {
      // Safe to scale down via float if it started as a number
      const scaledAmount = amount / Math.pow(10, decs);
      
      const formatter = new Intl.NumberFormat(navigator.language, {
          style: 'decimal',
          maximumFractionDigits: decs,
          minimumFractionDigits: decs,
      });
      valueString = formatter.format(scaledAmount);
  }

  // Position or omit the symbol based on the configuration
  if (symbolPosition === 'none') {
      return valueString;
  }
  
  return symbolPosition === 'suffix' 
      ? `${valueString} ${customSymbol}`.trim() 
      : `${customSymbol}${valueString}`;
}




/**
 * Sorts an array of Extended Public Keys (xpubs) lexicographically.
 * This ensures deterministic multi-sig address derivation (BIP67).
 * 
 * @param xpubs Array of xpub strings to sort
 * @returns A new array with the sorted xpub strings
 */
export function sortXpubsLexicographically(xpubs: string[]): string[] {
    // Use slice() to avoid mutating the original array directly
    return xpubs.slice().sort((a, b) => a.localeCompare(b));
  }

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

export type Debounced<Args extends unknown[]> = ((...args: Args) => void) & { cancel: () => void };

export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, wait = 300): Debounced<Args> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: Args) => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    timeoutId = undefined;
  };
  return debounced;
}

export function getTokenType(utxo: DecoratedUtxo): 'fungible' | 'nft' | 'mixed' {
  const hasAmount = !!utxo.token?.amount
  const capability = utxo.token?.nft?.capability
  if (hasAmount && capability === 'minting') return 'mixed'
  if (hasAmount && (capability === 'mutable' || capability === 'none')) return 'fungible'
  if (!hasAmount) return 'nft'
  return 'fungible'
}

export function isPureFungible(utxo: DecoratedUtxo): boolean {
  return getTokenType(utxo) === 'fungible'
}
  
export async function safeAsync<T, E = Error>(
    promise: Promise<T>
  ): Promise<[E, null] | [null, T]> {
    return promise
      .then<[null, T]>((data: T) => [null, data])
      .catch<[E, null]>((error: E) => [error, null]);
  };

export class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'HttpError';
    }
}

export type RetryOptions = {
    /** Total number of tries, including the first. Defaults to 3. */
    attempts?: number;
    /** Base delay before the first retry, in ms. Defaults to 300. */
    baseDelayMs?: number;
    /** Upper bound for the backoff delay, in ms. Defaults to 2000. */
    maxDelayMs?: number;
    /** Per-attempt timeout before the request is aborted, in ms. Defaults to 8000. */
    timeoutMs?: number;
    /** Decides whether a given failure is worth retrying. Defaults to transient errors only. */
    shouldRetry?: (error: unknown) => boolean;
    /** Called before each retry with the failure and the attempt that just failed. */
    onRetry?: (error: unknown, attempt: number) => void;
    /** Optional caller signal. Aborting it stops retrying and rejects immediately. */
    signal?: AbortSignal;
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries transient failures (network errors, 5xx and 429) while failing fast
 * on permanent ones (other 4xx). Each attempt is bounded by its own timeout and
 * retries are spaced out with an exponential backoff plus jitter.
 */
function isRetryableError(error: unknown): boolean {
    if (error instanceof HttpError) {
        return error.status >= 500 || error.status === 429;
    }
    return true;
}

export async function withRetry<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        attempts = 3,
        baseDelayMs = 300,
        maxDelayMs = 2000,
        timeoutMs = 8000,
        shouldRetry = isRetryableError,
        onRetry,
        signal,
    } = options;

    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        const controller = new AbortController();
        const onExternalAbort = () => controller.abort();
        signal?.addEventListener('abort', onExternalAbort, { once: true });
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            return await fn(controller.signal);
        } catch (error) {
            lastError = error;
            const abortedByCaller = signal?.aborted ?? false;
            if (abortedByCaller || attempt === attempts || !shouldRetry(error)) {
                throw error;
            }
            onRetry?.(error, attempt);
            const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
            const jitter = Math.random() * backoff * 0.2;
            await sleep(backoff + jitter);
        } finally {
            clearTimeout(timeoutId);
            signal?.removeEventListener('abort', onExternalAbort);
        }
    }

    throw lastError;
}
  
export function parseLibauthStringified(stringified: string | object) {
    const str = typeof(stringified) === 'string'? stringified : JSON.stringify(stringified)
    // Regex patterns mapping to the template strings libauth generates
    const bigintRegex = /^<bigint:\s*(-?\d+)n>$/
    const uint8ArrayRegex = /^<Uint8Array:\s*0x([0-9a-fA-F]*)>$/
  
    return JSON.parse(str, (key, value) => {
      if (typeof value === 'string') {
        // 1. Revive BigInts
        const bigintMatch = value.match(bigintRegex)
        if (bigintMatch) {
          return BigInt(bigintMatch[1] as string)
        }
  
        // 2. Revive Uint8Arrays using libauth's built-in hex converter
        const uint8Match = value.match(uint8ArrayRegex)
        if (uint8Match) {
          const hexString = uint8Match[1]
          return hexToBin(hexString as string) // Returns a standard Uint8Array
        }
      }
      
      return value // Return unchanged for regular primitives, objects, arrays
    })
  }