import { type Registry } from 'mainnet-js';

export const createRegistryTemplate = (
  registryIdentity: string,
  latestRevision: string,
  nft?: boolean
): Registry => {
  const registryTemplate: Registry = {
    $schema: 'https://cashtokens.org/bcmr-v2.schema.json',
    version: {
      major: 0,
      minor: 1,
      patch: 0,
    },
    latestRevision,
    registryIdentity,
    identities: {
      [registryIdentity]: {
        [latestRevision]: {
          name: '',
          description: '',
          token: {
            category: registryIdentity,
            symbol: '',
            decimals: 0,
          },
          uris: {
            icon: '',
            web: '',
          },
        },
      },
    },
    extensions: {
      tokenStandard: 'AuthGuard',
      authNft: '',
    },
  };
  if (nft) {
    registryTemplate.identities![registryIdentity][latestRevision].token!.nfts =
      {
        parse: {
          bytecode: '',
          types: {},
        },
      };
  }
  return registryTemplate;
};
