import type {
    AuthenticationProgramCommon,
    AuthenticationProgramStateCommon,
    AuthenticationVirtualMachine,
    Output,
    ResolvedTransactionCommon,
  } from 'bitauth-libauth-v3';

  import { createVirtualMachineBch, binStringToBin, binToHex, utf8ToBin, binToUtf8, bigIntToVmNumber, vmNumberToBigInt,  binsAreEqual, hexToBin, binToBinString } from "bitauth-libauth-v3";
  import { CID } from "multiformats/cid"
  import { NftCategoryFieldEncoding } from "./bcmr-v2.schema-extra-types";
  
  export type VMCreator = () => AuthenticationVirtualMachine<
    ResolvedTransactionCommon,
    AuthenticationProgramCommon,
    AuthenticationProgramStateCommon
  >;
  
  export type NftParseState = {
    alternateStack: Uint8Array[];
    error?: string;
  };
  
  /**
   * Evaluates the NFT parsing transaction and returns the resulting altstack along with any
   * evaluation error.
   *
   * @param utxo - the NFT to parse
   * @param bytecode - the bytecode as hex string
   * @param createVirtualMachine - a function that returns an {@link AuthenticationVirtualMachine}
   */
  export const parseNftState = (
    utxo: Output,
    bytecode: string,
    createVirtualMachine?: VMCreator,
  ): NftParseState => {
    const vm = createVirtualMachine
      ? createVirtualMachine()
      : createVirtualMachineBch();
  
    const { alternateStack, error } = vm.evaluate({
      inputIndex: 1,
      sourceOutputs: [
        utxo,
        {
          lockingBytecode: hexToBin(bytecode),
          valueSatoshis: BigInt(0),
        },
      ],
      transaction: {
        inputs: [
          {
            outpointIndex: 0,
            outpointTransactionHash: hexToBin(''),
            sequenceNumber: 0,
            unlockingBytecode: hexToBin(''),
          },
          {
            outpointIndex: 0,
            outpointTransactionHash: hexToBin(''),
            sequenceNumber: 0,
            unlockingBytecode: hexToBin('51'),
          },
        ],
        locktime: 0,
        outputs: [
          {
            lockingBytecode: hexToBin('6a'),
            valueSatoshis: BigInt(0),
          },
        ],
        version: 2,
      },
    });
    return { alternateStack, error };
  };
  
  /**
   * Returns the altstack as a result of parsing the NFT's commitment using the
   * provided bytecode.
   *
   * @param utxo - the NFT to parse
   * @param bytecode - the bytecode as hex string
   * @param createVirtualMachine - a function that returns an {@link AuthenticationVirtualMachine}
   */
  export const parseNft = (
    utxo: Output,
    bytecode: string,
    createVirtualMachine?: VMCreator,
  ): Uint8Array[] => parseNftState(utxo, bytecode, createVirtualMachine).alternateStack;
  
  export type NftTypeDerivationResult =
    | { success: true; bottomAltStackHex: string }
    | { success: false; error: string };
  
  /**
   * Derives an NFT type by evaluating the collection's `parse.bytecode` against an NFT output
   * carrying the provided commitment. The NFT type is the bottom item left on the altstack.
   *
   * @param params.category - the token category (hex) of the NFT
   * @param params.commitment - the NFT commitment as bytes
   * @param params.bytecode - the collection's `parse.bytecode` as hex
   */
  export const getBottomAltStackHex = (params: {
    category: string;
    commitment: Uint8Array;
    bytecode: string;
  }): NftTypeDerivationResult => {
    try {
      const { alternateStack, error } = parseNftState(
        {
          lockingBytecode: new Uint8Array(),
          valueSatoshis: BigInt(0),
          token: {
            amount: BigInt(0),
            category: hexToBin(params.category),
            nft: {
              capability: 'none',
              commitment: params.commitment,
            },
          },
        },
        params.bytecode,
      );
  
      if (error !== undefined) {
        return { success: false, error: `Parse bytecode evaluation failed: ${error}` };
      }
  
      const [bottom] = alternateStack;
      if (bottom === undefined) {
        return { success: false, error: 'Parse bytecode did not leave any item on the altstack' };
      }
  
      return { success: true, bottomAltStackHex: binToHex(bottom) };
    } catch (error) {
      return { success: false, error: `Parse bytecode evaluation failed: ${error}` };
    }
  };



export function encodeField(field: { value: any, nftCategoryFieldEncoding: NftCategoryFieldEncoding }): string {
    let hex = ''
    switch(field.nftCategoryFieldEncoding.type) {
        case 'boolean':
            if (field.value === true || field.value === 1) {
                hex = '01'
            } 
            if (field.value === false || field.value === 0) {
                hex = '00'
            }
            break
        case 'binary':
            hex = binToHex(binStringToBin(field.value))
            break 
        case 'hex':
            hex = field.value
            break 
        case 'https-url':
            hex = binToHex(utf8ToBin(encodeURI(field.value.replace('https://', ''))))
            break
        case 'ipfs-cid':
            const cid = CID.parse(field.value)
            hex = binToHex(cid.bytes)
            break
        case 'locktime':
            hex = binToHex(bigIntToVmNumber(field.value))
            break
        case 'number':
            hex = binToHex(bigIntToVmNumber(BigInt(field.value)))
            break 
        case 'utf8':
            hex = binToHex(utf8ToBin(field.value))
    }
    return hex
}

export function decodeField(field: { value: Uint8Array, nftCategoryFieldEncoding: NftCategoryFieldEncoding }): any {
    switch(field.nftCategoryFieldEncoding.type) {
        case 'boolean':
            if (binsAreEqual(hexToBin('00'), field.value)) return false
            if (binsAreEqual(hexToBin('01'), field.value)) return true
            throw new Error('Value is not a boolean')
        case 'binary':
            return binToBinString(field.value)
        case 'hex':
            return binToHex(field.value)
        case 'https-url':
            return decodeURI(binToUtf8(field.value))
        case 'ipfs-cid':
            return CID.decode(field.value).toString()
        case 'locktime':
            return vmNumberToBigInt(field.value)
        case 'number':
            return vmNumberToBigInt(field.value)
        case 'utf8':
            return binToUtf8(field.value)
        default:
            throw new Error('Unable to decode')
    }
}