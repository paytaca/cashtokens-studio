<template>
  <q-form class="col-xs-12 col-sm-10 col-md-8 q-gutter-sm q-my-sm">
    <q-toolbar>
      <q-toolbar-title>Create Token</q-toolbar-title>
    </q-toolbar>
    <q-input :model-value="owner" label="Owner" :filled="true" disable dense square />
    <q-select v-if="action === 'genesis'" class="overflow-hidden ellipsis" :filled="true" bottom-slots
      v-model="tokenIdSelected" :options="tokenIdOptions" label="Token ID" dense square hide-bottom-space>
      <template v-slot:loading>
        <q-spinner-facebook size="sm" color="primary" />
      </template>
    </q-select>
    <template v-else>
      <q-input v-model="tokenId" label="Token ID" :filled="true" dense square />
    </template>
    <template v-if="tokenId">
      <q-input v-model="tokenAmount" label="Amount" :filled="true" dense square />
      <!-- <q-select :filled="true" bottom-slots v-model="storeFtGenesisSupplyIn" :options="ftGenesisSupplyStoreOpts"
        label="Store FT Genesis Supply In" dense square hide-bottom-space>
        <template v-slot:option="scope">
          <q-item v-bind="scope.itemProps">
            {{ scope.opt.label }}
          </q-item>
        </template>
      </q-select>
      <div class="row cursor-pointer">
        What's this?<q-icon name="arrow_outward"></q-icon>
        <q-tooltip v-if="storeFtGenesisSupplyIn.value === 'authchain'">
          Amount will be stored as FT reserve in the
          authchain. Recommended for continued issuance.
        </q-tooltip>
        <q-tooltip v-if="storeFtGenesisSupplyIn.value === 'minting-baton-covenant'">
          Amount will be stored as FT reserve in a
          Minting Baton Covenant. Alternative for continued issuance.
        </q-tooltip>
        <q-tooltip v-if="storeFtGenesisSupplyIn.value === 'creator-address'">
          Entire amount will be transferred to the creator's address
        </q-tooltip>
      </div> -->
      <div class="row items-center">
        <q-checkbox :filled="true" dark:color="lime" v-model="publishRegistry" size="xs" label="Publish BCMR">
        </q-checkbox>
        <q-btn size="xs" color="info" icon="help" flat round>
          <q-tooltip>Include a BCMR publication output</q-tooltip>
        </q-btn>
      </div>
      <template v-if="publishRegistry">
        <div v-if="tokenRegistry" class="row q-pa-sm" style="border-style: solid; border-width: 1px; border-radius: 5px;">
          <q-input class="col-12 q-mt-sm" :filled="true" v-model="tokenRegistry.url" type="url"
            :rules="[v => v.length > 7 || 'Invalid URL']" label="The BCMR's URL" dense square standout
            hide-bottom-space></q-input>
          <div class="col-12 row items-top q-col-gutter-none q-my-md">
            <div class="col-xs-12">
              <q-input :filled="true" v-model="tokenRegistry.contentHash" :loading="isLoadingRegistry" type="url"
                label="The BCMR's content hash" dense square>
                <template v-slot:loading>
                  <q-spinner-facebook color="primary" />
                </template>
              </q-input>
            </div>
            <div v-if="tokenRegistry.url" class="col-xs-12">
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
import { useQuasar } from 'quasar'
import { watch, onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { TokenAction } from 'src/types'
import FungibleTokenModel from 'src/models/FungibleToken'
import fetchBcmrContentHash from 'src/bcmr/fetchBcmrContentHash';
import constants from 'src/constants'
import { useUser } from 'src/stores/user'
import { UtxoI } from 'mainnet-js'
import { RegistryPublicationInput } from 'src/models/interfaces'
import { Utxo } from 'cashscript'
import AuthNFT from 'src/models/AuthNFT'
defineOptions({ name: 'FungibleToken' })
const $q = useQuasar()
const user = useUser()
const route = useRoute()
const tokenId = ref<string>()
const tokenAmount = ref<string>(constants.MAX_FUNGIBLE_AMOUNT)
const tokenRegistry = ref<RegistryPublicationInput>()
const authNFTUtxoTxid = ref<string>()
const props = defineProps<{ owner?: string, action?: TokenAction, genesisTokenIdOptions?: UtxoI[], genesisAuthNftOptions?: UtxoI[] }>()
// const token = ref<{ amount: string, tokenId: string }>({ amount: '', tokenId: '' })
const token = ref<FungibleTokenModel>(new FungibleTokenModel({}))

const tokenIdOptions = computed<{ value: string, label: string }[]>(()=>
  props.genesisTokenIdOptions?.map((u: UtxoI) => ({ value: u.txid, label: u.txid.replace(u.txid.substring(8, 48), '...') })) || []
)
const tokenIdSelected = ref<{ value: string, label: string }>()
const authNFTOptions = ref<{ value: string, label: string }[]>(
  props.genesisAuthNftOptions?.map((u: UtxoI) => ({ value: u.txid, label: u.txid.replace(u.txid.substring(8, 48), '...') })) || []
)
const authNftSelected = ref<{ value: string, label: string }>()
/**
 * How the token amount (FT genesis supply) will be stored
 */
// const storeFtGenesisSupplyIn = ref<{ value: 'authchain' | 'minting-baton-covenant' | 'creator-address', label: string }>({ value: 'authchain', label: 'Authchain (BCMR Recommendation)' })
// const ftGenesisSupplyStoreOpts = [
//   { value: 'authchain', label: 'Authchain (BCMR Recommendation)' },
//   { value: 'minting-baton-covenant', label: 'Minting Baton Covenant' },
//   { value: 'creator-address', label: 'Creator\'s Address' },
// ]

const publishRegistry = ref<boolean>(false)
const isLoadingRegistry = ref<boolean>()

watch(() => publishRegistry.value, (yes) => {
  if (yes) {
    token.value.registry = { url: '', contentHash: '' }
  } else {
    delete token.value.registry
  }
})
watch(() => token.value.message, (msg) => {
  if (msg && msg.type === 'success') {
    $q.notify({ color: 'positive', message: msg.text, timeout: 5000 })
  }
})
watch(() => tokenIdSelected.value, (v) => {
  tokenId.value = v?.value
})
onMounted(() => {
  token.value.ownerWallet = user.wallet
})

const createGenesis = async () => {
  token.value.utxo = props.genesisTokenIdOptions?.filter((u: UtxoI) => u.txid == tokenId.value)[0]
  const authNFTUtxo = props.genesisAuthNftOptions?.filter((u: UtxoI) => u.txid == authNFTUtxoTxid.value)[0]
  if (authNFTUtxo) {
    token.value.authNFT = new AuthNFT({
      utxo: authNFTUtxo
    })
  }
  token.value.ownerWallet = user.wallet
  console.log(token.value.utxo)
  try {
    await token.value.createGenesis()
  } catch (error:any) {
    $q.notify({type:'negative', message: error?.message})
  }

}

const loadRegistryHashFromUrl = () => {
  isLoadingRegistry.value = true
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
        isLoadingRegistry.value = false
      })
  }

}



</script>
