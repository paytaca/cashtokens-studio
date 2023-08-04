<template>
  <q-form class="col-xs-12 col-sm-10 col-md-8 q-gutter-sm q-my-sm">
    <q-toolbar>
      <q-toolbar-title>Create Token</q-toolbar-title>
    </q-toolbar>
    <q-input :model-value="owner || user.wallet.getTokenDepositAddress()" label="Owner" :filled="true" disable dense square />
    <q-input :model-value="authNft?.utxo?.token?.tokenId" label="AuthNFT Token ID" :filled="true" disable dense square />
    <q-select class="overflow-hidden ellipsis" :filled="true" bottom-slots
      v-model="form.tokenIdSelected" :options="tokenIdSelections" label="Token ID" dense square hide-bottom-space :disable="tokenIdSelections.length === 0">
      <template v-slot:loading>
        <q-spinner-facebook size="sm" color="primary" />
      </template>
    </q-select>
    <template v-if="form.tokenIdSelected">
      <q-input v-model="form.tokenAmount" label="Amount" :filled="true" dense square />
      <div class="row items-center">
        <q-checkbox :filled="true" dark:color="lime" v-model="form.publishRegistry" size="xs" label="Publish BCMR">
        </q-checkbox>
        <q-btn size="xs" color="info" icon="help" flat round>
          <q-tooltip>Include a BCMR publication output</q-tooltip>
        </q-btn>
      </div>
      <template v-if="form.publishRegistry">
        <div class="row q-pa-sm" style="border-style: solid; border-width: 1px; border-radius: 5px;">
          <q-input class="col-12 q-mt-sm" :filled="true" v-model="form.tokenRegistry.url" type="url"
            label="The BCMR's URL" dense square standout
            hide-bottom-space></q-input>
          <div class="col-12 row items-top q-col-gutter-none q-my-md">
            <div class="col-xs-12">
              <q-input :filled="true" v-model="form.tokenRegistry.contentHash" :loading="form.isLoadingRegistry" type="url"
                label="The BCMR's content hash" dense square>
                <template v-slot:loading>
                  <q-spinner-facebook color="primary" />
                </template>
              </q-input>
            </div>
            <div v-if="form.tokenRegistry.url" class="col-xs-12">
              <q-btn color="primary" size="sm" icon="cloud_download" label="Download content and load hash" no-caps flat
                dense @click="loadRegistryHashFromUrl"></q-btn>
            </div>
          </div>
        </div>
      </template>
      <div class="row justify-end q-my-lg">
        <template v-if="token.processing">
          <q-btn disable>
            <q-spinner :thickness="10" color="primary" size="sm" /> {{ token.processing }}
          </q-btn>
        </template>
        <template v-else>
          <q-btn v-if="action === 'genesis'" @click="createGenesis">Create Token</q-btn>
        </template>
      </div>
    </template>
  </q-form>
</template>
<script setup lang="ts">
import { UtxoI} from 'mainnet-js'
import { useQuasar } from 'quasar'
import { watch, onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { TokenAction } from 'src/types'
import { Utxo } from 'cashscript'

import { useUser } from 'src/stores/user'
import { RegistryPublicationInput } from 'src/models/interfaces'
import fetchBcmrContentHash from 'src/bcmr/fetchBcmrContentHash';
import AuthNFT from 'src/models/AuthNFT'
import TokenCategory from 'src/components/TokenCategory.vue'
import FungibleTokenModel from 'src/models/FungibleToken'
import constants from 'src/constants'

const props = defineProps<{
  owner?:string,
  action:{ type: string, default: 'genesis'},
  authNft?:AuthNFT,
  tokenIdOptions?: UtxoI[]
  // authNftOptions?: AuthNFT[]
}>()
const $q = useQuasar()
const user = useUser()

const form = ref<{
  useAuthGuard: true /*Future proofing, we might allow creation without AuthGuard*/,
  tokenIdSelected: { value: string, label: string },
  tokenAmount:string,
  tokenRegistry: {
    url: string,
    contentHash: string
  },
  publishRegistry: boolean,
  isLoadingRegistry: boolean
}>({publishRegistry: false, tokenRegistry: {url:'', contentHash:''}})

/**
 * Token to be created, values will be updated depending on the value of the form on write mode
 */
const token = ref<FungibleTokenModel>(
  new FungibleTokenModel({
    authNFT: props.authNFT,
    ownerWallet: user.wallet
  })
)

const tokenIdSelections = computed<{ value: string, label: string }[]>(()=>
  props.tokenIdOptions?.map((u: UtxoI) => ({ value: u.txid, label: u.txid.replace(u.txid.substring(8, 48), '...') })) || []
)

watch(() => token.value.message, (msg) => {
  if (msg && msg.type === 'success') {
    $q.notify({ color: 'positive', message: msg.text, timeout: 5000 })
  }
})

onMounted(() => {
  if (tokenIdSelections.value) {
    form.value.tokenIdSelected = tokenIdSelections.value[0]
  }
})

const createGenesis = async () => {
  if (!props.authNft?.utxo?.token?.tokenId && form.value.useAuthGuard) {
    $q.nofity({type: 'negative', message: 'Missing AuthNFT!'})
    return
  }
  if (!form.value.tokenIdSelected.value) {
    $q.nofity({type: 'negative', message: 'Token ID required!'})
    return
  }
  token.value.utxo = props.tokenIdOptions?.filter((u: UtxoI) => u.txid == form.value.tokenIdSelected.value)[0]
  token.value.authNFT = props.authNft
  try {
    await token.value.createGenesis({genesisSupplyAmount: form.value.tokenAmount})
  } catch (error:any) {
    $q.notify({type:'negative', message: error?.message})
  }

}

const loadRegistryHashFromUrl = () => {
  form.value.isLoadingRegistry.value = true
  if (token.value.registry?.contentHash) {
    const endNotif = $q.notify({ spinner: true, message: 'Checking hash of URL\'s content', type: 'info' })
    fetchBcmrContentHash(token.value.registry.url)
      .then((v) => {
        if (token.value.registry) {
          token.value.registry.contentHash = v || ''
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        endNotif()
        form.value.isLoadingRegistry.value = false
      })
  }

}

</script>
