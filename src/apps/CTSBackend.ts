import { Network } from 'mainnet-js';

export type NFTProjectPublishingOptions = {
  tokenId: string;
  mintingContractName: string;
  mintingContractParams: any;
  mintingContractScript: string;
  mintingPrice: string | number;
  mintingBannerMessage: string;
  mintingDate: any;
  collectionSize: number;
  publisherAddress: string;
  publishedOn?: string | number;
  network: Network;
};

export type FetchPublishedNFTProjectsOptions = {
  tokenId: string;
  publisherAddress: string;
};

export class CTSBackend {
  apiBaseUri: string;
  processing?: string;
  error?: unknown;
  constructor() {
    if (!process.env.CTS_API) throw new Error('CTS_API not set');
    this.apiBaseUri = process.env.CTS_API;
  }

  /**
   * Publishes a minting project to CashTokens Studio.
   */
  async publishNFTProject(opt: NFTProjectPublishingOptions): Promise<boolean> {
    this.processing = 'Publishing';
    try {
      if (!opt.publishedOn) {
        opt.publishedOn = new Date().getTime();
      }
      const r = await fetch(`${this.apiBaseUri}v1/nft-projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opt),
      });
      return true;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Publishes a minting project to CashTokens Studio.
   */
  async fetchPublishedNFTProjects(
    opt?: FetchPublishedNFTProjectsOptions,
  ): Promise<any> {
    this.processing = 'Fetching data from server';
    try {
      const r = await fetch(`${this.apiBaseUri}v1/nft-projects`);
      return await r.json();
    } catch (error) {
      throw error;
    } finally {
      delete this.processing;
    }
  }
}
