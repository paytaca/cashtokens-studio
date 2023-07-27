export default {
  $schema: 'https://cashtokens.org/bcmr-v2.schema.json',
  version: { 'major': 1, 'minor': 0, 'patch': 0 },
  latestRevision: new Date().toISOString(),
  registryIdentity: ''.padStart(64,'0'),
  identities: {
    [''.padStart(64,'0')]: {
      [new Date().toISOString()]: {
        name: 'The name of this identity for use in interfaces.',
        description: 'A string describing this identity for use in user interfaces.',
        token: {
          category: ''.padStart(64,'0'),
          symbol: 'EXAMPLE',
          decimals: 2
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
