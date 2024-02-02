/**
 * @param {string} ipfsUrl
 */
export default (ipfsUrl: string) => {
  const url = ipfsUrl.replace('ipfs://','').split('/')
  if (url.length === 1) {
    return `https://${url[0]}.ipfs.nftstorage.link`
  }
  if (url.length > 1) {
    console.log(url)
    return `https://${url[0]}.ipfs.nftstorage.link/${url.slice(1).join('/')}`
  }
  
}