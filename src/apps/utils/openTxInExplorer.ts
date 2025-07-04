export default (txid:string) => {
  return `${process.env.TX_EXPLORER_BASE_URL}tx/${txid}`
}