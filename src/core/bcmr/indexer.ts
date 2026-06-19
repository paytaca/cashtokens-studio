export async function getBasicTokenMetadata(category: string): Promise<any> {
    const response = await fetch(`${import.meta.env.VITE_BCMR_INDEXER_URL}/api/tokens/${category}`)
    if (response.ok) {
        const metadata = await response.json()
        return metadata
    }
    return null
}