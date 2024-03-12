export interface BcmrStorageArtifact {
  uris: {
    https: string,
    ipfs: string
  },
  contentHash: string
}

export interface IconStorageArtifact {
  uris: {
    https: string,
    ipfs: string
  },
  nftStorageMetadata: {
    ipnft: string,
    url: string
  }
}
