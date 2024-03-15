// import { binToHex, sha256, utf8ToBin } from '@bitauth/libauth'

// export const fetchBcmr = async (url: string):Promise<string|undefined> => {
//   try {
//     const r = await fetch(url)
//     return await r.text() // !SHOULD BE .text() not .json()
//   } catch (error) {
//     console.log(`Error fetching BCMR from ${url}`)
//   }
// }

// export const getHash = (bcmr:string) => {
//   return binToHex(sha256.hash(utf8ToBin(bcmr)))
// }

// export const fetchBcmrContentHash = async (url: string): Promise<string|void> => {
//   try {
//     const r:string|undefined = await fetchBcmr(url)
//     if(r) {
//       return getHash(r)
//     }
//   } catch (error) {
//     console.log(`Error fetching BCMR from ${url}`)
//   }
// }

import {
  ChainHistory,
  Extensions,
  IdentityHistory,
  IdentitySnapshot,
  NftType,
  OffChainRegistryIdentity,
  Registry,
  Tag,
  URIs,
  binToHex,
  sha256,
  utf8ToBin,
} from 'mainnet-js';
import { BcmrStorageArtifact } from '../ipfs/interfaces';
import { ISODateString } from './types';
import { storeRegistry } from '../ipfs';
export { locateRegistry } from './locateRegistry';
export class Bcmr implements Registry {
  $schema?: string | undefined;
  version: { major: number; minor: number; patch: number };
  latestRevision: string;
  registryIdentity: string | OffChainRegistryIdentity;
  identities?: { [authbase: string]: IdentityHistory } | undefined;
  tags?: { [identifier: string]: Tag } | undefined;
  defaultChain?: string | undefined;
  chains?: { [splitId: string]: ChainHistory } | undefined;
  license?: string | undefined;
  extensions?: Extensions | undefined;
  private _versionString?: string;

  constructor(instance: {
    $schema?: string | undefined;
    version: { major: number; minor: number; patch: number };
    latestRevision: string;
    registryIdentity: string | OffChainRegistryIdentity;
    identities?: { [authbase: string]: IdentityHistory } | undefined;
    tags?: { [identifier: string]: Tag } | undefined;
    defaultChain?: string | undefined;
    chains?: { [splitId: string]: ChainHistory } | undefined;
    license?: string | undefined;
    extensions?: Extensions | undefined;
  }) {
    this.$schema =
      instance.$schema || 'https://cashtokens.org/bcmr-v2.schema.json';
    this.version = instance.version;
    this.latestRevision = instance.latestRevision;
    this.registryIdentity = instance.registryIdentity;
    this.identities = instance.identities;
    this.tags = instance.tags;
    this.defaultChain = instance.defaultChain;
    this.license = instance.license;
    this.extensions = instance.extensions;
  }

  get versionString(): string {
    this._versionString = `${this.version?.major || 0}.${
      this.version?.minor || 0
    }.${this.version?.patch || 0}`;
    return this._versionString;
  }

  set versionString(ver: string) {
    const [major, minor, patch] = ver.split('.');
    this.version = {
      major: Number(major || 0),
      minor: Number(minor || 0),
      patch: Number(patch || 0),
    };
  }

  getIdentitySnapshot(authbase: string, identity_history: string) {
    if (
      this.identities &&
      this.identities[authbase] &&
      this.identities[authbase][identity_history]
    ) {
      return this.identities[authbase][identity_history];
    }
    return null;
  }

  addIdentitySnapshotUri(
    authbase: string,
    identity_history: string,
    uri: URIs
  ) {
    if (
      this.identities &&
      this.identities[authbase] &&
      this.identities[authbase][identity_history]
    ) {
      this.identities[authbase][identity_history].uris = {
        ...this.identities[authbase][identity_history].uris,
        ...uri,
      };
    }
  }

  addIdentitySnapshot(
    authbase: string,
    timestamp: ISODateString,
    v: IdentitySnapshot
  ) {
    if (!this.identities) {
      this.identities = {};
    }
    this.identities[authbase][timestamp] = v;
    return this;
  }

  addIdentityHistory(authbase: string, v: IdentityHistory) {
    if (!this.identities) {
      this.identities = {};
    }
    this.identities[authbase] = v;
  }
  /**
   *
   * The json content
   *
   * @param {ISODateString} identityHistoryTimestamp If present, will only keep the IdentityHistory with
   * this key.
   *
   */
  getContent(
    authbase?: string,
    identityHistoryTimestamp?: ISODateString | string
  ) {
    const timestamp = identityHistoryTimestamp || this.latestRevision;
    let identities = this.identities;
    if (authbase && identityHistoryTimestamp) {
      identities = {
        [authbase]: {
          [timestamp]: this.identities![authbase][identityHistoryTimestamp],
        },
      };
    }
    const content: Registry = {
      $schema: this.$schema,
      version: this.version,
      latestRevision: timestamp,
      registryIdentity: this.registryIdentity,
      identities: identities,
    };

    if (this.tags) {
      content.tags = this.tags;
    }
    if (this.defaultChain) {
      content.defaultChain = this.defaultChain;
    }
    if (this.chains) {
      content.chains = this.chains;
    }
    if (this.license) {
      content.license = this.license;
    }
    if (this.extensions) {
      content.extensions = this.extensions;
    }

    return JSON.stringify(content);
  }

  /**
   * Hash of the registry
   */
  getContentHash() {
    return binToHex(sha256.hash(utf8ToBin(this.getContent())));
  }

  appendAuthGuardTokenStandardExtension(authKeyTokenId: string) {
    this.extensions = {
      ...this.extensions,
      tokenStandard: 'AuthGuard',
      authNft: authKeyTokenId,
    };
  }

  addNftType(
    authbase: string,
    timestamp: ISODateString,
    nftTypeKey: string,
    nftType: NftType
  ) {
    if (!this.identities) {
      this.identities = {};
    }
    if (!this.identities[authbase][timestamp].token?.nfts) {
      this.identities[authbase][timestamp].token!.nfts = {
        parse: {
          bytecode: '',
          types: {},
        },
      };
    }
    this.identities[authbase][timestamp].token!.nfts!.parse.types[nftTypeKey] =
      nftType;
    return this;
  }
  /**
   * Stores this registry to the ipfs server. Invoke this first before publishing so
   * that the registry uri can be populated.
   */
  async storeRegistry(): Promise<BcmrStorageArtifact | undefined> {
    return await storeRegistry(this);
  }
}

export const create = (
  registryIdentity: OffChainRegistryIdentity | string,
  latestRevision?: ISODateString
): Bcmr => {
  const b = new Bcmr({
    version: { major: 1, minor: 0, patch: 0 },
    registryIdentity: registryIdentity,
    latestRevision: latestRevision || new Date().toISOString(),
  });
  if (typeof b.registryIdentity == 'string') {
    b.identities = {
      [b.registryIdentity as string]: {
        [b.latestRevision]: {
          name: '',
        },
      },
    };
  }
  return b;
};

export const getInstance = create;
