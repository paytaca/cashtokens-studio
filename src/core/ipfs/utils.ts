
const INBROWSER_GATEWAY = 'inbrowser.link'

/** True for `nftstorage.link` and its subdomains (`<cid>.ipfs.nftstorage.link`). */
const isNftStorageHost = (hostname: string) =>
  hostname === 'nftstorage.link' || hostname.endsWith('.nftstorage.link')

/**
 * Builds an `inbrowser.link` subdomain-gateway URL:
 *   https://<cid>.ipfs.inbrowser.link/<path>
 */
export function inbrowserGatewayUrl(id: string, path = '', search = ''): string {
  return `https://${id}.ipfs.${INBROWSER_GATEWAY}/${path.replace(/^\/+/, '')}${search}`
}

/**
 * Resolves a token/NFT media URI for display.
 *
 * NFT.Storage's gateway (`nftstorage.link`) is no longer available, and `inbrowser.link` is a
 * browser-only verified-fetch gateway (direct requests receive an HTML bootstrap instead of the
 * file), so nftstorage references are proxied through the SSR `/api/ipfs-image` endpoint, which
 * fetches the file with the configured Pinata token. Both forms are supported:
 *   - path-based:    https://nftstorage.link/ipfs/<cid>/<path>
 *   - subdomain:     https://<cid>.ipfs.nftstorage.link/<path>
 *
 * Everything else keeps the previous behaviour: absolute HTTP(S) URLs are returned as-is and
 * native `ipfs://` URIs are proxied through the SSR endpoint.
 */
export function ipfsToGatewayUrl(ipfsUrl: string) {
    if (ipfsUrl?.startsWith('http')) {
      try {
        const url = new URL(ipfsUrl)
        if (isNftStorageHost(url.hostname)) {
          const parsed = tryParseIpfsUrl(ipfsUrl)
          if (parsed?.scheme === 'ipfs' && parsed.id) {
            const path = parsed.path ? `/${parsed.path}` : ''
            return `/api/ipfs-image?url=${encodeURIComponent(`ipfs://${parsed.id}${path}`)}`
          }
        }
      } catch (e) {
        console.error("Invalid URL:", e)
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


export function isCID(str: string) {
  if (typeof str !== 'string') return false;

  // Official IPFS regex for CIDv0 (Base58, 46 characters, starts with Qm)
  const cidv0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;

  // Official IPFS regex for CIDv1 (Case-insensitive Base32, usually 59 chars)
  const cidv1Regex = /^b[a-z2-7]{58}$/i;

  // Official IPFS regex for other standard multibase CIDv1 variants (hex, base58, etc.)
  const cidv1AlternativeRegex = /^[Bza-f7][a-zA-Z0-9]{49,70}$/;

  return cidv0Regex.test(str) || cidv1Regex.test(str) || cidv1AlternativeRegex.test(str);
}

/**
 * Same as {@link parseIpfsUrl}, but returns `undefined` instead of throwing when the input
 * isn't a recognizable IPFS/IPNS URL.
 *
 * Callers that also handle plain HTTP URLs need this: a registry published on an ordinary
 * domain must fall through to a plain `fetch` rather than abort the whole lookup.
 */
export function tryParseIpfsUrl(input: string): ParsedIpfsUrl | undefined {
  try {
    return parseIpfsUrl(input)
  } catch {
    return undefined
  }
}
