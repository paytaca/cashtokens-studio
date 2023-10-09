<template>
  <q-dialog>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 row items-center">
          <span class="q-mx-sm">Issue</span>
          <span class="q-mx-sm text-bold">{{ authchainIdentity.tokenCategory?.symbol ?
            authchainIdentity.tokenCategory.symbol : 'FT' }}</span>
          <q-avatar class="q-mx-sm" v-if="authchainIdentity.tokenUris?.icon">
            <img :src="authchainIdentity.tokenUris?.icon" alt="">
          </q-avatar>
        </q-toolbar-title>
        <TokenCategory v-if="authchainIdentity.token?.tokenId" :token-id="authchainIdentity.token.tokenId" />
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <q-form class="q-gutter-sm">
          <q-input :model-value="authchainIdentity.tokenCategory?.decimals || 0" label="Decimals (Metadata)" borderless
            filled dense disable>
            <template v-slot:append>
              <q-icon v-if="authchainIdentity.tokenCategory?.decimals === undefined" name="warning" color="warning"
                size="sm" flat dense>
                <q-tooltip>
                  Registry not found. Unable to determine value. If you already uploaded the registry, the indexer might
                  just not have picked it
                  up yet, you may try to refresh the page
                </q-tooltip>
              </q-icon>
            </template>
          </q-input>
          <q-input :model-value="currentFtReservesDecimal" label="Current reserve supply (decimal)" filled borderless
            dense disable bottom-slots>
            <template v-slot:hint>
              <!-- IMPORTANT TODO: change formAmount to BigInt once mainnet-js supports bigint -->
              <div class="row justify-end text-italic">{{ currentFtReserves }} (Raw FT Amount)</div>
            </template>
          </q-input>

          <q-input v-if="form.amount && Number(form.amount) > 0" :model-value="newReserveSupplyDecimal"
            label="New reserve supply (decimal)" filled dense disable bottom-slots>
            <template v-slot:hint>
              <!-- IMPORTANT TODO: change formAmount to BigInt once mainnet-js supports bigint -->
              <div class="row justify-end text-italic">{{ String(BigInt(currentFtReserves) -
                BigInt(form.tokeshiAmount ||
                  form.amount)) }} (Raw FT Amount)</div>
            </template>
          </q-input>
          <q-input v-model="form.recipient" label="Recipient's Token Address" filled dense>
            <template v-slot:append>
              <q-btn color="warning" :flat="$q.dark.isActive ? true : false" :class="$q.dark.isActive ? '' : 'text-black'"
                @click="form.recipient = user.walletTokenAddress!" label="Self" dense />
            </template>
          </q-input>
          <q-input ref="tokenAmountInputRef" v-model="form.amount" label="Enter Token amount in decimal"
            @update:model-value="() => form.tokeshiAmount = numberToTokeshi(Number(form.amount), String(authchainIdentity.tokenCategory?.decimals))"
            filled dense bottom-slots :rules="[(v) => BigInt(v) <= BigInt(currentFtReserves) || 'Amount exceeds supply']">
            <template v-slot:hint>
              <div v-if="!authchainIdentity.tokenCategory?.decimals && form.amount.includes('.')"
                class="row justify-end text-italic q-mb-sm">
                <q-icon name="warning" color="warning" /> Token has 0 or no decimal metadata. Value after decimal point
                will be
                ignored.
              </div>
              <!-- IMPORTANT TODO: change formAmount to BigInt once mainnet-js supports bigint -->
              <div v-if="form.amount <= currentFtReserves"
                class="row justify-end text-italic text-lg items-center text-caption q-gutter-sm">
                <span>Token amount </span>
                <span class="text-weight-bold text-green-6">{{
                  form.tokeshiAmount || 0
                }}</span>
                <span>(Raw FT Amount)</span>
              </div>
            </template>
          </q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end q-my-lg">
        <BusyButton @click="() => releaseTokensFromReserveSupply()" :busyLabel="authchainIdentity.processing"
          label="Issue Tokens" color="primary q-mt-lg" size="lg"
          :disable="Boolean(authchainIdentity.processing) || tokenAmountInputRef?.hasError" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">

import { QInput, useQuasar } from 'quasar';
import { AuthchainIdentity } from 'src/app'
import { ref, computed } from 'vue';
import { useUser } from 'src/stores/user'
import { numberToTokeshi, shortenAddress, tokeshiToNumber } from 'src/app/utils'
import TokenCategory from 'src/components/TokenCategory.vue'
import BusyButton from 'src/components/BusyButton.vue'
import shortenTokenId from 'src/app/utils/shortenTokenId';
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui'

const emit = defineEmits<{
  (e: 'tokensIssued', val: { tokenId: string, to: string, amount: string }): void
}>()

const ui = useUI()

const props = defineProps<{
  authchainIdentity: AuthchainIdentity,
  /**
   * Optional, If this dialog was used to show 
   * a particular authchainIdentity from a list or table, 
   * the trigger can  pass the index of the authchainIdentity from that table. 
   * Particularly helpful so we can pass this data when emitting event.
   */
  authchainIdentityIndex?: number
}>()
const $q = useQuasar()
const { $ebus } = useEventBus()
const user = useUser()
const form = ref<{ recipient: string, amount: string, tokeshiAmount?: string }>({
  recipient: '',
  amount: '0',
})


const currentFtReserves = computed(() => Number(props.authchainIdentity.token!.amount).toString())
const currentFtReservesDecimal = computed(() => tokeshiToNumber(Number(currentFtReserves.value), props.authchainIdentity.tokenCategory?.decimals?.toString()))
const newReserveSupplyDecimal = computed(() => {
  let v = currentFtReservesDecimal.value - Number(form.value.amount)
  if (!props.authchainIdentity.tokenCategory?.decimals) {
    v = Math.floor(v)
  }
  return v
})

const tokenAmountInputRef = ref<QInput | null>(null)

const releaseTokensFromReserveSupply = async () => {
  if (!form.value || !form.value.recipient || Number(form.value.amount) <= 0) {
    return $q.notify({ type: 'negative', message: 'Error!Amount and recipient required!' })
  }

  try {
    const amountToSend = form.value.tokeshiAmount ? form.value.tokeshiAmount : form.value.amount
    console.log('Amount to send', amountToSend)
    const tx = await props.authchainIdentity.releaseTokensFromReserveSupply({ to: form.value.recipient, amount: amountToSend })
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!Tx=' + shortenTokenId(tx) })
      emit('tokensIssued', {
        tokenId: props.authchainIdentity.token!.tokenId, to: form.value.recipient, amount: form.value.amount
      })
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'AuthchainIdentity.releaseTokensFromReserveSupply',
        timestamp: new Date().getTime(),
        successMsg: `Issued ${String(amountToSend)} ${props.authchainIdentity.tokenCategory?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)} FT to ${shortenAddress(form.value.recipient)}`
      })
      ui.setStatusMessage({
        statusMessage: `Issued ${String(amountToSend)} ${props.authchainIdentity.tokenCategory?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)} FT to ${shortenAddress(form.value.recipient)}`,
        statusMessageType: 'success',
        statusMessageTxid: tx
      })
    }
  } catch (error: any) {

    ui.setStatusMessage({
      statusMessage: error.message,
      statusMessageType: 'error'
    })
    return $q.notify({ type: 'negative', message: error.message })
  }

}
</script>
