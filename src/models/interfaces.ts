
export type Registry = {
  url:string,
  contentHash:string
}

type GenesisOptions = {
  recipient: string
}

export interface CashStudioTokenI {
  /**
   * Create a token genesis
   * @return {string} The transaction hash on success
   */
  createGenesis(opt: GenesisOptions): Promise<string|void>
}
