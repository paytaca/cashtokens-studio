import { ChainHistory, Extensions, IdentityHistory, OffChainRegistryIdentity, Registry, Tag } from "src/bcmr/bcmr-v2.schema";

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
  constructor(instance:Registry) {
    this.version = instance.version
    this.registryIdentity = instance.registryIdentity
    this.latestRevision = instance.latestRevision
  }

  addNFT(){}
  removeNFT(){}
  addIdentityHistory(){}
  addTag(){}
  removeTag(){}
  toJSON(){
    return JSON.stringify(this)
  }


}
