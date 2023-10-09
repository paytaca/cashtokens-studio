<template>
  <q-dialog v-close-popup @before-hide="form.amount = ''" @before-show="beforeShow">
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">
          Send {{ tokenBalance?.tokenCategory?.symbol ||
            'Tokens' }}</q-toolbar-title>
        <TokenCategory v-if="tokenBalance.tokenId" :token-id="tokenBalance.tokenId" />
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <q-form class="q-gutter-sm">
          <q-input v-if="tokenBalance.tokenId" :model-value="tokenBalance.tokenId" label="Token ID/Category" filled dense
            disable></q-input>
          <q-input v-if="tokenBalance.tokenId" :model-value="tokenBalance?.tokenCategory?.decimals" label="Decimals"
            filled dense disable></q-input>
          <q-input :model-value="currentBalanceWithDecimal"
            :label="BigInt(amountToSendRaw) > 0 ? 'Remaining balance' : 'Current balance'" filled dense disable>
            <template v-if="tokenBalance?.tokenUris?.icon" v-slot:prepend>
              <q-avatar>
                <img :src="tokenBalance?.tokenUris?.icon" alt="">
              </q-avatar>
            </template>
          </q-input>
          <q-input v-model="form.amount" label="Amount to send" placeholder="0" filled dense>
            <template v-slot:append>
              <q-btn color="warning" :flat="$q.dark.isActive ? true : false" :class="$q.dark.isActive ? '' : 'text-black'"
                dense @click="form.amount = String(tokenBalance.balance)">Send
                all</q-btn>
            </template>
            <template v-if="tokenBalance?.tokenUris?.icon" v-slot:prepend>
              <q-avatar>
                <img :src="tokenBalance?.tokenUris?.icon" alt="">
              </q-avatar>
            </template>
          </q-input>
          <div v-if="BigInt(amountToSendRaw) > 0" class="row justify-end text-italic">
            <span class="text-weight text-green-6 q-mr-xs">{{
              amountToSendRaw
            }}</span>
            <span>(Raw FT Amount)</span>
          </div>
          <q-input v-model="form.to" label="Recipient's Address" filled dense>
            <template v-slot:append>
              <q-btn color="warning" :flat="$q.dark.isActive ? true : false" :class="$q.dark.isActive ? '' : 'text-black'"
                dense @click="form.to = (user.wallet?.getTokenDepositAddress() as string)">Send
                to
                self</q-btn>
            </template>
          </q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => send()" label="Send Tokens" :busyLabel="processingMessage?.processing" color="primary"
          :disable="currentBalanceWithDecimal < 0" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { FungibleTokenBalance } from 'src/app/types';
import { useUser } from 'src/stores/user';
import BusyButton from 'src/components/BusyButton.vue'
import { CashToken } from 'src/app';
import TokenCategory from 'src/components/TokenCategory.vue'
import { Wallet } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { numberToTokeshi, shortenAddress, shortenTokenId, shortenTx, tokeshiToNumber } from 'src/app/utils';
import { ProcessingMessage } from 'src/app'
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui'
const props = defineProps<{
  tokenBalance: FungibleTokenBalance
}>()
const emit = defineEmits<{
  (e: 'ftTransferred', val: { tokenId: string, recipient: string }): void
}>()

const $q = useQuasar()
const user = useUser()
const ui = useUI()
const { $ebus } = useEventBus()
const currentBalanceWithDecimal = computed(() => {
  if (props.tokenBalance.tokenCategory?.decimals) {
    return Number(tokeshiToNumber(Number(props.tokenBalance.balance), props.tokenBalance.tokenCategory?.decimals?.toString())) - Number(form.value.amount)// !change to string if mainnetjs supports bigint
  }
  return Number(props.tokenBalance.balance) - Number(form.value.amount)// !change to string if mainnetjs supports bigint
})
const processingMessage = ref<ProcessingMessage>()
const amountToSendRaw = computed(() => {
  if (props.tokenBalance.tokenCategory?.decimals) {
    return numberToTokeshi(Number(form.value.amount), props.tokenBalance.tokenCategory?.decimals?.toString())
  }
  return form.value.amount
})
const form = ref<{ to: string, amount: string }>({
  to: '',
  amount: ''
})

const send = async () => {
  try {
    processingMessage.value = new ProcessingMessage()
    const tx = await CashToken.send({
      tokenId: props.tokenBalance.tokenId,
      to: form.value.to,
      amount: BigInt(amountToSendRaw.value),
      ownerWallet: user.wallet as Wallet,
      processingMessage: processingMessage.value
    })
    if (tx) {
      $q.notify({
        type: 'positive',
        message: `${props.tokenBalance?.tokenCategory?.symbol || 'Tokens'} sent!Tx=${shortenTx(tx)}`
      })
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'CashToken.transferFT',
        timestamp: new Date().getTime(),
        successMsg: `Sent ${form.value.amount} ${props.tokenBalance.tokenCategory?.symbol || 'FT'} to ${shortenAddress(form.value.to)}`
      })
      emit('ftTransferred', { tokenId: props.tokenBalance.tokenId, recipient: form.value.to })
      ui.setStatusMessage({
        statusMessage: `Sent ${form.value.amount} ${props.tokenBalance.tokenCategory?.symbol || 'FT'} to ${shortenAddress(form.value.to)}`,
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

const beforeShow = () => {
  form.value.amount = ''
  form.value.to = ''
}

</script>
