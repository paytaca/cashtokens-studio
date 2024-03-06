
import { 
  binToHex, sha256, utf8ToBin, 
  ChainHistory, Extensions, IdentityHistory, 
  IdentitySnapshot, NftCategory, NftType,
  OffChainRegistryIdentity, Registry, 
  Tag, TokenCategory, URIs } from "mainnet-js";
import { AuthchainIdentity } from "../";
import { BcmrStorageArtifact } from "../types";

type ISODateString = `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`;

// ! Copied, because it's not exported by mainnet-js
/**
 * Interpretation information for a collection of sequential NFTs, a collection
 * in which each NFT includes only a sequential identifier within its on-chain
 * commitment. Note that {@link SequentialNftCollection}s differ from
 * {@link ParsableNftCollection}s in that sequential collections lack a
 * parsing `bytecode` with which to inspect each NFT commitment: the type of
 * each NFT is indexed by the full contents its commitment (interpreted as a
 * positive VM integer in user interfaces).
 */
export type SequentialNftCollection = {
  /**
   * A mapping of each NFT commitment (typically, a positive integer encoded as
   * a VM number) to metadata for that NFT type in this category.
   */
  types: {
    /**
     * Interpretation information for each type of NFT within the token
     * category, indexed by commitment hex. For sequential NFTs, the on-chain
     * commitment of each NFT is interpreted as a VM number to reference its
     * particular NFT type in user interfaces. Issuing a sequential NFT with a
     * negative or invalid VM number is discouraged, but clients may render the
     * commitment of such NFTs in hex-encoded form, prefixed with `X`.
     */
    [commitmentHex: string]: NftType;
  };
};

/**
 * Interpretation information for a collection of parsable NFTs, a collection
 * in which each NFT may include additional metadata fields beyond a sequential
 * identifier within its on-chain commitment. Note that
 * {@link ParsableNftCollection}s differ from {@link SequentialNftCollection}s
 * in that parsable collections require a parsing `bytecode` with which to
 * inspect each NFT commitment: the type of each NFT is indexed by the
 * hex-encoded contents the bottom item on the altstack following the evaluation
 * of the parsing bytecode.
 */
export type ParsableNftCollection = {
  /**
   * A segment of hex-encoded Bitcoin Cash VM bytecode that parses UTXOs
   * holding NFTs of this category, identifies the NFT's type within the
   * category, and returns a list of the NFT's field values via the
   * altstack. If undefined, this NFT Category includes only sequential NFTs,
   * with only an identifier and no NFT fields encoded in each NFT's
   * on-chain commitment.
   *
   * The parse `bytecode` is evaluated by instantiating and partially
   * verifying a standardized NFT parsing transaction:
   * - version: `2`
   * - inputs:
   *   - 0: Spends the UTXO containing the NFT with an empty
   *   unlocking bytecode and sequence number of `0`.
   *   - 1: Spends index `0` of the empty hash outpoint, with locking
   *   bytecode set to `parse.bytecode`, unlocking bytecode `OP_1`
   *   (`0x51`) and sequence number `0`.
   * - outputs:
   *   - 0: A locking bytecode of OP_RETURN (`0x6a`) and value of `0`.
   * - locktime: `0`
   *
   * After input 1 of this NFT parsing transaction is evaluated, if the
   * resulting stack is not valid (a single "truthy" element remaining on
   * the stack) – or if the altstack is empty – parsing has failed and
   * clients should represent the NFT as unable to be parsed (e.g. simply
   * display the full `commitment` as a hex-encoded value in the user
   * interface).
   *
   * On successful parsing evaluations, the bottom item on the altstack
   * indicates the type of the NFT according to the matching definition in
   * `types`. If no match is found, clients should represent the NFT as
   * unable to be parsed.
   *
   * For example: `00d2517f7c6b` (OP_0 OP_UTXOTOKENCOMMITMENT OP_1 OP_SPLIT
   * OP_SWAP OP_TOALTSTACK OP_TOALTSTACK) splits the commitment after 1 byte,
   * pushing the first byte to the altstack as an NFT type identifier and the
   * remaining segment of the commitment as the first NFT field value.
   *
   * If undefined (in a {@link SequentialNftCollection}), this field could be
   * considered to have a default value of `00d26b` (OP_0 OP_UTXOTOKENCOMMITMENT
   * OP_TOALTSTACK), which takes the full contents of the commitment as a fixed
   * type index. As such, each index of the NFT category's `types` maps a
   * precise commitment value to the metadata for NFTs with that particular
   * commitment. E.g. an NFT with an empty commitment (VM number 0) maps to
   * `types['']`, a commitment of `01` (hex) maps to `types['01']`, etc. This
   * pattern is used for collections of sequential NFTs.
   */
  bytecode: string;
  /**
   * A mapping of hex-encoded values to definitions of possible NFT types
   * in this category.
   */
  types: {
    /**
     * A definitions for each type of NFT within the token category. Parsable
     * NFT types are indexed by the hex-encoded value of the bottom altstack
     * item following evaluation of `NftCategory.parse.bytecode`. The remaining
     * altstack items are mapped to NFT fields according to the `fields`
     * property of the matching NFT type.
     */
    [bottomAltstackHex: string]: NftType;
  };
};

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
  // helper fields
  private _versionString?: string
  /**
   * The key of the new IdentitySnapshot if any.
   */
  newRevision?: ISODateString
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
    this._versionString = `${this.version?.major || 0 }.${this.version?.minor || 0 }.${this.version?.patch || 0 }`
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
    } else if (this.registryIdentity && typeof(this.registryIdentity) !== 'string') { 
      // OffchainRegistry identity BUT there is actually an authchain identities like Bitcats (which is probably a mistake)
      // this is anomally
      if (this.identities) {
        // since the token category isn't in the registryIdentity where it's supposed to be
        // we'll just assume the key of the identities field is the token category (like Bitcats)
        const registryIdentity = Object.keys(this.identities)[0]
        console.log(registryIdentity)
        if (this.identities && this.identities[registryIdentity] && this.identities[registryIdentity][this.latestRevision]) {
          return this.identities[registryIdentity][this.latestRevision]
        }
      } 
      // TODO: Here below we should add correct handling if registryIdentity is an OffchainRegistry
      // meaning this.identities should be undefined here
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

  get nftCategory(): NftCategory|undefined {
    return this.getToken()?.nfts
  }

  get nftCollection(): SequentialNftCollection|ParsableNftCollection|undefined{
    return this.nftCategory?.parse
  }

  /**
   * Converts the SequentialNftCollection.types|ParsableNftCollection.types to array of NftType(s) so 
   * it's easier to work with.
   */
  get nfts(): [{[commitmentHex: string]: NftType}]|[] {
    if (this.nftCollection?.types) {
      return Object.entries(this.nftCollection?.types).map(nftType=>({[nftType[0]]:nftType[1]})) as [{[commitmentHex: string]: NftType}]// convert array of arrays to array of objects
    }
    return []
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
  
  /**
   * Use this to set latestRevision don't modify directly. Otherwise the IdentitySnapshot will not be updated
   */
  setLatestRevision(r:string){
    if (this.identitySnapshot) {
      if (typeof(this.registryIdentity) === 'string') {
        const copy = Object.assign({}, this.identities![this.registryIdentity][this.latestRevision])
        this.identities![this.registryIdentity][r]=copy
        
      }
    }
    this.latestRevision = r
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

  /**
   * Deprecate this, use setTokenIdentityName
   */
  setRegistryName(name:string) {
    if (typeof (this.registryIdentity) === 'string' && this.identities) {
      this.identities![this.registryIdentity!][this.latestRevision!].name = name
    }
  }

  /**
   * Deprecate this, use setTokenIdentityDescription
   */
  setRegistryDescription(description:string) {
    if (typeof (this.registryIdentity) === 'string' && this.identities) {
      this.identities![this.registryIdentity!][this.latestRevision!].description = description
    }
  }

  setTokenIdentityName(name:string) {
    if (typeof (this.registryIdentity) === 'string' && this.identities) {
      this.identities![this.registryIdentity!][this.latestRevision!].name = name
    }
  }

  setTokenIdentityDescription(description:string) {
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
      this.identities![this.registryIdentity!][this.latestRevision!].token!.decimals = Number(decimals || 0)
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

  getAuthbase(): string[]{
    return Object.keys(this.identities||{})
  }

  getIdentityHistory(authbase:string):string[]{
    if (this.identities) {
      return Object.keys(this.identities[authbase] || {}).sort((date1: string, date2: string) => {
        if (date1 > date2) return -1;
        if (date1 < date2) return 1;
        return 0;
      })
    }
    return []
  }

  getIdentitySnapshot(authbase:string, identity_history:string){
    if (this.identities && this.identities[authbase] && this.identities[authbase][identity_history]) {
      return this.identities[authbase][identity_history]
    }
    return null
  }
  
  addIdentitySnapshotUri(authbase:string, identity_history:string, uri:URIs) {
    if (this.identities && this.identities[authbase] && this.identities[authbase][identity_history]) {
      this.identities[authbase][identity_history].uris = {
        ...this.identities[authbase][identity_history].uris,
        ...uri
      }
    }
  }

  /**
   * @deprecated Check usage before deleting, use addIdentitySnapshotUri
   */
  setIdentitySnapshotUri(authbase:string, identity_history:string, uri:URIs) {
    if (this.identities && this.identities[authbase] && this.identities[authbase][identity_history]) {
      this.identities[authbase][identity_history].uris = {
        ...this.identities[authbase][identity_history].uris,
        ...uri
      }
    }
  }

  removeIdentitySnapshotUri(authbase:string, identity_history:string, uriName: string) {
    if (this.identities && this.identities[authbase] && this.identities[authbase][identity_history]) {
      if (this.identities && this.identities[authbase] && this.identities![authbase]![identity_history].uris) {
        delete this.identities![authbase]![identity_history].uris![uriName]
      } 
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
    return this.token
    // if (typeof (this.registryIdentity) === 'string' && this.identities) {
    //   return this.identities![this.registryIdentity!][this.latestRevision!].token as TokenCategory
    // } else if (typeof (this.registryIdentity) !== 'string' && this.identities) {
    //   // OffchainRegistry but it has identities(just so we can handle something like bitcats)

    // }
  }

  addNft(commitmentHex:string, nft: NftType): void {
    if (this.getToken()) {
      if(!this.getToken()!.nfts) {
        this.getToken()!.nfts = {
          parse: {
            types: {}
          } as ParsableNftCollection
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

  removeEmptyFields(obj:Bcmr) {
    return JSON.parse(JSON.stringify(obj, function(key, value) {
      if (value === null || value === undefined || value === "") {
        return undefined; // Remove the field
      } else {
        return value; // Keep the field
      }
    }));
  }


  /**
   *
   * The json content
   * 
   * @param {ISODateString} identityHistoryTimestamp If present, will only keep the IdentityHistory with
   * this key.
   * 
   */
  getContent(authbase?:string, identityHistoryTimestamp?: ISODateString|string){
    console.log('AUTHBASE', authbase, identityHistoryTimestamp)

    const timestamp = identityHistoryTimestamp || this.latestRevision
    let identities = this.identities
    if (authbase && identityHistoryTimestamp) {
      identities = {
        [authbase]: {
          [timestamp]: this.identities![authbase][identityHistoryTimestamp]
        }
      }
    }
    console.log('IDENTITIES', identities)
    const content: Registry = {
      $schema: this.$schema,
      version: this.version,
      latestRevision: timestamp,
      registryIdentity: this.registryIdentity,
      identities: identities
    }

    if (this.tags) {
      content.tags = this.tags
    }
    if (this.defaultChain) {
      content.defaultChain = this.defaultChain
    }
    if (this.chains) {
      content.chains = this.chains
    }
    if (this.license) {
      content.license = this.license
    }
    if (this.extensions) {
      content.extensions = this.extensions
    }

    return JSON.stringify(content)
  }

  appendAuthGuardTokenStandardExtension(authKeyTokenId:string){
    this.extensions = { 
      ...this.extensions, 
      tokenStandard: "AuthGuard",
      authNft: authKeyTokenId
    }
  }

  get contentHash () {
    return binToHex(sha256.hash(utf8ToBin(this.getContent())))
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
  async storeRegistry(authbase?: string, identityHistoryTimestamp?: ISODateString|string): Promise<BcmrStorageArtifact|undefined> {
    this._processing = 'Storing in IPFS'
    try {
      const resp = await fetch('/api/tokens/registry/storage', {
        method: 'POST', body: this.getContent(authbase, identityHistoryTimestamp),
        headers: { 'Content-Type': 'application/json' }
      })
      if (resp.status >= 400) {
        throw new Error('Error, storing registry in IPFS, please try again later.')
      }
      const respJson = await resp.json()
      return respJson.artifact
    } catch (error) {
      console.log(error)
      throw error 
    } finally {
      delete this._processing
    }
  }
  
  // New
  getIdentityHistoryTimestamps(authbase?:string): ISODateString[] {
    if (!this.identities || Object.keys(this.identities || {}).length == 0) return []
    if (typeof(this.registryIdentity) != 'string' && !authbase && Object.keys(this.identities || {}).length > 1) {
      throw new Error('Please provide authbase')
    }
    let values:ISODateString[] = []
    if (authbase) {
      values = Object.keys(this.identities[authbase]) as ISODateString[]
    } else if(typeof(this.registryIdentity) == 'string') {
      values = Object.keys(this.identities[this.registryIdentity]) as ISODateString[]
    }
    return values.sort((date1: string, date2: string) => {
      if (date1 > date2) return -1;
      if (date1 < date2) return 1;
      return 0;
    }) 
  }

  /**
   * Creates new IdentitySnapshot.
   * @param {string} authbase 
   * @param {ISODateString} identityHistoryTimestamp The IdentitySnapshot timestamp
   */
  createNewIdentitySnapshot(authbase?:string, identityHistoryTimestamp?:ISODateString) {
    if (typeof(this.registryIdentity) != 'string' && !authbase && Object.keys(this.identities || {}).length > 1) {
      throw new Error('Please provide authbase')
    }
    this.newRevision = identityHistoryTimestamp || new Date().toISOString() as ISODateString
    if(!this.identities) {
      throw new Error('No existing identities')
    }
    // cloning latestRevision as starting point
    this.identities[authbase || this.registryIdentity as string][this.newRevision] 
      = structuredClone(this.identities[authbase || this.registryIdentity as string][this.getIdentityHistoryTimestamps()[0]])
    return this
  }

  /**
   * Adds the NftType(s) to the IdentitySnapshot keyed with identityHistoryTimestamp or the latest IdentityHistory.
   */
  addNftTypes(nftTypes: {[key:string]: NftType}, authbase?:string, identityHistoryTimestamp?: ISODateString) {
    if (typeof(this.registryIdentity) != 'string' && !authbase && Object.keys(this.identities || {}).length > 1) {
      throw new Error('Please provide authbase')
    }
    identityHistoryTimestamp = identityHistoryTimestamp || this.newRevision || this.getIdentityHistoryTimestamps()[0]
    if (!this.identities![authbase || this.registryIdentity as string][identityHistoryTimestamp].token?.nfts) {
      this.identities![authbase || this.registryIdentity as string][identityHistoryTimestamp].token!.nfts = {
        parse: {
          bytecode: '',
          types: {}
        }
      }
    }
    for (const key of Object.keys(nftTypes)) {
      this.identities![authbase || this.registryIdentity as string][identityHistoryTimestamp].token!.nfts!.parse!.types[key] = nftTypes[key]
    }
    return this
  }

}
