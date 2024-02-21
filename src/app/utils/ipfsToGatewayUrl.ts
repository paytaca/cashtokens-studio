/**
 * @param {string} ipfsUrl
 */
export default (ipfsUrl: string) => {
  if (!ipfsUrl || ipfsUrl?.startsWith('http')) {
    return ipfsUrl
  }
  const url = ipfsUrl?.replace('ipfs://','').split('/')
  if (url?.length === 1) {
    return `https://${url[0]}.ipfs.nftstorage.link`
  }
  if (url?.length > 1) {
    return `https://${url[0]}.ipfs.nftstorage.link/${url.slice(1).join('/')}`
  }
}