import {
  ChainHistory,
  Extensions,
  IdentityHistory,
  IdentitySnapshot,
  OffChainRegistryIdentity,
  Registry,
  Tag,
  TokenCategory,
  URIs
} from "src/bcmr/bcmr-v2.schema";
import AuthchainIdentity from "./AuthchainIdentity";
import { binToHex, hexToBin, utf8ToBin } from "mainnet-js";

export class BitcoinCashMetadataRegistry implements Registry {
  $schema?: string | undefined;
  version: { major: number; minor: number; patch: number; };
  latestRevision: string;
  registryIdentity: string | OffChainRegistryIdentity;
  identities?: { [authbase: string]: IdentityHistory; } | undefined;
  tags?: { [identifier: string]: Tag; } | undefined;
  defaultChain?: string | undefined;
  chains?: { [splitId: string]: ChainHistory; } | undefined;
  license?: string | undefined;
  extensions?: Extensions | undefined;
  authchainIdentity?: AuthchainIdentity
  constructor(instance:Registry, authchainIdentity?: AuthchainIdentity) {
    this.$schema = 'https://cashtokens.org/bcmr-v2.schema.json'
    this.version = instance.version
    this.registryIdentity = instance.registryIdentity
    this.latestRevision = instance.latestRevision
    this.authchainIdentity = authchainIdentity
    this.initIdentities()
  }

  initIdentities(){
    if (typeof (this.registryIdentity) === 'string' && !this.identities) {
      this.identities = {
        [this.registryIdentity]: {
          [this.latestRevision]: {
            name: '',
            token: {
              category: this.registryIdentity,
              symbol: '',
              decimals: 0
            } as TokenCategory
          } as IdentitySnapshot
        } as IdentityHistory
      }
    }
  }

  setVersion(version: string) {
    const [major, minor, patch] = version.split('.').map(v=>Number(v))
    this.version = { major, minor, patch }
  }

  setRegistryName(name:string) {
    if (typeof (this.registryIdentity) === 'string' && this.identities) {
      this.identities![this.registryIdentity!][this.latestRevision!].name = name
    }
  }

  setRegistryDescription(description:string) {
    if (typeof (this.registryIdentity) === 'string' && this.identities) {
      this.identities![this.registryIdentity!][this.latestRevision!].description = description
    }
  }

  setTokenSymbol(symbol:string) {
    if (typeof (this.registryIdentity) === 'string' && this.identities) {
      this.identities![this.registryIdentity!][this.latestRevision!].token!.symbol = symbol.toUpperCase()
    }
  }

  setTokenDecimals(decimals:number) {
    if (typeof (this.registryIdentity) === 'string' && this.identities) {
      this.identities![this.registryIdentity!][this.latestRevision!].token!.decimals = decimals
    }
  }

  addIconUri(uri: string) {
    this.addUri({icon: uri})
  }

  addWebUri(uri: string) {
    this.addUri({web: uri})
  }

  addRegistryUri(uri: string) {
    this.addUri({registry: uri})
  }

  addUri(uri: URIs) {
    if (typeof (this.registryIdentity) === 'string' && this.identities) {
      this.identities![this.registryIdentity!][this.latestRevision!].uris
       = {...this.identities![this.registryIdentity!][this.latestRevision!].uris, ...uri}
    }
  }

  getRegistryUri(): string|undefined {
    if (typeof (this.registryIdentity) === 'string' && this.identities) {
      return this.identities![this.registryIdentity!][this.latestRevision!].uris?.registry
    }
  }

  getIconUri(): string|undefined {
    if (typeof (this.registryIdentity) === 'string' && this.identities) {
      return this.identities![this.registryIdentity!][this.latestRevision!].uris?.icon
    }
  }

  getToken(): TokenCategory|undefined {
    if (typeof (this.registryIdentity) === 'string' && this.identities) {
      return this.identities![this.registryIdentity!][this.latestRevision!].token as TokenCategory
    }
  }

  async publish() {
    if (!this.authchainIdentity) {
      throw new Error('Authchain identity required')
    }
    console.log(this)
    if (!this.getToken()) {
      throw new Error('Token not set')
    }
    if (!this.getRegistryUri()) {
      throw new Error('Registry URI not set')
    }
    try {
      const clean = Object.assign({}, {...this, authchainIdentity: undefined})
      this.authchainIdentity.publish({
        url: this.getRegistryUri() as string,
        contentHash: binToHex(utf8ToBin(JSON.stringify(clean)))
      })
      console.log(JSON.stringify(clean))
    } catch (error) {

    }

  }
}
