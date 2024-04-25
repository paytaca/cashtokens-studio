export type BcmrStorageArtifact = {
  uris: {
    https: string;
    ipfs: string;
  };
  contentHash: string;
};

export type IconStorageArtifact = {
  iconUris: {
    https: string;
    ipfs: string;
  };
  nftStorageMetadata: {
    ipnft: string;
    url: string;
  };
};
