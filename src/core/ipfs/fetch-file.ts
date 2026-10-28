/**
 * Fetch a file from IPFS through the app's own proxy endpoint (`/api/ipfs/:cid`).
 *
 * The path is sent as `?filePath=` and encoded, matching what the SSR middleware
 * expects (`decodeURIComponent(req.query.filePath ?? '')`). The path is omitted
 * entirely when not provided — the previous helper sent the literal string
 * `filePath=undefined`, which the server would treat as a real path.
 *
 * @param cid - CID of the file
 * @param filePath - Optional path inside the IPFS directory
 */
export async function fetchIpfsFile(cid: string, filePath?: string): Promise<Response> {
    const query = filePath ? `?filePath=${encodeURIComponent(filePath)}` : ''

    return await fetch(`/api/ipfs/${cid}${query}`)
}
