/**
 * @param {string} ipfsUrl
 */
export default (ipfsUrl: string) => {
  const url = ipfsUrl.replace('ipfs://','').split('/')
  return `https://${url[0]}.ipfs.nftstorage.link/${url[1]}`
}