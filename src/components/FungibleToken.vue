<template>
  <q-form class="col-xs-12 col-sm-10 col-md-8 q-gutter-sm q-my-sm">
    <q-toolbar>
      <q-toolbar-title>Create Token</q-toolbar-title>
    </q-toolbar>
    <q-input :model-value="owner" label="Owner" :filled="true" disable dense square />
    <q-select v-if="action === 'genesis'" class="overflow-hidden ellipsis" :filled="true" bottom-slots
      v-model="tokenIdSelected" :options="tokenIdOptions" label="Token ID" dense square hide-bottom-space
      @update:model-value="tokenIdSelectedChanged">
      <template v-slot:loading>
        <q-spinner-facebook size="sm" color="primary" />
      </template>
    </q-select>
    <q-input v-else v-model="token.tokenId" label="Token ID" :filled="true" dense square />
    <template v-if="token.tokenId">
      <q-input v-model="token.amount" label="Amount" :filled="true" dense square />
      <q-select :filled="true" bottom-slots v-model="storeFtGenesisSupplyIn" :options="ftGenesisSupplyStoreOpts"
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
      </div>
      <div class="row items-center">
        <q-checkbox :filled="true" dark:color="lime" v-model="publishRegistry" size="xs" label="Publish BCMR">
        </q-checkbox>
        <q-btn size="xs" color="info" icon="help" flat round>
          <q-tooltip>Include a BCMR publication output</q-tooltip>
        </q-btn>
      </div>
      <template v-if="publishRegistry">
        <div v-if="token.registry" class="row q-pa-sm"
          style="border-style: solid; border-width: 1px; border-radius: 5px;">
          <q-input class="col-12 q-mt-sm" :filled="true" v-model="token.registry.url" type="url"
            :rules="[v => v.length > 7 || 'Invalid URL']" label="The BCMR's URL" dense square standout
            hide-bottom-space></q-input>
          <div class="col-12 row items-top q-col-gutter-none q-my-md">
            <div class="col-xs-12">
              <q-input :filled="true" v-model="token.registry.contentHash" :loading="isLoadingRegistry" type="url"
                label="The BCMR's content hash" dense square>
                <template v-slot:loading>
                  <q-spinner-facebook color="primary" />
                </template>
              </q-input>
            </div>
            <div v-if="token.registry.url" class="col-xs-12">
              <q-btn color="primary" size="sm" icon="cloud_download" label="Download content and load hash" no-caps flat
                dense @click="loadRegistryHashFromUrl"></q-btn>
            </div>
          </div>
        </div>
      </template>

      <div class="row justify-end q-my-lg">
        <q-btn v-if="action === 'genesis'"
          @click="token.createGenesis({ storeAmountIn: storeFtGenesisSupplyIn.value })">Create Token</q-btn>
      </div>
    </template>
  </q-form>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { watch, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { TokenAction } from 'src/types'
import FungibleToken from 'src/models/FungibleToken'
import fetchBcmrContentHash from 'src/bcmr/fetchBcmrContentHash';
import constants from 'src/constants'
import { useUser } from 'src/stores/user'
defineOptions({ name: 'FungibleToken' })
const $q = useQuasar()
const user = useUser()
const route = useRoute()
const props = defineProps<{ owner?: string, action?: TokenAction, genesisTokenIdOptions?: string[] }>()
// const token = ref<{ amount: string, tokenId: string }>({ amount: '', tokenId: '' })
const token = ref<FungibleToken>(new FungibleToken({
  tokenId: props.genesisTokenIdOptions && props.genesisTokenIdOptions[0] || '',
  amount: constants.MAX_FUNGIBLE_AMOUNT
}))

const tokenIdOptions = ref<{ value: string, label: string }[]>()
const tokenIdSelected = ref<{ value: string, label: string }>()
/**
 * How the token amount (FT genesis supply) will be stored
 */
const storeFtGenesisSupplyIn = ref<{ value: 'authchain' | 'minting-baton-covenant' | 'creator-address', label: string }>({ value: 'authchain', label: 'Authchain (BCMR Recommendation)' })
const ftGenesisSupplyStoreOpts = [
  { value: 'authchain', label: 'Authchain (BCMR Recommendation)' },
  { value: 'minting-baton-covenant', label: 'Minting Baton Covenant' },
  { value: 'creator-address', label: 'Creator\'s Address' },
]

const publishRegistry = ref<boolean>(false)
const isLoadingRegistry = ref<boolean>()

watch(() => publishRegistry.value, (yes) => {
  if (yes) {
    token.value.registry = { url: '', contentHash: '' }
  } else {
    delete token.value.registry
  }
})
onMounted(() => {
  if (props.action === 'genesis') {
    tokenIdOptions.value = props.genesisTokenIdOptions?.map(txid => ({ value: txid, label: txid.replace(txid.substring(8, 48), '...') }))
  }
  token.value.ownerWallet = user.wallet
})

const tokenIdSelectedChanged = (p: { value: string, label: string }) => {
  token.value.tokenId = p.value
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
