// import enUS from './en-us'

// export default {
//   'en-US': enUS,
// }

import SequentialNftCollection from "src/components/bcmr/SequentialNftCollection.vue";

export default {
    success: {
        genesisInputCreation: 'Genesis input created successfully.',
        tokenCreation: 'Token created successfully.',
        authkeyCreation: 'Authkey created successfully.',
        burningFungibleToken: 'Fungible token burned successfully.',
        burningNft: 'NFT burned successfully.',
        registryPublication: 'Registry published successfully.',
        saved: 'Saved',
        savedDescription: 'Changes saved successfully.'

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
        whatsThis: `What's this?`,
        uploadingRegistryToIpfs: 'Uploading registry to IPFS',
        uploadedRegsitryToIpfs: 'Uploaded registry to IPFS, id = {cid}',
        clearingChanges: 'Clearing Changes',
        sequentialCollectionHelp: `<p>A sequential NFT collection where each NFT includes a sequential identifier within its on-chain commitment. The type of each NFT is indexed by the full contents of its commitment, interpreted as a positive number.</p><p>Your NFT items are numbered sequentially — each minted NFT gets the next available sequence number (1, 2, 3...). This is the simplest NFT model, ideal for numbered collectibles, images, videos, or any series where items differ only by their position in the sequence.</p>`,
        parsableCollectionHelp: 'A parsable NFT collection where each NFT may include additional metadata fields beyond a sequential identifier within its on-chain commitment. Parsable collections require a parsing bytecode with which to inspect each NFT commitment: the type of each NFT is indexed by the bottom item on the altstack following evaluation of the parsing bytecode.'
    },
    error: {
        genesisInputCreation: 'Error creating genesis input.',
        tokenCreation: 'Error creating token.',
        authkeyCreation: 'Error creating authkey',
        burningFungibleToken: 'Error burning fungible token',
        burningNft: 'Error burning NFT.',
        loadingRegistry: 'Error loading token registry',
        initializingWizardConnectWalle: 'Error initializing wizard connect wallet',
        registryPublication: 'Error publishing registry'
    },
    warning: {
        errorLoadingUnpublishedNfts: 'Error loading unpublished NFTs',
        errorLoadingPublishedNfts: 'Error loading published NFTs'
    },
    button: {
        ok: 'Ok',
        send: 'Send',
        edit: 'Edit',
        delete: 'Delete',
        cancel: 'Cancel',
        burn: 'Burn',
        sync: 'Sync',
        disconnect: 'Disconnect',
        publishChanges: 'Publish Changes',
        publish: 'Publish',
        hide: 'Hide',
        show: 'Show',
        add: 'Add',
        addUri: 'Add URI',
        upload: 'Upload',
        reset: 'Reset',
        save: 'Save',
        issueTokens: 'Issue Tokens'
    },
    label: {
        options: 'Options',
        modified: 'Modified',
        now: 'Now',
        new: 'New',
        sequenceNoHint: 'This becomes the NFT\'s item id',
        registry: {
            displayFull: 'Display full token registry',
            registryOf: 'Registry of {symbol}',
            registry: 'Registry',
            schema: 'Schema',
            version: 'Version',
            registryIdentity: 'Registry Identity',
            latestRevision: 'Latest Revision',
            identities: 'Identities',
            authbase: 'Authbase',
            identityHistory: 'Identity History',
            identitySnapshot: 'Identity Snapshot',
            name: 'Name',
            description: 'Description',
            status: 'Status',
            token: 'Token',
            symbol: 'Symbol',
            decimals: 'Decimals',
            sequentialNftCollection: 'Sequential NFT Collection',
            parsableNftCollection: 'Parsable NFT Collection',
            uris: 'URIs',
            uriName: 'URI name',
            uri: 'URI',
            identityHistoryStrategy: 'Identity History Strategy',
            identityHistoryStrategyKeepAll: 'Keep All',
            identityHistoryStrategyLatestOnly: 'Latest Only (Recommended)',
            identityHistoryStrategyLatestOnlyHint: `Will only keep the latest entry of the identity history. Select this if you'd just want to update
                      your token's metadata.`,
            identityHistoryStrategyKeepAllHint: `Will keep all the identity history, i.e. Token Metadata, NFTs etc... will be duplicated even if you just change 1 field.
                      This will cause the metadata file size to bloat, so only select this if you need to keep track
                      of older revisions.`,
            identityHistoryAddOptionsCopyMostRecent: 'Copy Most Recent Snapshot (Recommended)',
            identityHistoryAddOptionsCreateNew: 'Copy New Snapshot',
            identityHistoryAddOptionsCopyMostRecentHint: `Will duplicate the last identity snapshot (including your Token metadata). Use this if you want to modify the Token metadata, like changing symbol, decimals, adding NFT etc...`,
            identityHistoryAddOptionsCreateNewHint: `Will create a new blank identity snapshot (blank Token metadata). Use this if you want to start from scratch`,
            unpublished: 'Unpublished',
            versionPatchHint: `Recommended when modifying or correcting some details to your registry or token metadata. This will NOT create a new identity snapshot and add to the identity history.`,
            versionMinorHint: `Recommended if you are introducing a new token identity or adding a brand-new point-in-time snapshot. This adds a new entry to your identity history so wallets can track the historical progression.`,
            versionMajorHint: `Recommended if you are removing an existing identity from the registry entirely, or if you are transitioning from a development draft (0.x.x) into your first stable public release (1.0.0).`,
            versionDefaultHint: `Not sure what to choose? Leaving it on "Patch" is the safest option for standard text edits, type fixes or simple registry updates. It also prevents registry bloat, as creating a new snapshot copies forward your existing identity snapshots.`,
            versionTypeOfChange: 'Type of change',
            versionPatchUpgrade: 'Patch',
            versionMinorUpgrade: 'Minor Change',
            versionMajorUpgrade: 'Major Change',
            unpublishedNfts: 'Unpublished NFTs',
            unpublishedCaption: 'These NFTs are not yet published on chain',
            published: 'Published NFTs',
            publishedCaption: 'These NFTs are published on chain',
            nftCategory: 'NFT Category'
        }
    },
    mint: {
        mintChildNft: 'Mint Child NFT',
        mintStrategy: 'Mint Strategy',
        mintNextSequence: 'Mint next sequence',
        mintParticularSequence: 'Mint a particular sequence #',
        mintAnotherMinter: 'Mint another minter',
        mintParticularType: 'Mint a particular NFT type',
        numberOfNfts: 'Number of NFTs to mint',
        sequence: 'Sequence #',
        nftType: 'NFT Type',
        nftTypeHex: 'NFT Type (Hex)',
        nextSequenceNumber: 'Next sequence number',
        bottomAltStackHex: 'Bottom AltStack hex',
        capability: 'Capability',
        recipient: 'Recipient',
        self: 'Self',
        cancel: 'Cancel',
        mint: 'Mint',
        mintingCapabilityHint: 'This will mint NFTs with minting capability, allowing the recipient to mint further child NFTs.',
        uniquenessWarning: 'This affects uniqueness if you mint an already minted type',
        mustBeHex: 'Must be hex',
        enterTokenAddress: 'Enter token address',
        backToCollection: 'Back to Collection',
        lastMintedSeq: 'Last minted seq:',
        nextSequenceHint: 'Will mint NFTs #{start} - #{end}',
        particularSequenceHint: 'Will mint {quantity} NFT(s) with sequence #{seq}',
    }
}