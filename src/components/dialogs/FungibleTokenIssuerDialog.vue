<template>
  <q-dialog>
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end"><q-btn flat color="negative" icon="close" v-close-popup></q-btn></div>
      <q-toolbar>
        <q-toolbar-title class="text-h5 row items-center">
          <q-avatar class="q-mx-sm" v-if="authchainIdentity.tokenUris?.icon">
            <img :src="authchainIdentity.tokenUris?.icon" alt="">
          </q-avatar>
          <span class="q-mx-sm text-bold">{{ authchainIdentity.tokenCategory?.symbol ?
            authchainIdentity.tokenCategory.symbol : 'FT' }}</span>
          <span v-if="authchainIdentity.tokenCategory?.decimals === undefined">
            <q-icon name="warning" color="warning" size="sm" flat dense>
              <q-tooltip>
                Registry not found. Unable to determine symbol and decimals value. If you already uploaded the registry,
                the indexer might
                just not have picked it
                up yet, you may try to refresh the page
              </q-tooltip>
            </q-icon>
          </span>
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
              <div class="row justify-end text-italic">{{ BigInt(currentFtReserves) -
                BigInt(amountToSendRaw) }} (Raw FT Amount)</div>
            </template>
          </q-input>

          <q-input v-model="form.recipient" label="Recipient's Token Address" filled dense
            :disable="Boolean(authchainIdentity.processing)">
            <template v-slot:append>
              <q-btn color="warning" :flat="$q.dark.isActive ? true : false" :class="$q.dark.isActive ? '' : 'text-black'"
                @click="form.recipient = user.walletTokenAddress!" label="Self" dense />
            </template>
          </q-input>
          <!-- @update:model-value="() => amountToSendRaw = numberToTokeshi(Number(form.amount), String(authchainIdentity.tokenCategory?.decimals))" -->
          <q-input ref="tokenAmountInputRef" v-model="form.amount" label="Enter Token amount in decimal" filled dense
            bottom-slots :rules="[(v) => Number(v) <= Number(currentFtReserves) || 'Amount exceeds supply']"
            :disable="Boolean(authchainIdentity.processing)">
            <!-- <template v-slot:hint>
              <div v-if="!authchainIdentity.tokenCategory?.decimals && form.amount.includes('.')"
                class="row justify-end text-italic q-mb-sm" style="font-size: .8em;">
                <q-icon name="warning" color="warning" /> Token has 0 or no decimal metadata. Value after decimal point
                will be
                ignored.
              </div>
              IMPORTANT TODO: change formAmount to BigInt once mainnet-js supports bigint
              <div v-if="Number(form.amount) <= Number(currentFtReserves)"
                class="row justify-end text-italic text-lg items-center text-caption q-gutter-sm">
                <span>Token amount </span>
                <span class="text-weight-bold text-green-6">{{
                  amountToSendRaw
                }}</span>
                <span>(Raw FT Amount)</span>
              </div>
            </template> -->
            <template v-if="authchainIdentity?.tokenUris?.icon" v-slot:prepend>
              <q-avatar>
                <img :src="authchainIdentity.tokenUris.icon" alt="">
              </q-avatar>
            </template>
          </q-input>
          <div v-if="!authchainIdentity.tokenCategory?.decimals && form.amount.includes('.')"
            class="text-left text-italic q-mb-sm">
            <q-icon name="warning" color="warning" /> Token has 0 or no `decimals` metadata. Value after decimal point
            will be
            ignored.
          </div>
          <!-- IMPORTANT TODO: change formAmount to BigInt once mainnet-js supports bigint -->
          <div v-if="Number(form.amount) <= Number(currentFtReserves)"
            class="row justify-end text-italic text-lg items-center text-caption q-gutter-sm">
            <span>Token amount </span>
            <span class="text-weight-bold text-green-6">{{
              amountToSendRaw
            }}</span>
            <span>(Raw FT Amount)</span>
          </div>
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
  amount: ''
})


const currentFtReserves = computed(() => Number(props.authchainIdentity.token!.amount).toString())
const currentFtReservesDecimal = computed(() => tokeshiToNumber(Number(currentFtReserves.value), props.authchainIdentity.tokenCategory?.decimals?.toString()))
const newReserveSupplyDecimal = computed(() => {
  let v = currentFtReservesDecimal.value - Number(form.value.amount || '0')
  if (!props.authchainIdentity.tokenCategory?.decimals) {
    v = Math.floor(v)
  }
  return v
})

const tokenAmountInputRef = ref<QInput | null>(null)

const amountToSendRaw = computed(() => {
  if (props.authchainIdentity.tokenCategory?.decimals) {
    console.log('d', props.authchainIdentity.tokenCategory?.decimals)
    return numberToTokeshi(Number(form.value.amount), props.authchainIdentity.tokenCategory?.decimals?.toString())
  }
  // ignore value after decimal point, !!! handle BigInt in the future
  return parseInt(form.value.amount || '0')
})

const releaseTokensFromReserveSupply = async () => {
  if (!form.value || !form.value.recipient || Number(form.value.amount) <= 0) {
    return $q.notify({ type: 'negative', message: 'Error!Amount and recipient required!' })
  }

  try {

    const tx = await props.authchainIdentity.releaseTokensFromReserveSupply({ to: form.value.recipient, amount: amountToSendRaw.value.toString() })
    if (tx) {
      $q.notify({ type: 'positive', message: 'Success!Tx=' + shortenTokenId(tx) })

      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'AuthchainIdentity.releaseTokensFromReserveSupply',
        timestamp: new Date().getTime(),
        successMsg: `Issued ${String(form.value.amount)} ${props.authchainIdentity.tokenCategory?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)} FT to ${shortenAddress(form.value.recipient)}`
      })
      ui.setStatusMessage({
        statusMessage: `Issued ${String(form.value.amount)} ${props.authchainIdentity.tokenCategory?.symbol || shortenTokenId(props.authchainIdentity.token!.tokenId)} FT to ${shortenAddress(form.value.recipient)}`,
        statusMessageType: 'success',
        statusMessageTxid: tx
      })
      emit('tokensIssued', {
        tokenId: props.authchainIdentity.token!.tokenId, to: form.value.recipient, amount: form.value.amount
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
</script>
