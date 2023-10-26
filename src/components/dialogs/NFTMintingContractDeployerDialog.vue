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
        <q-form id="f-nmcdd" ref="mintFormRef" class="q-gutter-sm">
          <q-input v-model="form.mintPrice" label="Mint price" placeholder="How much it cost to mint your NFT?" filled>
            <template v-slot:prepend>
              <q-avatar size="sm">
                <q-img src="https://chipnet.imaginary.cash/img/logo/bch.svg"></q-img>
              </q-avatar>
            </template>
          </q-input>
          <q-input v-model="form.collectionSize" label="Collection size"
            placeholder="The total number of NFTs mintable in this collection" filled></q-input>
          <q-input ref="mintDateRef" v-model="form.mintDate" label="Go live on (Date)"
            placeholder="The date when the mint goes live on CashTokens Studio" type="date" :rules="[mintDateRules]"
            bottom-slots filled></q-input>
          <q-input ref="mintTimeRef" v-if="form.mintDate && !mintDateRef.hasError" v-model="form.mintTime"
            label="At (Time)" :rules="[mintTimeRules]" placeholder="The date when the mint goes live on CashTokens Studio"
            type="time" filled></q-input>
          <q-input ref="mintBannerMessageRef" v-if="form.mintDate && !mintDateRef.hasError"
            v-model="form.mintBannerMessage" label="Banner Message (optional)"
            :rules="[(v) => v.length <= 240 || '240 Characters Max']"
            placeholder="An optional custom message that'll be displayed on your token's minting dialog." filled
            bottom-slots>
          </q-input>
          <!-- <q-input v-model="form.threadCount" label="Number of threads"
            placeholder="You don't have to change this value"></q-input> -->
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="deployMintingContract" label="Deploy Contract" :busyLabel="multiThreadedMinter?.processing"
          color="primary" :disable="disableContractDeployment || Boolean(ctsBackend?.processing)" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { NFTCapability, Wallet } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { CashToken } from 'src/app';
import { useUser } from 'src/stores/user'
import TokenCategory from 'src/components/TokenCategory.vue'
import BusyButton from 'src/components/BusyButton.vue'
import { shortenTokenId } from 'src/app/utils';
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui';
import { MultiThreadedMinter } from 'src/app/mintingcontracts/MultiThreadedMinter';
import { CTSBackend } from 'src/app/CTSBackend';

const props = defineProps<{
  minter: CashToken, // A minting NFT on owner's token wallet address
}>()

const form = ref<{
  mintPrice: number | string,
  mintDate: number | string,
  mintTime: number | string,
  collectionSize: number | string,
  threadCount: number,
  mintBannerMessage: string
}>({
  mintPrice: '',
  mintDate: '',
  mintTime: '',
  mintBannerMessage: '',
  collectionSize: '',
  threadCount: 5,
})

const mintFormRef = ref()
const mintDateRef = ref()
const mintTimeRef = ref()
const mintBannerMessageRef = ref()
const disableContractDeployment = computed(() => {
  return !form.value.mintDate ||
    !form.value.mintTime ||
    !form.value.mintPrice ||
    !form.value.collectionSize ||
    !form.value.threadCount ||
    mintDateRef.value?.hasError ||
    mintDateRef.value?.hasError ||
    mintBannerMessageRef.value?.hasError ||
    Boolean(multiThreadedMinter.value?.processing) ||
    Boolean(ctsBackend.value?.processing)
})

const emit = defineEmits<{
  (e: 'mintingContractDeployed', val: { tokenId: string, recipient: string, capability: NFTCapability, commitment: string }): void
}>()

const { $ebus } = useEventBus()
const $q = useQuasar()
const user = useUser()
const ui = useUI()
const multiThreadedMinter = ref<MultiThreadedMinter>()
const ctsBackend = ref<CTSBackend>()

const getMintingDateTime = (mintTime: string) => {
  const mintDateTime = new Date(form.value.mintDate)
  const [hour, minutes] = mintTime.toString().split(':')
  mintDateTime.setHours(Number(hour))
  mintDateTime.setMinutes(Number(minutes))
  return mintDateTime
}

const mintDateRules = (v: any) => {
  const currentDate = new Date()
  const cm = currentDate.getMonth() + 1
  const cd = currentDate.getDate()
  const cy = currentDate.getFullYear()
  return new Date(v) >= new Date(`${cy}-${cm}-${cd}`)
}

const mintTimeRules = (v: any) => {
  const mintDateTime = getMintingDateTime(v)
  if (mintDateTime > new Date()) {
    return true
  }
  return 'Value should be later than current date and time'
}

const deployMintingContract = async () => {
  const mintPriceSat = Math.floor(Number(form.value.mintPrice) * 1e8)
  multiThreadedMinter.value = new MultiThreadedMinter({
    parentMinter: props.minter.utxo,
    mintPrice: mintPriceSat,
    nftCollectionSize: Number(form.value.collectionSize),
    numberOfThreads: 5,
    network: user.wallet!.network,
    ownerWallet: user.wallet as Wallet
  })
  // window.m = multiThreadedMinter.value
  try {
    const tx = await multiThreadedMinter.value.createThreads()
    if (tx) {

      ctsBackend.value = new CTSBackend()
      const pubRes = await ctsBackend.value.publishNFTProject({
        tokenId: props.minter.token!.tokenId!,
        mintingContractName: MultiThreadedMinter.name,
        // convert bigint to string so it 
        // can be added to a JSON payload
        mintingContractParams: multiThreadedMinter.value.contractScriptParams.map((p: any) => typeof (p) === 'bigint' ? p.toString() : p),
        mintingContractScript: multiThreadedMinter.value.contractScript,
        mintingPrice: mintPriceSat,
        mintingDate: getMintingDateTime(form.value.mintTime.toString()),
        mintingBannerMessage: form.value.mintBannerMessage,
        collectionSize: multiThreadedMinter.value.nftCollectionSize,
        publisherAddress: user.wallet!.getTokenDepositAddress(),
        publishedOn: new Date().getTime(),
        network: user.wallet!.network
      })
      console.log(pubRes)

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
    $q.notify({ type: 'negative', message: error.message })
  }
}

const disableInputs = (disable: boolean) => {
  if (disable) {
    document.querySelectorAll('#f-nmcdd input').forEach((e: any) => e.disabled = true)
  } else {
    document.querySelectorAll('#f-nmcdd input').forEach((e: any) => e.disabled = '')
  }
}

watch(() => multiThreadedMinter.value?.processing, (v) => {
  disableInputs(Boolean(v))
})

watch(() => ctsBackend.value?.processing, (v) => {
  disableInputs(Boolean(v))
})

onMounted(() => {
  ui.clearStatusMessage()
})

</script>
