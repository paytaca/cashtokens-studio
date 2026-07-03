
/**
 * @param {string} ipfsUrl
 */
export function ipfsToGatewayUrl(ipfsUrl: string){
    
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
  }

/**
 * Parses any IPFS/IPNS HTTP gateway URL into a native URI:
 *   ipfs://<cid>/[path]   or   ipns://<name>/[path]
 *
 * Handles:
 *  - Path-based gateways:   https://ipfs.io/ipfs/<cid>/path
 *                            https://gateway.pinata.cloud/ipfs/<cid>
 *                            http://127.0.0.1:8080/ipfs/<cid>
 *  - Subdomain gateways:    https://<cid>.ipfs.dweb.link/path
 *                            https://<cid>.ipfs.cf-ipfs.com/path
 *  - IPNS equivalents of both the above (/ipns/<name>, <name>.ipns.<gw>)
 *  - Bare host+path with no scheme:  "ipfs.io/ipfs/<cid>"
 *  - URLs that are already ipfs:// or ipns:// (just gets normalized)
 *
 * Query strings are preserved; trailing slashes are stripped.
 */

/** The two URI schemes this module can produce. */
export type IpfsScheme = 'ipfs' | 'ipns';

/** Structured result alongside the plain string URI, in case callers want the parts. */
export interface ParsedIpfsUrl {
  /** 'ipfs' or 'ipns' */
  scheme: IpfsScheme;
  /** The CID (for ipfs://) or the IPNS name/key (for ipns://) */
  id: string;
  /** Path after the id, without a leading slash. Empty string if none. */
  path: string;
  /** Query string including leading '?', or empty string if none. */
  search: string;
  /** The fully assembled ipfs://... or ipns://... string */
  uri: string;
}

/**
 * Convert a gateway URL (or an existing ipfs://ipns:// URI) into a
 * normalized ipfs://<cid>/[path] or ipns://<name>/[path] string.
 *
 * @param {string} url The gateway URL
 * @throws {Error} if the input isn't a recognizable IPFS/IPNS URL
 */
export function gatewayUrlToIpfs(url: string): string {
  return parseIpfsUrl(url).uri;
}

/**
 * Same as {@link ipfsUrlToUri} but returns the parsed components
 * (scheme, id, path, search) alongside the assembled URI string.
 *
 * @throws {Error} if the input isn't a recognizable IPFS/IPNS URL
 */
export function parseIpfsUrl(input: string): ParsedIpfsUrl {
  if (typeof input !== 'string' || !input.trim()) {
    throw new TypeError('Expected a non-empty URL string');
  }
  let str = input.trim();

  if (/^ipfs:\/\//i.test(str)) return normalizeUri(str, 'ipfs');
  if (/^ipns:\/\//i.test(str)) return normalizeUri(str, 'ipns');

  if (!/^https?:\/\//i.test(str)) str = 'https://' + str;

  let url: URL;
  try {
    url = new URL(str);
  } catch {
    throw new Error(`Invalid URL: ${input}`);
  }

  const subdomainMatch = url.hostname.match(/^(.+?)\.(ipfs|ipns)\.(.+)$/i);
  if (subdomainMatch) {
    const [, id, kind] = subdomainMatch;
    return buildResult(kind as IpfsScheme, id as string, url.pathname, url.search);
  }

  const pathMatch = url.pathname.match(/^\/(ipfs|ipns)\/([^/]+)(\/.*)?$/i);
  if (pathMatch) {
    const [, kind, id, rest] = pathMatch;
    return buildResult(kind as IpfsScheme, id as string, rest ?? '', url.search);
  }

  throw new Error(`Unrecognized IPFS gateway URL format: ${input}`);
}

function buildResult(
  scheme: IpfsScheme,
  id: string,
  pathPart: string,
  search = ''
): ParsedIpfsUrl {
  const path = (pathPart || '').replace(/^\/+/, '').replace(/\/+$/, '');
  let uri = `${scheme}://${id}`;
  if (path) uri += `/${path}`;
  if (search) uri += search;
  return { scheme, id, path, search, uri };
}

function normalizeUri(str: string, scheme: IpfsScheme): ParsedIpfsUrl {
  const rest = str.slice(`${scheme}://`.length);
  const [id, ...pathParts] = rest.split('/');
  const path = pathParts.join('/').replace(/\/+$/, '');
  return { scheme, id: id as string , path, search: '', uri: `${scheme}://${id}${path ? '/' + path : ''}` };
}
