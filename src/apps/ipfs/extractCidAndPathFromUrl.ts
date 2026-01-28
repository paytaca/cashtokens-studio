
  /**
   * Validate that the given string is a valid IPFS CID (v0 or v1).
   * Supports both CIDv0 (base58btc) and CIDv1 (multibase, typically base32).
   * @param {string} cid - The CID string to validate
   * @returns {boolean} - true if valid CID, false otherwise
   */
  export function isValidIpfsCid(cid: string): boolean {
    if (typeof cid !== 'string') return false;
    try {
      // Basic check for CIDv0: Qm... (base58btc, 46 chars)
      if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)) {
        return true;
      }
      // CIDv1 is multibase (usually base32: starts with 'b' or 'B' and length 59 for sha-256 hashes)
      // Example: bafybeigdyrzt4hdhkaoqi5brjjgglnl3bdliob344aqy6zxftum6yqhiae
      if (/^b[abcdefghijklmnopqrstuvwxyz234567]{58,}$/i.test(cid)) {
        return true;
      }
      // CIDv1 can also start with other prefixes, such as 'f', 'z', etc. but 'b' is usual for base32
      // Accept at least 2 char cids (multibase), very loose fallback
      if (/^[a-zA-Z0-9]{2,}$/.test(cid)) {
        // Optionally: try to decode with CID library if available
        return true;
      }
      return false;
    } catch (_e) {
      return false;
    }
  }

/**
 * The result for extracting CID and path from an IPFS gateway URL.
 */
export type ExtractCidAndPathResult = {
  cid: string;
  path: string;
};

/**
 * Extracts the CID and file path from an IPFS gateway URL (supports both path-based and subdomain-based gateways).
 *
 * Examples:
 *   https://ipfs.io/ipfs/<cid>/path/to/file.txt   → { cid: <cid>, path: 'path/to/file.txt' }
 *   https://<cid>.ipfs.nftstorage.link/foo.png    → { cid: <cid>, path: 'foo.png' }
 *
 * @param url - The IPFS gateway URL or domain (with/without protocol).
 * @returns An object containing the extracted CID and path or undefined.
 */
export type ExtractCidAndPathFromUrl = (url: string) => ExtractCidAndPathResult;

/**
 * Extracts the CID and file path from an IPFS gateway URL (supports both path-based and subdomain-based gateways).
 *
 * Examples:
 *   https://ipfs.io/ipfs/<cid>/path/to/file.txt   → { cid: <cid>, path: 'path/to/file.txt' }
 *   https://<cid>.ipfs.nftstorage.link/foo.png    → { cid: <cid>, path: 'foo.png' }
 *
 * @param {string} url - A fully qualified URL.
 * @returns {{ cid: string, path: string }} - An object containing the extracted CID and the (sanitized) path.
 */
export const extractCidAndPathFromUrl: ExtractCidAndPathFromUrl = (url) => {

    // Handle ipfs:// 
    let cid = '', path = ''

    if (url.startsWith('ipfs://')) {
      const u = new URL(url)
      cid = u.hostname
      path = u.pathname.replace(/^\/+/, '')
      return { cid, path }
    }

    const parsed = new URL(url)
    const hostParts = parsed.hostname.split('.')

    // Subdomain-based: <cid>.ipfs.*
    if (hostParts.length > 2 && hostParts[1] === 'ipfs') {
      cid = hostParts[0]
      path = parsed.pathname.replace(/^\/+/, '')
      return { cid, path }
    }
  
    // Path-based: /ipfs/<cid>/<path>
    const pathSegs = parsed.pathname.split('/').filter(Boolean)
    // e.g. /ipfs/Qm.... or /ipfs/<cid>
    if (pathSegs.length >= 2 && pathSegs[0] === 'ipfs') {
        cid = pathSegs[1]
        path = pathSegs.slice(2).join('/')
        if (!isValidIpfsCid(cid)) {
            path = pathSegs.join('/')
        }
    }

    if (!isValidIpfsCid(cid)) {
        console.log('Invalid CID', cid)
        return { cid: '', path }
    }
      
    return { cid, path }
  }
