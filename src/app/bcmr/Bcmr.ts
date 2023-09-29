import { ChainHistory, Extensions, IdentityHistory, IdentitySnapshot, NftCategory, NftType, OffChainRegistryIdentity, Registry, SequentialNftCollection, Tag, TokenCategory, URIs } from "./bcmr-v2.schema";
import { AuthchainIdentity } from "../";
import { binToHex, hexToBin, sha256, utf8ToBin } from "mainnet-js";
import { BcmrStorageArtifact } from "../types";
import { Token } from "nft.storage";

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
  private _versionString?: string
  private _originalContentHash?: string // To track if content changed
  authchainIdentity?: AuthchainIdentity
  private _processing?:string
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
    this.identities = instance.identities
    this.tags = instance.tags
    this.defaultChain = instance.defaultChain
    this.license = instance.license
    this.extensions = instance.extensions
    this.initIdentities(instance)
    this._originalContentHash = this.getContentHash()
  }

  get versionString():string {
    this._versionString = `${this.version.major}.${this.version.minor}.${this.version.patch}`
    return this._versionString
  }

  set versionString(ver:string) {
    const [ major, minor, patch ]= ver.split('.')
    this.version = {major:Number(major||0), minor:Number(minor||0), patch:Number(patch||0)}
  }

  /**
   * Convenient getter for the deeply embedded IdentitySnapshot
   */
  get identitySnapshot(): IdentitySnapshot|undefined {
    if (this.registryIdentity && typeof(this.registryIdentity) === 'string') {
      if (this.identities && this.identities[this.registryIdentity] && this.identities[this.registryIdentity][this.latestRevision]) {
        return this.identities[this.registryIdentity][this.latestRevision]
      }
    }
    return
  }

  /**
   * Convenient getter for the deeply embedded TokenCategory
   */
  get token(): TokenCategory|undefined {
    return this.identitySnapshot?.token
  }

  /**
   * Returns true if the content has been modified
   */
  get isModified(): boolean {
    if (this._originalContentHash !== this.getContentHash()) {
      return true
    }
    return false
  }

  get processing():string|undefined {
    return this._processing
  }
  initIdentities(instance:Registry){
    
    if (typeof (this.registryIdentity) === 'string' && !this.identities && !instance?.identities) {
      this.identities = {
        [this.registryIdentity]: {
          [this.latestRevision]: {
            name: '',
            description: '',
            token: {
              category: this.registryIdentity,
              symbol: '',
              decimals: 0
            } as TokenCategory
          } as IdentitySnapshot
        } as IdentityHistory
      }
    }else {
      this.identities = instance?.identities
    }
  }

  setSchema(s:string){
    this.$schema = s
  }

  setLicense(l:string) {
    this.license = l
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

  /**
   * IdentitySnapshot URI
   */
  setUri(name:string, uri:string) {
    if (typeof (this.registryIdentity) === 'string' && this.identities && this.latestRevision) {
      if(this.identities![this.registryIdentity!][this.latestRevision!].uris?.[name]) {
        this.identities![this.registryIdentity!][this.latestRevision!].uris![name] = uri
      } 
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

  addNft(commitmentHex:string, nft: NftType): void {
    if (this.getToken()) {
      if(!this.getToken()!.nfts) {
        this.getToken()!.nfts = {
          parse: {
            types: {}
          } as SequentialNftCollection
        } 
      } 
      this.getToken()!.nfts!.parse.types[commitmentHex] = nft
    }
  }

  async publish() {
    if (!this.authchainIdentity) {
      throw new Error('Authchain identity required')
    }
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

  appendAuthGuardTokenStandardExtension(authKeyTokenId:string){
    this.extensions = { 
      ...this.extensions, 
      tokenStandard: "AuthGuard",
      authNft: authKeyTokenId
    }
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
    this._processing = 'Storing in IPFS'
    try {
      const resp = await fetch('/api/tokens/registry/storage', {
        method: 'POST', body: this.getContent(),
        headers: { 'Content-Type': 'application/json' }
      })
      const respJson = await resp.json()
      return respJson.artifact
    } catch (error) {
      console.log(error)
    } finally {
      delete this._processing
    }
  }

}
