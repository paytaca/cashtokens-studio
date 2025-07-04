import {
  IdentitySnapshot,
  NFTCapability,
  TokenCategory,
  URIs,
  TestNetWallet,
  TokenI,
  UtxoI,
  Wallet,
} from 'mainnet-js';
import { AuthKey, BcmrIndexer, DEFAULT_TOKEN_VALUE } from '.';
import calcMinerFee from './utils/calcMinerFee';
import toCashScript from './utils/toCashScript';
import { Recipient, SignatureTemplate } from 'cashscript';
import {
  cashAddressToLockingBytecode,
  decodeTransaction,
  hexToBin,
} from '@bitauth/libauth';
import { Artifact, scriptToBytecode } from '@cashscript/utils';
import shortenTokenId from './utils/shortenTokenId';
import { PartialBcmr } from './interfaces';
import { NftCollectionType, TransactionSigner } from './types';
import { submitTransaction } from './utils';

export class AuthchainIdentity implements UtxoI, PartialBcmr {
  txid: string;
  vout: number;
  satoshis: number;
  height?: number | undefined;
  coinbase?: boolean | undefined;
  token?: TokenI | undefined;
  authKey?: AuthKey;
  ownerWallet?: Wallet | TestNetWallet;
  useAuthGuard?: true; // default
  /**
   * TokenCategory is a portion of the BCMR schema, we attached it here
   * since this serves as the token's profile and is frequently accessed
   * CAUTION: Do not include the `nfts` field
   * it might have a lot of items, e.g. BITCATS might
   * have 10k items.
   */
  tokenCategory?: TokenCategory;
  tokenUris?: URIs;
  identitySnapshot?: IdentitySnapshot;

  private _processing?: string;
  private static _processing?: string;
  transactionSigner?: TransactionSigner;

  constructor(
    u?: {
      txid: string;
      vout: number;
      satoshis: number;
      height?: number | undefined;
      coinbase?: boolean | undefined;
      token?: TokenI | undefined;
      authKey: AuthKey;
      ownerWallet?: Wallet | TestNetWallet;
    },
    transactionSigner?: TransactionSigner
  ) {
    if (u) {
      this.vout = u.vout;
      this.txid = u.txid;
      this.satoshis = u.satoshis;
      this.height = u.height;
      this.coinbase = u.coinbase;
      this.token = u.token;
      this.authKey = u.authKey;
      this.ownerWallet = u.ownerWallet;
    } else {
      this.vout = 0;
      this.txid = '';
      this.satoshis = 0;
    }

    this.transactionSigner = transactionSigner;
  }

  get utxo(): UtxoI {
    return {
      vout: this.vout,
      txid: this.txid,
      satoshis: this.satoshis,
      height: this.height,
      coinbase: this.coinbase,
      token: this.token,
    };
  }

  set utxo(u: UtxoI) {
    this.vout = u.vout;
    this.txid = u.txid;
    this.satoshis = u.satoshis;
    this.height = u.height;
    this.coinbase = u.coinbase;
    this.token = u.token;
  }

  // get identitySnapshot (): IdentitySnapshot|undefined {
  //   if (this.registry?.identities) {
  //     let authbase:string|string[] = Object.keys(this.registry!.identities || {})
  //     if (authbase) {
  //       authbase = authbase[0]
  //       let identity_history:string|string[] = Object.keys(this.registry!.identities[authbase] || {})
  //       if (identity_history) {
  //         identity_history = identity_history[0]
  //         return this.registry.identities[authbase][identity_history]
  //       }
  //     }
  //   }
  // }

  get processing(): string | undefined {
    return this._processing;
  }

  set processing(txt: string | undefined) {
    this._processing = txt;
  }

  static get processing(): string | undefined {
    return AuthchainIdentity._processing;
  }

  get burningCost(): number {
    return calcMinerFee({ 'P2SH-P2WPKH': 1, P2PKH: 2 }, { P2PKH: 2 });
  }

  get nftCollectionType(): NftCollectionType {
    if (
      !this.identitySnapshot?.token?.nfts?.parse?.bytecode ||
      this.identitySnapshot?.token?.nfts?.parse?.bytecode == '00d26b'
    ) {
      return 'SequentialNftCollection';
    }
    return 'ParsableNftCollection';
  }

  ensureOwnerWallet() {
    if (!this.ownerWallet) {
      throw new Error('Missing owner wallet');
    }
  }

  ensureAuthKey() {
    if (!this.authKey) {
      throw new Error('Missing AuthKey');
    }
  }

  // methods

  /**
   * Burn the authchain identity output
   */
  async burn(): Promise<string | undefined> {
    this.ensureOwnerWallet();
    this._processing = 'Processing';
    const funderInput = (await this.ownerWallet!.getAddressUtxos())
      .filter(
        (utxo: UtxoI) =>
          Boolean(!utxo.token) && utxo.satoshis > this.burningCost
      )
      .map(toCashScript)[0];
    if (!funderInput) {
      delete this._processing;
      throw new Error('Insufficient balance to fund the txn');
    }

    const [authchainIdentityOutput, authKeyInput] = [
      this.utxo,
      this.authKey!.utxo!,
    ].map(toCashScript);
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)));
    const contract = this.authKey!.authGuard!.contract!;
    const contractAddress = contract.getTokenDepositAddress();
    const batonOwner = this.authKey!.ownerWallet!.getTokenDepositAddress();
    const depositAddress = this.ownerWallet!.getDepositAddress();
    let transaction;
    let decoded;
    try {
      transaction = contract
        .getContractFunction('unlockWithNft')(false)
        .from(authchainIdentityOutput)
        .fromP2PKH([authKeyInput], sig)
        .fromP2PKH([funderInput], sig)
        .withOpReturn([
          'BURN',
          `0x${authchainIdentityOutput.txid
            .match(/[a-fA-F0-9]{2}/g)
            ?.reverse()
            .join('')}`,
        ])
        .to([
          {
            // Return minting AuthNFT / minting baton to owner
            to: batonOwner,
            amount: BigInt(this.authKey!.satoshis),
            token: authKeyInput.token,
          },
        ])
        // authchainIdentityOutput's value transferred to funder
        .to(
          funderInput.satoshis +
            authchainIdentityOutput.satoshis -
            BigInt(this.burningCost) >
            546
            ? [
                {
                  // change
                  to: depositAddress,
                  amount:
                    funderInput.satoshis +
                    authchainIdentityOutput.satoshis -
                    BigInt(this.burningCost),
                },
              ]
            : []
        )
        .withoutChange()
        .withoutTokenChange()
        .withHardcodedFee(BigInt(this.burningCost)); // burning cost is just the miner fee in this case

      decoded = decodeTransaction(hexToBin(await transaction.build()));

      if (typeof decoded === 'string') {
        delete this._processing;
        throw new Error('Failed to decode transaction');
      }
    } catch (error) {
      delete this._processing;
      throw error;
    }
    this._processing = `Waiting for signature`;

    let signingResult;
    try {
      const bytecode = (transaction as any).redeemScript;
      const artifact = { ...contract.artifact } as Partial<Artifact>;
      delete artifact.source;
      delete artifact.bytecode;

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);

      const sourceOutputs = [
        {
          ...decoded.inputs[0],
          lockingBytecode: (
            cashAddressToLockingBytecode(contractAddress) as any
          ).bytecode,
          valueSatoshis: BigInt(authchainIdentityOutput.satoshis),
          token: authchainIdentityOutput.token && {
            ...authchainIdentityOutput.token,
            category: hexToBin(authchainIdentityOutput.token!.category),
            nft: authchainIdentityOutput.token.nft && {
              ...authchainIdentityOutput.token.nft,
              commitment: hexToBin(
                authchainIdentityOutput.token.nft.commitment
              ),
            },
          },
          contract: {
            abiFunction: (transaction as any).abiFunction,
            redeemScript: scriptToBytecode(bytecode),
            artifact: artifact,
          },
        },
        {
          ...decoded.inputs[1],
          lockingBytecode: (cashAddressToLockingBytecode(batonOwner) as any)
            .bytecode,
          valueSatoshis: BigInt(authKeyInput.satoshis),
          token: authKeyInput.token && {
            ...authKeyInput.token,
            category: hexToBin(authKeyInput.token!.category),
            nft: authKeyInput.token.nft && {
              ...authKeyInput.token.nft,
              commitment: hexToBin(authKeyInput.token.nft.commitment),
            },
          },
        },
        {
          ...decoded.inputs[2],
          lockingBytecode: (cashAddressToLockingBytecode(depositAddress) as any)
            .bytecode,
          valueSatoshis: BigInt(funderInput.satoshis),
        },
      ];
      signingResult = await this.transactionSigner?.signTransaction(
        decoded,
        sourceOutputs,
        false,
        'Burn authchain of token: ' + shortenTokenId(this.token!.tokenId)
      );
    } catch (error) {
      delete this._processing;
      throw new Error('Error signing transaction');
    }

    if (!signingResult) {
      delete this._processing;
      return;
    }

    this._processing = 'Burning';

    try {
      // const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      // return tx await submitTransaction(signingResult, )
      return await submitTransaction(signingResult, this.ownerWallet as Wallet);
    } catch (error: any) {
      throw error;
    } finally {
      delete this._processing;
    }
  }

  /**
   * TODO, merge code with publish() once fully tested
   */
  async publishWithNonTokenAuthhead(opt: {
    url: string | string[];
    contentHash: string;
  }) {
    this.ensureOwnerWallet();
    this.ensureAuthKey();
    this._processing = 'Processing';
    const issuanceCost = calcMinerFee(
      { 'P2SH-P2WPKH': 1 },
      { P2SH: 1, P2PKH: 2 }
    );
    const funderInput = (await this.ownerWallet!.getAddressUtxos())
      .filter(
        (utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > issuanceCost
      )
      .map(toCashScript)[0];
    if (!funderInput) {
      delete this._processing;
      throw new Error('Insufficient balance to fund the txn');
    }
    const [authhead, authKeyInput] = [this.utxo, this.authKey!.utxo!].map(
      toCashScript
    );
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)));
    const contract = this.authKey!.authGuard!.contract!;
    const contractAddress = contract.getTokenDepositAddress();
    const batonOwner = this.authKey!.ownerWallet!.getTokenDepositAddress();
    const tokenOwner = this.ownerWallet!.getDepositAddress();
    let transaction;
    let decoded;
    let contentHash = opt?.contentHash;
    if (contentHash && !contentHash.startsWith('0x')) {
      contentHash = `0x${contentHash}`;
    }

    const authheadRecipient: Recipient = {
      to: contractAddress,
      amount: authhead.satoshis,
    };
    // Because authhead might be a non-token UTXO
    if (authhead.token && authhead.token?.category) {
      console.log('!!authhead.token?.category', authhead.token?.category);
      console.log(authhead.token);
      authheadRecipient.token = authhead.token;
    } else {
      if (authhead.token?.amount && authhead.token?.amount > 0) {
        // Just making sure we don't accidentally delete token amount
        throw Error(
          'Anomaly, authhead is non-token but has token amount!Utxo = ' +
            JSON.stringify(authhead.token || {})
        );
      }
      delete authhead.token; // toCashscript has token attribute even if utxo has no tokenId
    }

    const opReturn: any[] = ['BCMR', contentHash];

    if (typeof opt.url == 'string') {
      const uri = opt.url.replace('https://', '');
      opReturn.push(uri);
    }

    if (opt.url instanceof Array) {
      const uri = opt.url.map((u) => u.replace(/https:\/\//, ''));
      opReturn.push(...uri);
    }

    try {
      transaction = contract
        .getContractFunction('unlockWithNft')(true)
        .from(authhead) // contract
        .fromP2PKH(authKeyInput, sig) // AuthNFT/minting baton, funder
        .fromP2PKH(funderInput, sig) // AuthNFT/minting baton, funder
        // .to([{
        //   // return authchain identity output to contract
        //   to: contractAddress,
        //   amount: authchainIdentityOutput.satoshis,
        //   token: authchainIdentityOutput.token
        // }])
        .to([authheadRecipient]) // Return authhead
        .to([
          {
            // Return minting AuthNFT / minting baton to owner
            to: batonOwner,
            amount: BigInt(this.authKey!.satoshis),
            token: authKeyInput.token,
          },
        ])
        .withOpReturn(opReturn)
        .to(
          funderInput.satoshis - BigInt(issuanceCost) > 546
            ? [
                {
                  // change
                  to: tokenOwner,
                  amount: funderInput.satoshis - BigInt(issuanceCost),
                },
              ]
            : []
        )
        .withoutChange()
        .withoutTokenChange()
        .withHardcodedFee(BigInt(issuanceCost));

      decoded = decodeTransaction(hexToBin(await transaction.build()));

      if (typeof decoded === 'string') {
        delete this._processing;
        throw new Error('Failed to decode transaction');
      }
    } catch (error) {
      console.log(error);
      delete this._processing;
      throw error;
    }
    this._processing = 'Waiting for signature';
    let signingResult;
    try {
      const bytecode = (transaction as any).redeemScript;
      const artifact = { ...contract.artifact } as Partial<Artifact>;
      delete artifact.source;
      delete artifact.bytecode;

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);

      // To support non token UTXO
      const authheadSourceOutput: any = {
        ...decoded.inputs[0],
        lockingBytecode: (cashAddressToLockingBytecode(contractAddress) as any)
          .bytecode,
        valueSatoshis: BigInt(authhead.satoshis),
        // token: authhead.token && {
        //   ...authhead.token,
        //   category: hexToBin(authhead.token!.category),
        //   nft: authhead.token.nft && {
        //     ...authhead.token.nft,
        //     commitment: hexToBin(authhead.token.nft.commitment),
        //   },
        // },
        contract: {
          abiFunction: (transaction as any).abiFunction,
          redeemScript: scriptToBytecode(bytecode),
          artifact: artifact,
        },
      };

      if (authhead.token?.category) {
        authheadSourceOutput.token = authhead.token && {
          ...authhead.token,
          category: hexToBin(authhead.token!.category),
          nft: authhead.token.nft && {
            ...authhead.token.nft,
            commitment: hexToBin(authhead.token.nft.commitment),
          },
        };
      }

      const sourceOutputs = [
        // {
        //   ...decoded.inputs[0],
        //   lockingBytecode: (cashAddressToLockingBytecode(contractAddress) as any).bytecode,
        //   valueSatoshis: BigInt(authhead.satoshis),
        //   token: authhead.token && {
        //     ...authhead.token,
        //     category: hexToBin(authhead.token!.category),
        //     nft: authhead.token.nft && {
        //       ...authhead.token.nft,
        //       commitment: hexToBin(authhead.token.nft.commitment),
        //     },
        //   },
        //   contract: {
        //     abiFunction: (transaction as any).abiFunction,
        //     redeemScript: scriptToBytecode(bytecode),
        //     artifact: artifact,
        //   }
        // },
        authheadSourceOutput,
        {
          ...decoded.inputs[1],
          lockingBytecode: (cashAddressToLockingBytecode(batonOwner) as any)
            .bytecode,
          valueSatoshis: BigInt(authKeyInput.satoshis),
          token: authKeyInput.token && {
            ...authKeyInput.token,
            category: hexToBin(authKeyInput.token!.category),
            nft: authKeyInput.token.nft && {
              ...authKeyInput.token.nft,
              commitment: hexToBin(authKeyInput.token.nft.commitment),
            },
          },
        },
        {
          ...decoded.inputs[2],
          lockingBytecode: (cashAddressToLockingBytecode(tokenOwner) as any)
            .bytecode,
          valueSatoshis: BigInt(funderInput.satoshis),
        },
      ];

      signingResult = await this.transactionSigner?.signTransaction(
        decoded,
        sourceOutputs,
        false,
        'Publish registry update'
      );
    } catch (error) {
      console.log(error);
      delete this._processing;
      throw new Error('Error signing transaction');
    }

    if (!signingResult) {
      delete this._processing;
      return;
    }

    try {
      // const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      const tx = await submitTransaction(
        signingResult,
        this.ownerWallet as Wallet
      );
      if (tx) {
        this._processing = 'Published';
        setTimeout(() => {
          delete this._processing;
        }, 2000);
      }
      return tx;
    } catch (error) {
      throw error;
    } finally {
      delete this._processing;
    }
  }

  /**
   * Use this Authhead to publish metadata.
   */
  async publish(opt: {
    url: string | string[];
    contentHash: string;
  }): Promise<any> {
    this.ensureOwnerWallet();
    this.ensureAuthKey();

    if (!this.utxo.token?.tokenId) {
      return await this.publishWithNonTokenAuthhead(opt);
    }

    this._processing = 'Processing';
    const issuanceCost = calcMinerFee(
      { 'P2SH-P2WPKH': 1 },
      { P2SH: 1, P2PKH: 2 }
    );
    const funderInput = (await this.ownerWallet!.getAddressUtxos())
      .filter(
        (utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > issuanceCost
      )
      .map(toCashScript)[0];
    if (!funderInput) {
      delete this._processing;
      throw new Error('Insufficient balance to fund the txn');
    }
    const [authchainIdentityOutput, authKeyInput] = [
      this.utxo,
      this.authKey!.utxo!,
    ].map(toCashScript);
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)));
    const contract = this.authKey!.authGuard!.contract!;
    const contractAddress = contract.getTokenDepositAddress();
    const batonOwner = this.authKey!.ownerWallet!.getTokenDepositAddress();
    const tokenOwner = this.ownerWallet!.getDepositAddress();
    let transaction;
    let decoded;
    let contentHash = opt?.contentHash;
    if (contentHash && !contentHash.startsWith('0x')) {
      contentHash = `0x${contentHash}`;
    }

    const opReturn: any[] = ['BCMR', contentHash];

    if (typeof opt.url == 'string') {
      const uri = opt.url.replace('https://', '');
      opReturn.push(uri);
    }

    if (opt.url instanceof Array) {
      const uri = opt.url.map((u) => u.replace(/https:\/\//, ''));
      opReturn.push(...uri);
    }

    try {
      transaction = contract
        .getContractFunction('unlockWithNft')(true)
        .from(authchainIdentityOutput) // contract
        .fromP2PKH(authKeyInput, sig) // AuthNFT/minting baton, funder
        .fromP2PKH(funderInput, sig) // AuthNFT/minting baton, funder
        .to([
          {
            // return authchain identity output to contract
            to: contractAddress,
            amount: authchainIdentityOutput.satoshis,
            token: authchainIdentityOutput.token,
          },
        ])
        .to([
          {
            // Return minting AuthNFT / minting baton to owner
            to: batonOwner,
            amount: BigInt(this.authKey!.satoshis),
            token: authKeyInput.token,
          },
        ])
        .withOpReturn(opReturn)
        .to(
          funderInput.satoshis - BigInt(issuanceCost) > 546
            ? [
                {
                  // change
                  to: tokenOwner,
                  amount: funderInput.satoshis - BigInt(issuanceCost),
                },
              ]
            : []
        )
        .withoutChange()
        .withoutTokenChange()
        .withHardcodedFee(BigInt(issuanceCost));

      decoded = decodeTransaction(hexToBin(await transaction.build()));

      if (typeof decoded === 'string') {
        delete this._processing;
        throw new Error('Failed to decode transaction');
      }
    } catch (error) {
      console.log(error);
      delete this._processing;
      throw error;
    }
    this._processing = 'Waiting for signature';
    let signingResult;
    try {
      const bytecode = (transaction as any).redeemScript;
      const artifact = { ...contract.artifact } as Partial<Artifact>;
      delete artifact.source;
      delete artifact.bytecode;

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);

      const sourceOutputs = [
        {
          ...decoded.inputs[0],
          lockingBytecode: (
            cashAddressToLockingBytecode(contractAddress) as any
          ).bytecode,
          valueSatoshis: BigInt(authchainIdentityOutput.satoshis),
          token: authchainIdentityOutput.token && {
            ...authchainIdentityOutput.token,
            category: hexToBin(authchainIdentityOutput.token!.category),
            nft: authchainIdentityOutput.token.nft && {
              ...authchainIdentityOutput.token.nft,
              commitment: hexToBin(
                authchainIdentityOutput.token.nft.commitment
              ),
            },
          },
          contract: {
            abiFunction: (transaction as any).abiFunction,
            redeemScript: scriptToBytecode(bytecode),
            artifact: artifact,
          },
        },
        {
          ...decoded.inputs[1],
          lockingBytecode: (cashAddressToLockingBytecode(batonOwner) as any)
            .bytecode,
          valueSatoshis: BigInt(authKeyInput.satoshis),
          token: authKeyInput.token && {
            ...authKeyInput.token,
            category: hexToBin(authKeyInput.token!.category),
            nft: authKeyInput.token.nft && {
              ...authKeyInput.token.nft,
              commitment: hexToBin(authKeyInput.token.nft.commitment),
            },
          },
        },
        {
          ...decoded.inputs[2],
          lockingBytecode: (cashAddressToLockingBytecode(tokenOwner) as any)
            .bytecode,
          valueSatoshis: BigInt(funderInput.satoshis),
        },
      ];

      signingResult = await this.transactionSigner?.signTransaction(
        decoded,
        sourceOutputs,
        false,
        'Publish registry update'
      );
    } catch (error) {
      console.log(error);
      delete this._processing;
      throw new Error('Error signing transaction');
    }

    if (!signingResult) {
      delete this._processing;
      return;
    }

    try {
      // const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      const tx = await submitTransaction(
        signingResult,
        this.ownerWallet as Wallet
      );
      if (tx) {
        this._processing = 'Published';
        setTimeout(() => {
          delete this._processing;
        }, 2000);
      }
      return tx;
    } catch (error) {
      throw error;
    } finally {
      delete this._processing;
    }
  }

  /**
   *  Token issuance from reserves
   */
  async releaseTokensFromReserveSupply(arg: {
    to: string;
    amount: string;
  }): Promise<string | void> {
    this.ensureOwnerWallet();
    if (this.useAuthGuard) {
      this.ensureAuthKey();
    }

    this._processing = 'Processing';
    const minerFee = calcMinerFee(
      { 'P2SH-P2WPKH': 1, P2PKH: 2 },
      { P2SH: 2, P2PKH: 2 }
    );
    const issuanceCost = minerFee + DEFAULT_TOKEN_VALUE; // Token value of the issued tokens utxo

    const funderInput = (await this.ownerWallet!.getAddressUtxos())
      .filter(
        (utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > issuanceCost
      )
      .map(toCashScript)[0];
    if (!funderInput) {
      delete this._processing;
      throw new Error('Insufficient balance to fund the txn');
    }

    const [authchainIdentityOutput, authKeyInput] = [
      this.utxo,
      this.authKey!.utxo!,
    ].map(toCashScript);
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)));
    const contract = this.authKey!.authGuard!.contract!;
    const contractAddress = contract.getTokenDepositAddress();
    const batonOwner = this.authKey!.ownerWallet!.getTokenDepositAddress();
    const tokenOwner = this.ownerWallet!.getDepositAddress();
    let transaction;
    let decoded;
    try {
      transaction = contract
        .getContractFunction('unlockWithNft')(true)
        .from(authchainIdentityOutput) // contract
        // TODO: MAKE USE OF AUTHNFT OPTIONAL ONLY WHEN USING AUTHGUARD
        .fromP2PKH(authKeyInput, sig) // AuthNFT/minting baton, funder
        .fromP2PKH(funderInput, sig) // AuthNFT/minting baton, funder
        .to([
          {
            // return authchain identity output to contract
            to: contractAddress,
            amount: authchainIdentityOutput.satoshis,
            token: {
              category: authchainIdentityOutput.token!.category,
              amount:
                BigInt(authchainIdentityOutput.token!.amount) -
                BigInt(arg.amount), // deduct
              nft: authchainIdentityOutput.token!.nft,
            },
          },
        ])
        .to([
          {
            // Return minting AuthNFT / minting baton to owner
            to: batonOwner,
            amount: BigInt(authKeyInput.satoshis),
            token: authKeyInput.token,
          },
        ])
        .to([
          {
            // Issue tokens
            to: arg.to,
            amount: BigInt(DEFAULT_TOKEN_VALUE),
            token: {
              category: authchainIdentityOutput.token!.category,
              amount: BigInt(arg.amount), // issued amount
              // nft: authchainIdentityOutput.token!.nft
            },
          },
        ])
        .to(
          funderInput.satoshis - BigInt(issuanceCost) > 546
            ? [
                {
                  // change
                  to: tokenOwner,
                  amount: funderInput.satoshis - BigInt(issuanceCost),
                },
              ]
            : []
        )
        .withoutChange()
        .withoutTokenChange()
        .withHardcodedFee(BigInt(minerFee));

      decoded = decodeTransaction(hexToBin(await transaction.build()));

      if (typeof decoded === 'string') {
        delete this._processing;
        throw new Error('Failed to decode transaction');
      }
    } catch (error) {
      delete this._processing;
      throw error;
    }
    this._processing = 'Waiting for signature';
    let signingResult;
    try {
      const bytecode = (transaction as any).redeemScript;
      const artifact = { ...contract.artifact } as Partial<Artifact>;
      delete artifact.source;
      delete artifact.bytecode;

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);
      const sourceOutputs = [
        {
          ...decoded.inputs[0],
          lockingBytecode: (
            cashAddressToLockingBytecode(contractAddress) as any
          ).bytecode,
          valueSatoshis: BigInt(authchainIdentityOutput.satoshis),
          token: authchainIdentityOutput.token && {
            ...authchainIdentityOutput.token,
            category: hexToBin(authchainIdentityOutput.token!.category),
            nft: authchainIdentityOutput.token.nft && {
              ...authchainIdentityOutput.token.nft,
              commitment: hexToBin(
                authchainIdentityOutput.token.nft.commitment
              ),
            },
          },
          contract: {
            abiFunction: (transaction as any).abiFunction,
            redeemScript: scriptToBytecode(bytecode),
            artifact: artifact,
          },
        },
        {
          ...decoded.inputs[1],
          lockingBytecode: (cashAddressToLockingBytecode(batonOwner) as any)
            .bytecode,
          valueSatoshis: BigInt(authKeyInput.satoshis),
          token: authKeyInput.token && {
            ...authKeyInput.token,
            category: hexToBin(authKeyInput.token!.category),
            nft: authKeyInput.token.nft && {
              ...authKeyInput.token.nft,
              commitment: hexToBin(authKeyInput.token.nft.commitment),
            },
          },
        },
        {
          ...decoded.inputs[2],
          lockingBytecode: (cashAddressToLockingBytecode(tokenOwner) as any)
            .bytecode,
          valueSatoshis: BigInt(funderInput.satoshis),
        },
      ];
      signingResult = await this.transactionSigner?.signTransaction(
        decoded,
        sourceOutputs,
        false,
        'Issue/Release Tokens'
      );
    } catch (error) {
      delete this._processing;
      throw new Error('Error signing transaction');
    }

    if (!signingResult) {
      delete this._processing;
      return;
    }

    this._processing = 'Submitting Transaction';
    try {
      // const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      // return tx
      return await submitTransaction(signingResult, this.ownerWallet as Wallet);
    } catch (error: any) {
      throw new Error(error.message);
    } finally {
      delete this._processing;
    }
  }

  /**
   *
   *  Unguard or release this authchain identity output from the AuthGuard covenant.
   */
  async unguard(): Promise<string | void> {
    this.ensureOwnerWallet();
    this.ensureAuthKey();

    this._processing = 'Processing';
    const minerFee = calcMinerFee({ 'P2SH-P2WPKH': 1, P2PKH: 2 }, { P2PKH: 2 });
    const unguardingCost = minerFee;

    const funderInput = (await this.ownerWallet!.getAddressUtxos())
      .filter(
        (utxo: UtxoI) => Boolean(!utxo.token) && utxo.satoshis > unguardingCost
      )
      .map(toCashScript)[0];
    if (!funderInput) {
      delete this._processing;
      throw new Error('Insufficient balance to fund the txn');
    }

    const [authchainIdentityOutput, authKeyInput] = [
      this.utxo,
      this.authKey!.utxo!,
    ].map(toCashScript);
    const sig = new SignatureTemplate(Uint8Array.from(Array(32)));
    const contract = this.authKey!.authGuard!.contract!;
    const contractAddress = contract.getTokenDepositAddress();
    const batonOwner = this.authKey!.ownerWallet!.getTokenDepositAddress();
    const depositAddress = this.ownerWallet!.getDepositAddress();
    let transaction;
    let decoded;
    try {
      transaction = contract
        .getContractFunction('unlockWithNft')(false)
        .from(authchainIdentityOutput) // contract
        .fromP2PKH(authKeyInput, sig) // AuthNFT/minting baton, funder
        .fromP2PKH(funderInput, sig) // AuthNFT/minting baton, funder
        .to([
          {
            // transfer identity output to owner's p2pkh address
            to: this.ownerWallet!.getTokenDepositAddress(),
            amount: authchainIdentityOutput.satoshis,
            token: {
              category: authchainIdentityOutput.token!.category,
              amount: authchainIdentityOutput.token!.amount,
              nft: authchainIdentityOutput.token!.nft,
            },
          },
        ])
        .to([
          {
            // Return minting AuthNFT / minting baton to owner
            to: batonOwner,
            amount: BigInt(this.authKey!.satoshis),
            token: authKeyInput.token,
          },
        ])
        // emptied authkey's value transferred to owner
        .to(
          funderInput.satoshis - BigInt(unguardingCost) > 546
            ? [
                {
                  // change
                  to: depositAddress,
                  amount: funderInput.satoshis - BigInt(unguardingCost),
                },
              ]
            : []
        )
        .withoutChange()
        .withoutTokenChange()
        .withHardcodedFee(BigInt(minerFee));

      decoded = decodeTransaction(hexToBin(await transaction.build()));

      if (typeof decoded === 'string') {
        delete this._processing;
        throw new Error('Failed to decode transaction');
      }
    } catch (error) {
      delete this._processing;
      throw new Error('Error building transaction');
    }
    this._processing = 'Waiting for signature';
    let signingResult;
    try {
      const bytecode = (transaction as any).redeemScript;
      const artifact = { ...contract.artifact } as Partial<Artifact>;
      delete artifact.source;
      delete artifact.bytecode;

      decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);
      decoded.inputs[2].unlockingBytecode = Uint8Array.from([]);

      const sourceOutputs = [
        {
          ...decoded.inputs[0],
          lockingBytecode: (
            cashAddressToLockingBytecode(contractAddress) as any
          ).bytecode,
          valueSatoshis: BigInt(authchainIdentityOutput.satoshis),
          token: authchainIdentityOutput.token && {
            ...authchainIdentityOutput.token,
            category: hexToBin(authchainIdentityOutput.token!.category),
            nft: authchainIdentityOutput.token.nft && {
              ...authchainIdentityOutput.token.nft,
              commitment: hexToBin(
                authchainIdentityOutput.token.nft.commitment
              ),
            },
          },
          contract: {
            abiFunction: (transaction as any).abiFunction,
            redeemScript: scriptToBytecode(bytecode),
            artifact: artifact,
          },
        },
        {
          ...decoded.inputs[1],
          lockingBytecode: (cashAddressToLockingBytecode(batonOwner) as any)
            .bytecode,
          valueSatoshis: BigInt(authKeyInput.satoshis),
          token: authKeyInput.token && {
            ...authKeyInput.token,
            category: hexToBin(authKeyInput.token!.category),
            nft: authKeyInput.token.nft && {
              ...authKeyInput.token.nft,
              commitment: hexToBin(authKeyInput.token.nft.commitment),
            },
          },
        },
        {
          ...decoded.inputs[2],
          lockingBytecode: (cashAddressToLockingBytecode(depositAddress) as any)
            .bytecode,
          valueSatoshis: BigInt(funderInput.satoshis),
        },
      ];

      signingResult = await this.transactionSigner?.signTransaction(
        decoded,
        sourceOutputs,
        false,
        'Unguard Token: ' + shortenTokenId(this.token!.tokenId)
      );
    } catch (error) {
      delete this._processing;
      throw new Error('Error signing transaction');
    }

    if (!signingResult) {
      delete this._processing;
      return;
    }

    this._processing = 'Submitting Transaction';
    try {
      // const tx = await this.ownerWallet!.submitTransaction(hexToBin(signingResult!.signedTransaction), true);
      // return tx
      return await submitTransaction(signingResult, this.ownerWallet as Wallet);
    } catch (error: any) {
      throw new Error(error.message);
    } finally {
      delete this._processing;
    }
  }

  async resolveTokenCategory(quite?: boolean) {
    if (!this.token?.tokenId) return;
    try {
      if (quite !== true) {
        this._processing = 'Checking token registry';
      }
      const r = await fetch(
        `${process.env.BCMR_API}bcmr/${this.token!.tokenId}/token`
      );
      const rj = await r.json();
      if (!rj.error) {
        this.tokenCategory = rj;
      }
      delete rj.nfts; // exclude nfts, because it's uncapped
      delete this._processing;
    } catch (error) {
    } finally {
      delete this._processing;
    }
  }

  async resolveTokenUris(quite?: boolean) {
    if (!this.token?.tokenId) return;
    try {
      if (quite !== true) {
        this._processing = 'Checking token registry';
      }
      const r = await fetch(
        `${process.env.BCMR_API}bcmr/${this.token!.tokenId}/uris`
      );
      const rj = await r.json();
      if (!rj.error) {
        this.tokenUris = rj;
      }
    } catch (error: any) {
    } finally {
      delete this._processing;
    }
  }

  async resolveIdentitySnapshot(quite?: boolean) {
    if (!this.token?.tokenId) return;
    try {
      if (quite !== true) {
        this._processing = 'Checking token registry';
      }
      const r = await new BcmrIndexer().fetchIdentitySnapshot(
        this.token!.tokenId
      );
      this.identitySnapshot = r;
    } catch (error: any) {
    } finally {
      delete this._processing;
    }
  }

  /**
   * Populate the tokenCategory from Paytaca's bcmr indexer
   */
  static async utilPopulateTokenCategory(identities: AuthchainIdentity[]) {
    for (let i = 0; i < identities.length; i++) {
      try {
        const r = await fetch(
          `${process.env.BCMR_API}bcmr/${identities[i].token!.tokenId}/token`
        );
        const rj = await r.json();
      } catch (error) {
        console.log(
          `Error fetching ${identities[i].token!.tokenId} from indexer`,
          error
        );
        continue;
      }
    }
  }

  // statics
  static async scanWalletForAuthchainIdentities(
    ownerWallet: Wallet
  ): Promise<AuthchainIdentity[]> {
    AuthchainIdentity._processing = 'Scanning wallet for authchain identities';
    const identities: any[] = [];
    const batonLikeUtxos = (await ownerWallet.getAddressUtxos()).filter(
      (u: UtxoI) => {
        // get AuthNFT/batons
        return u.token && u.token.tokenId && u.token.commitment === '00';
      }
    );
    // const identityUtxos = []
    for (let i = 0; i < batonLikeUtxos.length; i++) {
      const key = new AuthKey({
        ...batonLikeUtxos[i],
        ownerWallet: ownerWallet,
      });
      const identityUtxos = await key.authGuard.getLockedTokenIdentities();
      for (let i = 0; i < identityUtxos.length; i++) {
        identities.push(
          new AuthchainIdentity({
            ...identityUtxos[i],
            authKey: key,
            ownerWallet: ownerWallet,
          })
        );
      }
    }

    delete AuthchainIdentity._processing;
    AuthchainIdentity.utilPopulateTokenCategory(identities);
    return identities;
  }

  /**
   * Invoke after spending this utxo. When watching wallet address
   * @param {string} unspentTxId The new txid
   */
  async updateUtxo(unspentTxId?: string) {
    this.ensureOwnerWallet();
    this._processing = 'Updating authhead utxo';
    try {
      if (this.authKey) {
        let updatedUtxo =
          await this.authKey?.authGuard.getLockedTokenIdentities();

        if (unspentTxId) {
          updatedUtxo = updatedUtxo?.filter(
            (u) => u.vout === 0 && u.txid === unspentTxId
          );
        } else {
          // TODO: @deprecate remove this else statement
          // we should require unspentTxId
          // find invokations of this function and pass confirmed unspentTxid
          updatedUtxo = updatedUtxo?.filter(
            (u) =>
              u.vout == 0 &&
              u.token?.tokenId == this.utxo.token?.tokenId &&
              u.token?.capability == this.utxo.token?.capability
          );
        }
        if (updatedUtxo) {
          this.utxo = updatedUtxo[0];
        }
      }
    } catch (error) {
      throw error;
    } finally {
      this._processing = '';
    }
  }

  /**
   * Invoke after spending the AuthKey, e.g. after minting.
   */
  async updateAuthKeyUtxo(unspentTxid?: string) {
    try {
      this.ensureOwnerWallet();
      this._processing = 'Updating authKey utxo';
      if (this.authKey) {
        let updatedAuthKeyUtxo;
        if (unspentTxid) {
          updatedAuthKeyUtxo = (
            await this.ownerWallet!.getAddressUtxos()
          ).filter(
            (u) =>
              u.txid == unspentTxid &&
              u.vout == this.authKey?.utxo.vout &&
              u.token?.tokenId == this.authKey?.utxo.token?.tokenId &&
              u.token?.capability == this.authKey?.utxo.token?.capability
          );
        } else {
          // TODO: @deprecate remove this else statement, we should require unspentTxId
          // find invokations of this function and pass confirmed unspentTxid
          // so that
          updatedAuthKeyUtxo = (
            await this.ownerWallet!.getAddressUtxos()
          ).filter(
            (u) =>
              u.vout == this.authKey?.utxo.vout &&
              u.token?.tokenId == this.authKey?.utxo.token?.tokenId &&
              u.token?.capability == this.authKey?.utxo.token?.capability
          );
        }

        if (updatedAuthKeyUtxo) {
          this.authKey.utxo = updatedAuthKeyUtxo[0];
        }
      }
    } catch (error) {
      throw error;
    } finally {
      this._processing = '';
    }
  }
}
