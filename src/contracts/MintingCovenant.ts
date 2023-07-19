import { Network } from 'mainnet-js'
import { MintingCovenantI } from './interfaces'
import { Contract } from '@mainnet-cash/contract'
export default class MintingCovenant implements MintingCovenantI {

  readonly contract: Contract

  constructor(readonly tokenId: string|Uint8Array, network: Network = Network.MAINNET) {
    this.contract = new Contract(
      this.script(),
      [tokenId],
      network
    )
  }

  static getInstance(tokenId: string|Uint8Array, network: Network = Network.MAINNET): MintingCovenantI {
    return new MintingCovenant(tokenId, network)
  }

  async unlockWithNft(): Promise<string | undefined> {
    const f = this.contract.getContractFunction('unlockWithNft')
    return ''
  }

  script(): string {
    return `
    pragma cashscript ^0.8.0;

    // covenant of the CCI token standard
    // Covenant unlocked by a specific NFT

    // Opcode count: 8 (max 201)
    // Bytesize: 46 (max 520)

    contract mintingCovenant(
        bytes tokenId
    ) {
        function unlockWithNft() {
            // Check that the first input holds the minting baton
            require(tx.inputs[1].tokenCategory == tokenId);
            require(tx.inputs[1].nftCommitment == 0x00);
            // Self preservation of the minting covenant as the first output
            require(tx.outputs[0].lockingBytecode == tx.inputs[this.activeInputIndex].lockingBytecode);
        }
    }`
  }

}
