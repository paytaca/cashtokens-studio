<template>
  <q-dialog v-close-popup @before-hide="() => { form.amount = ''; commitmentCopy = '' }" @before-show="beforeShow">
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">
          Transfer {{ nftMetadata?.name || nft?.tokenCategory?.symbol }}
        </q-toolbar-title>
        <TokenCategory v-if="nft.token?.tokenId" :token-id="nft.token.tokenId" />
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <q-form class="q-gutter-sm">
          <q-input :model-value="nft.token?.tokenId" label="Token ID/Category" filled dense disable stack-label></q-input>
          <q-input :model-value="nft.token?.capability" label="Token Capability" filled dense disable
            stack-label></q-input>
          <q-input :model-value="commitmentCopy" label="Token Commitment (read only)" filled dense stack-label
            :disable="Boolean(nft.processing)">
            <template v-slot:prepend>
              <q-btn :label="commitmentFormat === 'decimal' ? undefined : '0x'" flat dense size="sm" no-caps
                :icon-right="commitmentFormat === 'decimal' ? 'pin' : undefined" />
            </template>
            <template v-slot:append>
              <q-btn @click="convertCommitment" color="warning" dense :flat="$q.dark.isActive ? true : false"
                :class="$q.dark.isActive ? '' : 'text-black'"
                :label="commitmentFormat === 'decimal' ? 'To Raw Hex' : 'To Number'" no-caps>
                <q-tooltip>
                  {{
                    commitmentFormat === 'decimal' ? 'View raw hex value'
                    : 'Click to convert value to a number'
                  }}
                </q-tooltip>
              </q-btn>
            </template>
          </q-input>
          <q-input v-model="form.to" label="Recipient's Address*" filled dense :disable="Boolean(nft.processing)" />
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => transferNFT()" label="Transfer NFT" :busyLabel="nft.processing" color="primary"
          :disable="!form.to" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUser } from 'src/stores/user';
import BusyButton from 'src/components/BusyButton.vue'
import { CashToken } from 'src/app';
import TokenCategory from 'src/components/TokenCategory.vue'
import { useQuasar } from 'quasar';
import { useEventBus } from 'src/composables';
import { shortenAddress, shortenTokenId } from 'src/app/utils';
import { NftType } from 'src/app/bcmr/bcmr-v2.schema';
import { useUI } from 'src/stores/ui'
const props = defineProps<{
  decimals?: string,
  nft: CashToken
}>()
const { $ebus } = useEventBus()
const emit = defineEmits<{
  (e: 'nftTransferred', val: { tokenId: string, recipient: string }): void
}>()

const $q = useQuasar()
const ui = useUI()
const nftMetadata = ref<NftType>()
const commitmentCopy = ref<string>()
const commitmentFormat = ref<'decimal' | 'hex'>('hex')
const form = ref<{ to: string, amount: string | number }>({
  to: '',
  amount: ''
})

const convertCommitment = () => {
  if (commitmentCopy.value && commitmentFormat.value === 'decimal') {
    commitmentCopy.value = BigInt(commitmentCopy.value).toString(16)
    commitmentCopy.value = commitmentCopy.value.length < 2 ? commitmentCopy.value.padStart(2, '0') : commitmentCopy.value
    commitmentFormat.value = 'hex'
  } else if (commitmentCopy.value && commitmentFormat.value === 'hex') {
    commitmentCopy.value = parseInt(commitmentCopy.value, 16).toString()
    commitmentFormat.value = 'decimal'
  }
}


const transferNFT = async () => {
  if (props.nft?.token?.tokenId) {
    try {
      const tx = await props.nft.transferNFT({ newOwner: form.value.to })
      if (tx) {
        $q.notify({ type: 'positive', message: 'Success!Tx=' + tx })
        $ebus?.emit('transaction', {
          txid: tx,
          txType: 'CashToken.transferNFT',
          timestamp: new Date().getTime(),
          successMsg: `Transferred 1 ${props.nft?.tokenCategory?.symbol || shortenTokenId(props.nft?.token?.tokenId)} NFT commitment = ${commitmentCopy.value || '<empty>'} to ${shortenAddress(form.value.to)}`
        })
        emit('nftTransferred', { tokenId: props.nft.token.tokenId, recipient: form.value.to })
        ui.setStatusMessage({
          statusMessage: `Transferred 1 ${props.nft?.tokenCategory?.symbol || shortenTokenId(props.nft?.token?.tokenId)} NFT commitment = ${commitmentCopy.value || '<empty>'} to ${shortenAddress(form.value.to)}`,
          statusMessageType: 'success',
          statusMessageTxid: tx
        })
      }
    } catch (error: any) {
      console.log(error)
      ui.setStatusMessage({
        statusMessage: error.message,
        statusMessageType: 'error'
      })
      $q.notify({ type: 'negative', message: error.message })

    }
  }
}

const beforeShow = async () => {
  form.value.amount = props.nft?.token?.amount ? String(props.nft.token!.amount) : 0
  commitmentCopy.value = props.nft?.token?.commitment
  if (props.nft?.token?.tokenId && props.nft?.token?.commitment) {
    try {
      const resp = await fetch(`${process.env.BCMR_API}bcmr/${props.nft?.token?.tokenId}/token/nfts/${props.nft?.token?.commitment}`)
      nftMetadata.value = await resp.json()
    } catch (error) {
      console.log(error)
    }
  }

}


</script>
