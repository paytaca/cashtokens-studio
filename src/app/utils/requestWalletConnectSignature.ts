import { decodeTransaction } from '@bitauth/libauth'
import  { stringify } from '@bitauth/libauth'
import { SignClient } from '@walletconnect/sign-client'
import { useUserWallet } from 'src/composables/useUserWallet'
import { useWalletConnect } from 'src/composables/useWalletConnect'


export  default async (decodedTransaction:any, sourceOutputs:any, prompt:string):Promise<any> =>  {
  // options
  // {
  //   transaction: decodedTransaction,
  //   sourceOutputs: listSourceOutputs,
  //   broadcast: true,
  //   userPrompt: "Mint Cash-Ninja NFT"
  // };
  
  // const decoded = decodeTransaction(encodedTransaction)
  // if (typeof decoded === 'string') {
  //   throw new Error('Error decoding transaction')
  // }
  
  const options = {
    transaction: decodedTransaction,
    sourceOutputs: sourceOutputs,
    broadcast: true,
    userPrompt: prompt
  }

  const projectId = process.env.WALLET_CONNECT_PROJECT_ID!
  const signerClient = await SignClient.init({
      projectId,
      // optional parameters
      relayUrl: 'wss://relay.walletconnect.com',
      metadata: {
        name: 'Cash-Tokens-Studio',
        description: 'Cash Tokens Studio',
        url: process.env.WALLET_CONNECT_VERIFIED_URL!,
        icons: ['https://cashtokens.studio/images/cts_icon.png']
      }
    })
  
  console.log(signerClient)
  if (signerClient.session.getAll().length <= 0) {
    return console.log('No Session')
  }
  try {
    const result = await signerClient.request({
      chainId: 'bch:bchtest',
      topic: signerClient.session.getAll()[0]?.topic,
      request: {
        method: "bch_signTransaction",
        params: JSON.parse(stringify(options)),
      },
    });
    console.log('signerClient result ', result)
    return result;
  } catch (error) {
    return undefined;
  }
}
