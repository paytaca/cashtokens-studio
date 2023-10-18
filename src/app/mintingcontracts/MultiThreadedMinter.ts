import { UtxoI, Wallet, NetworkType, NFTCapability, TokenMintRequest, TokenSendRequest } from 'mainnet-js'
import { Contract } from "@mainnet-cash/contract"
import getWalletClass from 'src/app/utils/getWalletClass'
import { DEFAULT_TOKEN_VALUE } from '../constants'
import { bigIntToVmNumber, binToHex } from '@bitauth/libauth'
import { calcMinerFee, requestPaytacaSignature, submitTransaction } from '../utils'

export class MultiThreadedMinter {
  
  parentMinter: UtxoI
  mintPrice: number
  nftCollectionSize: number
  numberOfThreads: number
  network: NetworkType
  ownerWallet: Wallet
  /**
   * Parameters passed to the contract script
   */
  contractScriptParams: any 
  private _contract: Contract
  private _processing?: string
  constructor(opt:{parentMinter:UtxoI, mintPrice: number, nftCollectionSize: number, numberOfThreads: number, network: NetworkType, ownerWallet: Wallet}) {
    this.parentMinter = opt.parentMinter
    this.mintPrice = opt.mintPrice
    this.ownerWallet = opt.ownerWallet
    this.numberOfThreads = opt.numberOfThreads
    this.network = opt.network
    this.nftCollectionSize = opt.nftCollectionSize
    const pkh = this.ownerWallet.getPublicKeyHash(false)
    this.contractScriptParams = [BigInt(opt.mintPrice), BigInt(opt.numberOfThreads), pkh, opt.nftCollectionSize - 1]
    this._contract = new Contract(
      this.contractScript,
      this.contractScriptParams,
      opt.network
    )
  
  }
  
  
  mintNFT(){
    console.log('wip')
  }
  payout(){
    console.log('wip')
  }

  get processing(): string|undefined {
    return this._processing
  }

  get threadsCreationCost(): {minerFee: number, totalCost: number} {
    const minerFee = calcMinerFee({'P2SH-P2WPKH':2}, {P2SH:this.numberOfThreads, P2PKH: 1}) // out = contract address, change
    const totalCost = minerFee + (DEFAULT_TOKEN_VALUE * this.numberOfThreads)
    return {
      minerFee,
      totalCost
    }
  }

  /**
   * Creates minting UTXOs
   */
  async createThreads(){
    if (!this._contract) {
      throw new Error('Missing contract instance')
    }
    // check if the wallet owns a minting token for this category
    this._processing = 'Preparing threads'
    
    const funderUtxo = (await this.ownerWallet!.getAddressUtxos()).filter((u:UtxoI)=> {
      return Boolean(!u.token) && u.satoshis > this.threadsCreationCost.totalCost
    })[0]

    const requests = []
    for (let i = 0; i < this.numberOfThreads; i++) {
      requests.push(
        new TokenSendRequest({
          cashaddr: this._contract.getTokenDepositAddress(),
          value: DEFAULT_TOKEN_VALUE,
          tokenId: this.parentMinter.token!.tokenId,
          capability: NFTCapability.minting,
          commitment: binToHex(bigIntToVmNumber(BigInt(i))),
        })
      )
    }

    let encodedTransaction, sourceOutputs
    try {
       const encoded = await this.ownerWallet!.encodeTransaction(
        requests,
        false,
        {
          tokenOperation: 'mint',
          checkTokenQuantities: true,
          buildUnsigned: true,
          utxoIds: [this.parentMinter, funderUtxo],
          ensureUtxos: [this.parentMinter, funderUtxo]
        }
      )
      encodedTransaction = encoded?.encodedTransaction
      sourceOutputs = encoded?.sourceOutputs
    } catch (error) {
      delete this._processing  
    }

    this._processing = 'Awaiting signature'
    const signResult = await requestPaytacaSignature(encodedTransaction, sourceOutputs)
    if (!signResult || !signResult.signedTransaction) {
      delete this._processing
      return
    }
    this._processing = 'Creating Token'
    try {
      const tx = await submitTransaction(signResult, this.ownerWallet!)
      return tx
    } catch (error:any) {
      console.log(error)
      throw new Error(error.message)
    } finally {
      delete this._processing
    }
  }

  get contract():Contract {
    return this._contract
  }

  get contractScript(): string {
    return `pragma cashscript ^0.8.0;

    // Multi-threaded minting smart contract
    
    // Contract holds the next NFT nummber to mint as state in the commitment field of the minting NFT
    // Contract consists of a mintNFT and a payout function
    
    // Opcode count: 84 (max 201)
    // Bytesize: 163 (max 520)
    
    contract Mint(
        int mintPrice,
        int increment,
        bytes20 pkhPayout,
        int maximumCount
    ) {
        function mintNFT() {
            // require minting contract to be at input index zero
            require(this.activeInputIndex == 0);
    
            // Read nftNumber from contract commitment
            bytes commitment = tx.inputs[0].nftCommitment;
            int nftNumber = int(commitment);
            
            // Check if minting is still allowed
            require(nftNumber <= maximumCount);
    
            // Limit the max number of outputs to 3
            require(tx.outputs.length <= 3);
                
            // Output#0 preserves the NFT minting contract with a minting nft holding the new state and increased BCH value
            require(tx.outputs[0].lockingBytecode == tx.inputs[0].lockingBytecode);
            require(tx.outputs[0].tokenCategory == tx.inputs[0].tokenCategory);
            int nextNftNumber = nftNumber + increment;
            require(tx.outputs[0].nftCommitment == bytes(nextNftNumber));
            require(tx.outputs[0].value == tx.inputs[0].value + mintPrice);
    
            // Output#1 for the minted NFT
            require(tx.outputs[1].value == 1000);
            require(tx.outputs[1].nftCommitment == bytes(nftNumber));
            // Strip capability to get the tokenId for an immutable NFT
            bytes tokenId = tx.inputs[0].tokenCategory.split(32)[0];
            require(tx.outputs[1].tokenCategory == tokenId);
    
            // Allow for BCH change output
            if(tx.outputs.length == 3){
                // Output#2 BCH change output for minter
                require(tx.outputs[2].tokenCategory == 0x);
            }
        }
        function payout(sig sigPayout, pubkey pkPayout) {
            // Check the signature & public key against pkhPayout
            require(hash160(pkPayout) == pkhPayout);
            require(checkSig(sigPayout, pkPayout));
            
            // require minting contract to be at input index zero
            require(tx.inputs.length == 1);
    
            // Read count from contract commitment
            bytes commitment = tx.inputs[0].nftCommitment;
            int nftNumber = int(commitment);
    
            // Check if minting is still ongoing
            if(nftNumber <= maximumCount){
                // Limit the number of outputs to 2
                require(tx.outputs.length == 2);
                    
                // Output#0 preserves the NFT minting contract with same minting nft
                require(tx.outputs[0].lockingBytecode == tx.inputs[0].lockingBytecode);
                require(tx.outputs[0].tokenCategory == tx.inputs[0].tokenCategory);
                require(tx.outputs[0].nftCommitment == tx.inputs[0].nftCommitment);
    
                // Output#1 payout output
                require(tx.outputs[1].tokenCategory == 0x);
            } else {
                // Output#0 payout output
                require(tx.outputs.length == 1);
    
                // Burns minting NFT
                require(tx.outputs[0].tokenCategory == 0x);
            }
        }
    }`
  }
}