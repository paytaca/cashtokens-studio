export function shortenTokenId(tokenId: string) {
    return (tokenId || '').replace(tokenId.substring(5, 60), '...')
}