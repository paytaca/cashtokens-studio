export function shortenTokenId(tokenId: string) {
    return (tokenId || '').replace(tokenId.substring(5, 60), '...')
}

export function shortenCashAddress(address: string) {
    return (address || '').replace(address.substring(15, 50), '...')
}


export function formatCurrency(amount: number|bigint, customSymbol: string, decimals?: number) {

    // We use a dummy currency (USD) to get the correct decimal/thousands layout
    const formatter = new Intl.NumberFormat(navigator.language, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: decimals ?? 0,
        minimumFractionDigits: decimals ?? 0,
    });

    const parts = formatter.formatToParts(amount);

    const customFormatted = parts.map(part => {
    if (part.type === 'currency') return customSymbol;
        return part.value;
    }).join('');

    return customFormatted
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
  
  