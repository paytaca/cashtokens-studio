<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end"><q-btn flat color="negative" icon="close" v-close-popup></q-btn></div>
      <q-toolbar class="col-12 row ">
        <q-toolbar-title class="text-h5 row items-center">
          <span class="q-mx-sm" style="text-wrap:wrap">
            Deploy a Minting Contract for
            <q-avatar class="q-mx-sm" v-if="minter.tokenUris?.icon">
              <img :src="minter.tokenUris?.icon" alt="">
            </q-avatar>
          </span>
        </q-toolbar-title>
        <TokenCategory v-if="minter.token?.tokenId" :token-id="minter.token.tokenId" />
      </q-toolbar>
      <div class="q-mx-md text-justify q-mt-md q-mb-sm">
        <q-icon name="info" size="xs" color="secondary"></q-icon>
        <span>
          This operation will create a minting contract, that'll allow anybody with
          BCH to mint your NFT. Fill up the form below to setup your contract.
        </span>
      </div>
      <q-card-section class="q-gutter-sm">
        <q-form class="q-gutter-sm">
          <q-input v-model="form.mintPrice" label="Mint price" placeholder="How much it cost to mint your NFT"></q-input>
          <q-input v-model="form.collectionSize" label="Collection size"
            placeholder="The total number of NFTs in this collection"></q-input>
          <!-- <q-input v-model="form.threadCount" label="Number of threads"
            placeholder="You don't have to change this value"></q-input> -->
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => console.log('OK')" label="Deploy Contract" :busyLabel="minter.processing"
          color="primary" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { NFTCapability } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { CashToken } from 'src/app';
import { useUser } from 'src/stores/user'
import TokenCategory from 'src/components/TokenCategory.vue'
import BusyButton from 'src/components/BusyButton.vue'
import convertHexLEtoBigInt from 'src/app/utils/convertHexLEtoBigInt';
import { NftCollectionType } from 'src/app/types';
import { shortenTokenId } from 'src/app/utils';
import convertBigIntToHexLE from "src/app/utils/convertBigIntToHexLE"
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui';

const props = defineProps<{
  minter: CashToken,
}>()

const form = ref<{
  mintPrice: number | string,
  collectionSize: number | string,
  threadCount: number
}>({
  mintPrice: '',
  collectionSize: '',
  threadCount: 5
})

const emit = defineEmits<{
  (e: 'mintingContractDeployed', val: { tokenId: string, recipient: string, capability: NFTCapability, commitment: string }): void
}>()

const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const ui = useUI()

</script>
