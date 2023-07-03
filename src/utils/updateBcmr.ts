import { binToHex, cashAddressToLockingBytecode, decodeTransaction, sha256, utf8ToBin } from '@bitauth/libauth';
import { hexToBin } from 'mainnet-js'
import { Artifact, scriptToBytecode } from '@cashscript/utils';
import { useUIStore } from 'src/stores/ui';
import { SignatureTemplate } from 'cashscript';
import createAuthChainGuardContract from './createAuthChainGuardContract';
import getWalletClass from './getWalletClass';
import toCashScript from './toCashScript';

export default async (contractOwnerAddress:string, contractAddress:string, tokenId:string, paramMintCost:number, paramMaxSupply:number,  paramTokenValue:number, newBcmrUri: string) => {

  const ui = useUIStore()
  const WalletClass = getWalletClass()

  let contentHash;
  try {
    const response = await fetch(newBcmrUri);
    const text = await response.text();
    contentHash = sha256.hash(utf8ToBin(text));
  } catch {
    ui.setMessage({type: 'error', text: 'Failed to fetch BCMR metadata from this URI', timeout:10000})
    return;
  }

  const contractOwnerWallet = await WalletClass.watchOnly(contractOwnerAddress!);
  const contractOwnerWalletPkh = contractOwnerWallet.getPublicKeyHash(false);

  const contract = createAuthChainGuardContract({
    ownerPubKey: contractOwnerWalletPkh,
    network: contractOwnerWallet.network,
  });

  const func = contract.getContractFunction('TransferOrUpdateOrBurn');

  let contractUtxos = (await contract.getUtxos()).filter(val => val.token?.tokenId === tokenId).map(toCashScript);
  let contractInput = contractUtxos[0];

  const ownerUtxo = (await contractOwnerWallet.getAddressUtxos()).filter(val => !val.token && val.satoshis > 2000).map(toCashScript)[0];
  if (!ownerUtxo) {
    ui.setMessage({type: 'error', text: 'No suitable utxos found to fund transaction', timeout:10000})
    return;
  }

  const sig = new SignatureTemplate(Uint8Array.from(Array(32)))

  let transaction;
  const minerFee = 1000;
  try{
    transaction = func(Uint8Array.from(Array(33)), Uint8Array.from(Array(65)))
    .from(contractInput)
    .fromP2PKH(ownerUtxo, sig)
    .to([
      // contract pass-by
      {
        to: contract.getTokenDepositAddress(),
        amount: contractInput.satoshis,
        token: contractInput.token,
      },
      ])
      .withOpReturn([
        'BCMR',
        binToHex(contentHash), // sha256 of the contents from the uri below
        newBcmrUri.replace('https://', '')
      ])
      .to([{
        to: contractOwnerAddress,
        amount: ownerUtxo.satoshis - BigInt(minerFee)
      }])
      .withoutChange().withoutTokenChange().withHardcodedFee(BigInt(minerFee))

  } catch {
    ui.setMessage({type: 'error', text: 'Failed to build withdraw transaction', timeout:10000})
    return;
  }

  const decoded = decodeTransaction(hexToBin(await transaction.build()));
  if (typeof decoded === 'string') {
    ui.setMessage({type: 'error', text: decoded, timeout:10000})
    return;
  }

  const bytecode = (transaction as any).redeemScript;
  const artifact = {...contract.artifact} as Partial<Artifact>;
  delete artifact.source;
  delete artifact.bytecode;

  decoded.inputs[1].unlockingBytecode = Uint8Array.from([]);

  const signResult = await window.paytaca!.signTransaction({
    transaction: decoded,
    sourceOutputs: [{
      ...decoded.inputs[0],
      lockingBytecode: (cashAddressToLockingBytecode(contractAddress!) as any).bytecode,
      valueSatoshis: BigInt(contractInput.satoshis),
      token: contractInput.token && {
        ...contractInput.token,
        category: hexToBin(contractInput.token.category),
        // nft: contractInput.token.nft && {
        //   ...contractInput.token.nft,
        //   commitment: hexToBin(contractInput.token.nft.commitment),
        // },
      },
      contract: {
        abiFunction: (transaction as any).abiFunction,
        redeemScript: scriptToBytecode(bytecode),
        artifact: artifact,
      }
    }, {
      ...decoded.inputs[1],
      lockingBytecode: (cashAddressToLockingBytecode(contractOwnerAddress!) as any).bytecode,
      valueSatoshis: BigInt(ownerUtxo.satoshis),
    }],
    broadcast: false,
    userPrompt: 'Sign transaction to update BCMR'
  });

  if (signResult === undefined) {
    ui.setMessage({type: 'error', text: 'Failed to build withdraw transaction', timeout:5000})
    return;
  }

  try {
    const tx = await contractOwnerWallet.submitTransaction(hexToBin(signResult.signedTransaction), true);  
    console.log(tx)
    ui.setMessage({type: 'success', text: `Success: Tx = ${tx}`, timeout:10000})
  } catch (error) {
    console.log(error)
    ui.setMessage({type: 'error', text: 'Error submitting transaction', timeout:10000})
  }
  
  // verify 
}