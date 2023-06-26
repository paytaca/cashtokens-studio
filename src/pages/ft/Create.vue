<template>
  <q-page class="row justify-evenly">
    <div class="col-8">
      <div class="row q-my-lg">
        <div class="col">Create New Fungible Token</div>
      </div>
      <q-form class="row">
        <div class="col">
          <div class="row q-my-lg">
            <div class="col">
              <q-input :filled="true" v-model="fungibleToken.ownerAddress" label="Token owner's address"></q-input>
            </div>  
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-input :filled="true" v-model="fungibleToken.name" label="Token name"></q-input>
            </div>  
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-input :filled="true" v-model="fungibleToken.maxSupply" label="Max Supply"></q-input>
            </div>  
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-input :filled="true" v-model="fungibleToken.bcmrUrl" label="BCMR Url"></q-input>
            </div>  
          </div>
          <div class="row q-my-lg">
            <div class="col">
              <q-btn color="primary" @click.stop="createFtTokenGenesis">Create Token Genesis</q-btn>
            </div>  
          </div>
        </div>
      </q-form>
    </div>
  </q-page>
</template>

<script lang="ts">

import { defineComponent } from 'vue';
import getWalletClass from 'src/utils/getWalletClass';
import { useUserStore } from 'src/stores/user';
import { hexToBin, OpReturnData } from 'mainnet-js'
import { sha256, utf8ToBin } from '@bitauth/libauth';

const token_category = "369e93d4eb677462b94937d8e6ecc64e8a52872c12f5155ead12700247485876"
//         token_category_timestamp = "2023-05-19T00:00:00Z"
//         latestRevision = "2023-05-19T00:00:00Z"
//         # latestRevision = f"{datetime.now(timezone.utc):%Y-%m-%dT%H:%M:%SZ}"
const bcmr = {
          $schema: 'https://cashtokens.org/bcmr-v2.schema.json',
          version: { 'major': 1, 'minor': 0, 'patch': 0 },
          latestRevision: '2023-06-26T03:02:34.464Z',
          registryIdentity: {
            name: 'BitRon metadata registry',
            description: 'Metadata for the BitRon Asset',
            uris: {
              icon: 'https://bitron.cash/icons/bitron.png',
              web: 'https://bitron.cash',
              registry: 'https://bitron.cash/.well-known/bitcoin-cash-metadata-registry.json'
            }
          },
          identities: {
            [token_category]: {
              '2023-06-26T03:02:34.464Z': {
                name: 'bitron',
                description: 'universal currency',
                token: {
                  category: token_category,
                  symbol: 'BRON',
                  decimals: 18
                },
                uris: {
                  icon: 'https://bitron.cash/icons/bitron.png',
                  web: 'https://bitron.cash',
                  chat: 'https://t.me/BitRon',
                  registry: 'https://bitron.cash/.well-known/bitcoin-cash-metadata-registry.json',
                  support: 'https://t.me/BitRon'
                }
              }
            }
          },
          license: 'CC0-1.0'
        }


export default defineComponent({
  name: 'FtCreate',
  setup () {
    const env = process.env.APP_ENV
    console.log(process.env)
    const user = useUserStore()
    const fungibleToken = {
      ownerAddress: user.connectedPaytacaAddress,
      name: '',
      tokenId: '',
      maxSupply : 10000000000000000, //arbitrary value
      bcmrUrl: 'https://bitron.cash/.well-known/bitcoin-cash-metadata-registry.json'
    }
    return { fungibleToken, env, user};
  },
  methods: {
    async createFtTokenGenesis() {
      let contentHash;
      // try {
      //   const response = await fetch(this.fungibleToken.bcmrUrl);
      //   console.log(response)
      //   const text = await response.text();
      //   contentHash = sha256.hash(utf8ToBin(text));
      // } catch(error) {
      //   console.log(error)
      //   return;
      // }
      contentHash = sha256.hash(utf8ToBin(JSON.stringify(bcmr)));

      if (this.fungibleToken.ownerAddress) {
        const WalletClass = getWalletClass()
        const wallet = await WalletClass.watchOnly(this.fungibleToken.ownerAddress)
        const nonceTx = (await wallet.getAddressUtxos()).filter(val => !val.token && val.vout === 0)[0];
        const { unsignedTransaction, sourceOutputs } = await wallet.tokenGenesis({
          // cashaddr: !,      // token UTXO recipient, if not specified will default to sender's address
          amount: this.fungibleToken.maxSupply,                      // fungible token amount
          // commitment: "abcd",             // NFT Commitment message
          // capability: NFTCapability.none, // NFT capability
          value: 1000,                    // Satoshi value
        },  [OpReturnData.fromArray([
          "BCMR",
          contentHash, // sha256 of the contents from the uri below
          this.fungibleToken.bcmrUrl.replace("https://", ""),
        ])], { buildUnsigned: true, utxoIds: [nonceTx] });

        // const tokenId = genesisResponse.tokenIds![0];
        // console.log(tokenId)
        const signingResult = await window.paytaca!.signTransaction({
          transaction: unsignedTransaction!,
          sourceOutputs: sourceOutputs!,
          broadcast: false,
          userPrompt: "Create Fungible Token"
        });

        if (signingResult == undefined) {
          return
        }
        try {
        const tx = await wallet.submitTransaction(hexToBin(signingResult.signedTransaction), true);
        console.log('TX:', tx)
        } catch (error) {
          console.log('Contract Creation Error: ', error)
          return
        }

      }
    }

  }
});
</script>
