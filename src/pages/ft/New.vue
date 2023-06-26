<template>
  <q-page class="q-pa-md q-ma-sm" style="min-height: 100vh">
    <div>
      <q-tabs
        v-model="tab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
      >
        <q-tab name="token" label="Token" />
        <q-tab name="bcmr" label="BCMR" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="token">
          <div class="text-h5 q-mb-md">Create New Fungible Token</div>
          <div class="row justify-evenly">
            <div class="col-8">
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
                      <q-btn color="primary" @click.stop="createFT">Create Token Genesis</q-btn>
                    </div>  
                  </div>
                </div>
              </q-form>
            </div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="bcmr">
          <div class="text-h5 q-mb-md">BCMR</div>
          <JsonEditor v-model="bcmr"/>
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </q-page>
</template>

<script lang="ts">
import getWalletClass from 'utils/getWalletClass';
import { useUserStore } from 'src/stores/user';
import { hexToBin, OpReturnData } from 'mainnet-js'
import { sha256, utf8ToBin } from '@bitauth/libauth';
import { ref, defineComponent, reactive } from 'vue'
import JsonEditor from 'vue3-ts-jsoneditor'
import bcmrTemplate from 'resources/bcmr'
import { uid } from 'quasar';
import { useUIStore } from 'src/stores/ui';

export default defineComponent({
  name: 'FtNew',
  components: {JsonEditor},
  data(){
    return {
      bcmr: {},
      fungibleToken: {
        ownerAddress: '',
        name: '',
        symbol: '',
        tokenId: '',
        maxSupply : 0, //arbitrary value
        bcmrUrl: ''
      }
    }
  },
  setup () {
    const env = process.env.APP_ENV
    const user = useUserStore()
    return {
      env,
      user,
      tab: ref('token'),
      innerTab: ref('innerFT'),
      splitterModel: ref(20)
    }
  },
  mounted(){
    const user = useUserStore()
    this.fungibleToken = {
      ownerAddress: user.connectedPaytacaAddress,
      name: '',
      symbol: '',
      tokenId: '',
      maxSupply : Number('10000000000000000'), //arbitrary value
      bcmrUrl: bcmrTemplate.registryIdentity.uris.registry
    }
    this.bcmr = Object.assign({}, bcmrTemplate)
  },
  watch: {
    'user.connectedPaytacaAddress'(newPaytacaAddress){
      this.fungibleToken.ownerAddress = newPaytacaAddress
    },
    'fungibleToken.name'(newName, oldName){
      console.log(newName)
      console.log(oldName)
    },
    bcmr: {
      handler(updatedBcmr){
        console.log(updatedBcmr)
      },
      deep: true
    }
  },
  methods: {
    async createFT() {
      const ui = useUIStore()
      ui.busy({text: 'Creating FT', type: 'info'})
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
      contentHash = sha256.hash(utf8ToBin(JSON.stringify(this.bcmr)));

      if (this.fungibleToken.ownerAddress) {
        const WalletClass = getWalletClass()
        const wallet = await WalletClass.watchOnly(this.fungibleToken.ownerAddress)
        const nonceTx = (await wallet.getAddressUtxos()).filter((val: any) => !val.token && val.vout === 0)[0];
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
          ui.idle()
          return
        }
        try {
          const tx = await wallet.submitTransaction(hexToBin(signingResult.signedTransaction), true);
          ui.isBusy = false
          ui.message.text = 'Success! ' + tx
          ui.message.type = 'success'
        } catch (error) {
          console.log('Contract Creation Error: ', error)
          return
        } finally {
          // ui.idle()
        }
        
      }
    }

  }
})
</script>
