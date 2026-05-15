export default (txid:string) => {
  return `${import.meta.env.VITE_TX_EXPLORER_BASE_URL}/tx/${txid}`
}