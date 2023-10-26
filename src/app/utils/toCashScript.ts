import { UtxoI } from 'mainnet-js'
import { Utxo } from 'cashscript';
export default (utxo: UtxoI) =>
 ({
   satoshis: BigInt(utxo.satoshis),
   txid: utxo.txid,
   vout: utxo.vout,
   token: utxo.token
     ? ({
         amount: utxo.token?.amount ? BigInt(utxo.token.amount) : BigInt(0),
         category: utxo.token?.tokenId,
         nft:
           utxo.token?.capability || utxo.token?.commitment
             ? ({
                 capability: utxo.token?.capability,
                 commitment: utxo.token?.commitment,
               })
             : undefined,
       })
     : undefined,
 } as Utxo);