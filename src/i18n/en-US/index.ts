export default {
    success: {
        genesisInputCreation: 'Genesis input created successfully.',
        tokenCreation: 'Token created successfully.',
        authkeyCreation: 'Authkey created successfully.',
        burningFungibleToken: 'Fungible token burned successfully.',
        burningNft: 'NFT burned successfully.'
    },
    info: {
        walletNotReady: 'Wallet not ready',
        preparingTx: 'Preparing transaction, please wait...',
        waitingForSignature: 'Waiting for signature, please check your wallet...',
        broadcastingTx: 'Broadcasting transaction, please wait...',
        authkeyTokenIdCandidateHint: 'This will become the token id of your Authkey NFT',
        authkeyTokenIdCandidateNotFoundHint: 'No available token id candidate',
        authkeyTokenIdCandidateExplainer: `<p>Creating a new 'Authkey' requires a 'genesis input'. A valid genesis input is
            just an unspent BCH which is the 1st output of a previous transaction.</p><p> The txid of this
            genesis input becomes the future token id of the token you create, in this case when you
            create an Authkey Non-Fungible Token.</p>`,
        whatsThis: `What's this?`
    },
    error: {
        genesisInputCreation: 'Error creating genesis input.',
        tokenCreation: 'Error creating token.',
        authkeyCreation: 'Error creating authkey',
        burningFungibleToken: 'Error burning fungible token',
        burningNft: 'Error burning NFT.'
    },
    button: {
        ok: 'Ok',
        send: 'Send',
        cancel: 'Cancel',
        burn: 'Burn',
        sync: 'Sync',
        disconnect: 'Disconnect'
    }
}