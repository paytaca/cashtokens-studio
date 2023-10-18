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
          <q-input v-model="form.mintPrice" label="Mint price" placeholder="How much it cost to mint your NFT?">
            <template v-slot:prepend>
              <q-avatar size="sm">
                <q-img src="https://chipnet.imaginary.cash/img/logo/bch.svg"></q-img>
              </q-avatar>
            </template>
          </q-input>
          <q-input v-model="form.collectionSize" label="Collection size"
            placeholder="The total number of NFTs mintable in this collection"></q-input>
          <!-- <q-input v-model="form.threadCount" label="Number of threads"
            placeholder="You don't have to change this value"></q-input> -->
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="deployMintingContract" label="Deploy Contract" :busyLabel="multiThreadedMinter?.processing"
          color="primary" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { NFTCapability, Wallet } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { CashToken, ProcessingMessage } from 'src/app';
import { useUser } from 'src/stores/user'
import TokenCategory from 'src/components/TokenCategory.vue'
import BusyButton from 'src/components/BusyButton.vue'
import convertHexLEtoBigInt from 'src/app/utils/convertHexLEtoBigInt';
import { NftCollectionType } from 'src/app/types';
import { shortenAddress, shortenTokenId } from 'src/app/utils';
import convertBigIntToHexLE from "src/app/utils/convertBigIntToHexLE"
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui';
import { MultiThreadedMinter } from 'src/app/mintingcontracts/MultiThreadedMinter';
import { ProcessingMessageHandler } from 'src/app'

const props = defineProps<{
  minter: CashToken, // this is actually the authchain
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

const { $ebus } = useEventBus()
const $q = useQuasar()
const user = useUser()
const ui = useUI()
const multiThreadedMinter = ref<MultiThreadedMinter>()
const deployMintingContract = async () => {
  const mintPriceSat = Number(form.value.mintPrice) * 1e8
  multiThreadedMinter.value = new MultiThreadedMinter({
    parentMinter: props.minter.utxo,
    mintPrice: mintPriceSat,
    nftCollectionSize: Number(form.value.collectionSize),
    numberOfThreads: 5,
    network: user.wallet!.network,
    ownerWallet: user.wallet as Wallet
  })
  window.m = multiThreadedMinter.value
  try {
    const tx = await multiThreadedMinter.value.createThreads()
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!Tx=' + shortenTokenId(tx) })

      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'MultiThreadedMinter.createThreads',
        timestamp: new Date().getTime(),
        successMsg: `Created ${form.value.threadCount} NFTs (threads)`
      })
      ui.setStatusMessage({
        statusMessage: `Created ${form.value.threadCount} NFTs (threads)`,
        statusMessageType: 'success',
        statusMessageTxid: tx
      })

    }
  } catch (error: any) {
    ui.setStatusMessage({
      statusMessage: error,
      statusMessageType: 'error'
    })
    return $q.notify({ type: 'negative', message: error.message })
  }

}

onMounted(() => {
  ui.clearStatusMessage()
})

</script>
