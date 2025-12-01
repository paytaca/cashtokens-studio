
/**
 * @param {string} ipfsUrl
 */
export default (ipfsUrl: string) => {
  if (ipfsUrl?.startsWith('http')) {
    if (ipfsUrl?.includes('ipfs.nftstorage.link')) {
      // return convertToPaytacaGateway(ipfsUrl, pinataGatewayToken);
      try {
        // Example:
        // https://bafy...ha.ipfs.nftstorage.link/2551825...
        const u = new URL(ipfsUrl);
    
        // Extract CID from subdomain: "<cid>.ipfs.nftstorage.link"
        const hostParts = u.hostname.split(".");
        const cid = hostParts[0]; // e.g., bafybeibf2y...
    
        // Extract filename path
        // Example path: /2551825308fa885e6202106d92899448fbf9127348cb80ba37e6f3177666e8ee.png
        const filename = u.pathname.replace(/^\//, "");
    
        // Construct new URL
        return `/api/ipfs-image?url=${encodeURIComponent(`ipfs://${cid}/${filename}`)}`;
    
        
      } catch (e) {
        console.error("Invalid URL:", e);
        return null;
      }
    }
    return ipfsUrl
  }
  return  `/api/ipfs-image?url=${encodeURIComponent(ipfsUrl)}`;
  // const url = ipfsUrl?.replace('ipfs://','').split('/')
  // if (url?.length === 1) {
  //   return `https://${url[0]}.ipfs.nftstorage.link`
  // }
  // if (url?.length > 1) {
  //   return `https://${url[0]}.ipfs.nftstorage.link/${url.slice(1).join('/')}`
  // }
}