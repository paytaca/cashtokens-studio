export default {
  $schema: 'https://cashtokens.org/bcmr-v2.schema.json',
  version: { 'major': 1, 'minor': 0, 'patch': 0 },
  latestRevision: '2023-06-26T03:02:34.464Z',
  registryIdentity: {
    name: 'Example Metadata Registry Name',
    description: 'Example metadata description',
    uris: {
      icon: 'https://example.com/icons/example.png',
      web: 'https://example.com',
      registry: 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json'
    }
  },
  identities: {
    '<example_token_category_id>': {
      '2023-06-26T03:02:34.464Z': {
        name: 'example name',
        description: 'example description',
        token: {
          category: '<example_token_category_id>',
          symbol: 'EXAMPLE',
          decimals: 18
        },
        uris: {
          icon: 'https://example.com/icons/example.png',
          web: 'https://example.com',
          chat: 'https://t.me/Example',
          registry: 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json',
          support: 'https://t.me/Example'
        }
      }
    }
  },
  license: 'CC0-1.0'
}