import { ChainHistory, Extensions, IdentityHistory, IdentitySnapshot, OffChainRegistryIdentity, Registry, Tag, TokenCategory, URIs } from "./bcmr-v2.schema";
import { AuthchainIdentity } from "../";
import { binToHex, hexToBin, sha256, utf8ToBin } from "mainnet-js";
import { BcmrStorageArtifact } from "../types";

export class Bcmr implements Registry {

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
  constructor(instance: {
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
  }, authchainIdentity?: AuthchainIdentity) {
    this.$schema = instance.$schema || 'https://cashtokens.org/bcmr-v2.schema.json'
    this.version = instance.version
    this.latestRevision = instance.latestRevision
    this.registryIdentity = instance.registryIdentity
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

  /**
   *
   * The json content
   */
  getContent(){
    return JSON.stringify({
      $schema: this.$schema,
      version: this.version,
      latestRevision: this.latestRevision,
      registryIdentity: this.registryIdentity,
      identities: this.identities,
      tags: this.tags,
      defaultChain: this.defaultChain,
      chains: this.chains,
      license: this.license,
      extensions: this.extensions
    })
  }

  /**
   * Hash of the registry
   */
  getContentHash() {
    return binToHex(sha256.hash(utf8ToBin(this.getContent())))
  }

  /**
   * Stores this registry to the ipfs server. Invoke this first before publishing so
   * that the registry uri can be populated.
   */
  async storeRegistry(): Promise<BcmrStorageArtifact|undefined> {
    try {
      console.log('content', this.getContent())
      const resp = await fetch('/api/tokens/registry/storage', {
        method: 'POST', body: this.getContent(),
        headers: { 'Content-Type': 'application/json' }
      })
      const respJson = await resp.json()
      return respJson.artifact
    } catch (error) {
      console.log(error)
    }
  }

}
