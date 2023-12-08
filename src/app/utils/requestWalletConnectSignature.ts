import { decodeTransaction } from '@bitauth/libauth'
import  { stringify } from '@bitauth/libauth'
import { SignClient } from '@walletconnect/sign-client'


export default async (decodedTransaction:any, sourceOutputs:any, prompt:string, walletConnectSession:any, walletConnectSignerClient?:any):Promise<any> =>  {
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

  console.log('SIGN OPTIONS', options)
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

    const chainId = process.env.APP_ENV == 'development' || process.env.APP_ENV == 'development-build'? 'bch:bchtest': 'bch:bitcoincash'
  

  
  // console.log(signerClient)
  // if (walletConnectSignerClient.session.getAll().length <= 0) {
  //   return console.log('No Session')
  // }
  
  // console.log('SESSION', signerClient.session)
  let result
  try {
    result = await walletConnectSignerClient.request({
      chainId: chainId,
      topic: walletConnectSession.topic,
      request: {
        method: "bch_signTransaction",
        params: JSON.parse(stringify(options)),
      },
    });
    console.log('SIGN RESULT ', result)
    return result;
  } catch (error) {
    console.log('SIGN ERROR', error)
    console.log('ERROR SIGN RESULT', result)
    return undefined;
  }
}
