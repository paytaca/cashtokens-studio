import iso4217 from './reserved-token-symbols-ISO-4217.json'
import cryptocurrencies from './reserved-token-symbols-cryptocurrencies.json'

/**
 * Token symbols that should not be used for newly issued tokens: ISO-4217 currency
 * codes (USD, EUR, ...) and the tickers of established cryptocurrencies (BTC, BCH, ...).
 */
export const RESERVED_TOKEN_SYMBOLS: readonly string[] = [
    ...iso4217,
    ...cryptocurrencies,
]

const reservedSymbols = new Set(RESERVED_TOKEN_SYMBOLS.map((symbol) => symbol.toUpperCase()))

/**
 * True when the given symbol is reserved. Comparison is case- and whitespace-insensitive
 * so pasted or programmatically assigned values are caught as well.
 */
export function isReservedTokenSymbol(symbol?: string | null): boolean {
    if (!symbol) return false

    return reservedSymbols.has(symbol.trim().toUpperCase())
}
