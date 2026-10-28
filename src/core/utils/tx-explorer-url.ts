/** Explorer URL for a transaction, from the configured `VITE_TX_EXPLORER_BASE_URL`. */
export function txExplorerUrl(txid: string) {
  return `${import.meta.env.VITE_TX_EXPLORER_BASE_URL}/tx/${txid}`
}
