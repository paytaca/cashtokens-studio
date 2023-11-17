import  { stringify } from '@bitauth/libauth'

export  default async (signClient:any, options:any, connectedChain: string, walletConnectSession: any) => {
  // options
  // {
  //   transaction: decodedTransaction,
  //   sourceOutputs: listSourceOutputs,
  //   broadcast: true,
  //   userPrompt: "Mint Cash-Ninja NFT"
  // };
  try {
    const result = await signClient.request({
      chainId: connectedChain,
      topic: walletConnectSession.topic,
      request: {
        method: "bch_signTransaction",
        params: JSON.parse(stringify(options)),
      },
    });

    return result;
  } catch (error) {
    return undefined;
  }
}
