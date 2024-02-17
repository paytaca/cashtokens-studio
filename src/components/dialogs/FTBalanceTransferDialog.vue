<template>
  <q-dialog v-close-popup @before-hide="form.amount = ''" @before-show="beforeShow">
    <q-card class="q-px-sm q-py-lg full-width">
      <div class="row justify-end"><q-btn flat color="negative" icon="close" v-close-popup></q-btn></div>
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">
          Send {{ tokenBalance?.identitySnapshot?.token?.symbol ||
            'Tokens' }}</q-toolbar-title>
        <TokenCategory v-if="tokenBalance.tokenId" :token-id="tokenBalance.tokenId" />
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <q-form class="q-gutter-sm">
          <q-input v-if="tokenBalance.tokenId" :model-value="tokenBalance.tokenId" label="Token ID/Category" filled dense
            disable></q-input>
          <q-input v-if="tokenBalance.tokenId" :model-value="tokenBalance?.identitySnapshot?.token?.decimals"
            label="Decimals" filled dense disable></q-input>
          <q-input :model-value="newBalanceWithDecimal"
            :label="Number(amountToSendRaw) > 0 ? 'Remaining balance' : 'Current balance'" filled dense disable>
            <template v-if="tokenBalance?.tokenUris?.icon" v-slot:prepend>
              <q-avatar>
                <img :src="tokenBalance?.tokenUris?.icon" alt="">
              </q-avatar>
            </template>
          </q-input>
          <q-input v-model="form.amount" label="Amount to send" placeholder="0" filled dense
            :disable="Boolean(processingMessage?.processing)"
            :rules="[tokenAmountHonorsDecimalPlaces, tokenAmountIsLessThanSupply]" autofocus>
            <template v-slot:append>
              <q-btn color="warning" :flat="$q.dark.isActive ? true : false" :class="$q.dark.isActive ? '' : 'text-black'"
                dense
                @click="form.amount = ftAmtFormatter.toDecimal(tokenBalance.balance.toString(), props.tokenBalance.identitySnapshot?.token?.decimals)">Send
                all</q-btn>
            </template>
            <template v-if="tokenBalance?.tokenUris?.icon" v-slot:prepend>
              <q-avatar>
                <img :src="tokenBalance?.tokenUris?.icon" alt="">
              </q-avatar>
            </template>
          </q-input>
          <div v-if="!tokenBalance.identitySnapshot?.token?.decimals && form.amount.includes('.')" class="text-italic">
            <q-icon name="warning" color="warning" size="xs" /> Token has 0 or no `decimals` metadata. Value after decimal
            point
            will be
            ignored.
          </div>
          <div v-if="Number(amountToSendRaw) > 0" class="row justify-end text-italic">
            <span class="text-weight text-green-6 q-mr-xs">{{
              amountToSendRaw
            }}</span>
            <span>(Raw FT Amount)</span>
          </div>
          <q-input v-model="form.to" label="Recipient's Address" filled dense
            :disable="Boolean(processingMessage?.processing)">
            <template v-slot:append>
              <q-btn color="warning" :flat="$q.dark.isActive ? true : false" :class="$q.dark.isActive ? '' : 'text-black'"
                dense @click="form.to = (user.wallet?.getTokenDepositAddress() as string)"
                :disable="Boolean(processingMessage?.processing)">Send
                to
                self</q-btn>
            </template>
          </q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <BusyButton @click="() => send()" label="Send Tokens" :busyLabel="processingMessage?.processing" color="primary"
          :disable="Number(newBalanceWithDecimal) < 0 || !form.amount || !form.to || Boolean(processingMessage?.processing)" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { FungibleTokenBalance } from 'src/app/types';
import { useUser } from 'src/stores/user';
import BusyButton from 'src/components/BusyButton.vue'
import { CashToken } from 'src/app';
import TokenCategory from 'src/components/TokenCategory.vue'
import { Wallet } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { shortenAddress, shortenTx } from 'src/app/utils';
import { ProcessingMessage } from 'src/app'
import { useEventBus } from 'src/composables';
import { useUI } from 'src/stores/ui'
import ftAmtFormatter from 'src/app/utils/ftAmountFormatter'
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
const processingMessage = ref<ProcessingMessage>()

const currentBalanceWithDecimal = computed(() => {
  return ftAmtFormatter.toDecimal(props.tokenBalance.balance.toString(), props.tokenBalance.identitySnapshot?.token?.decimals)
})

const newBalanceWithDecimal = computed(() => {
  if (!form.value.amount) return currentBalanceWithDecimal.value
  const currentReserves = ftAmtFormatter.toRaw(currentBalanceWithDecimal.value, props.tokenBalance.identitySnapshot?.token?.decimals)
  const issuedAmount = ftAmtFormatter.toRaw(form.value.amount || '0', props.tokenBalance.identitySnapshot?.token?.decimals)
  const newReserves = BigInt(currentReserves) - BigInt(issuedAmount)
  return ftAmtFormatter.toDecimal(newReserves.toString(), props.tokenBalance.identitySnapshot?.token?.decimals)
})

const amountToSendRaw = computed(() => {
  if (!form.value.amount) return '0'
  if (props.tokenBalance.identitySnapshot?.token?.decimals) {
    return ftAmtFormatter.toRaw(form.value.amount, props.tokenBalance.identitySnapshot?.token?.decimals)
  }
  return form.value.amount
})

const form = ref<{ to: string, amount: string }>({
  to: '',
  amount: ''
})

// Token Amount Rules
const tokenAmountHonorsDecimalPlaces = (v: string) => {
  if (v.indexOf('.') !== -1) {
    // be sure that the input has n decimal places only
    return v.split('.')[1].length <= Number(props.tokenBalance.identitySnapshot?.token?.decimals || 0) || 'Invalid decimal value'
  }
  return true
}

const tokenAmountIsLessThanSupply = (v: string) => {
  return (
    (
      Number(newBalanceWithDecimal.value) >= 0 &&
      BigInt(ftAmtFormatter.toRaw(newBalanceWithDecimal.value, props.tokenBalance.identitySnapshot?.token?.decimals)) >= BigInt('0')
    ) ||
    'Amount exceeds available supply'
  )
}
const send = async () => {
  try {
    processingMessage.value = new ProcessingMessage()
    const tx = await CashToken.send({
      tokenId: props.tokenBalance.tokenId,
      to: form.value.to,
      amount: BigInt(amountToSendRaw.value),
      ownerWallet: user.wallet as Wallet,
      processingMessage: processingMessage.value,
      transactionSigner: user.transactionSigner
    })
    if (tx) {
      $q.notify({
        type: 'positive',
        message: `${props.tokenBalance?.identitySnapshot?.token?.symbol || 'Tokens'} sent!Tx=${shortenTx(tx)}`
      })
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'CashToken.transferFT',
        timestamp: new Date().getTime(),
        successMsg: `Sent ${form.value.amount} ${props.tokenBalance.identitySnapshot?.token?.symbol || 'FT'} to ${shortenAddress(form.value.to)}`
      })

      ui.setStatusMessage({
        statusMessage: `Sent ${form.value.amount} ${props.tokenBalance.identitySnapshot?.token?.symbol || 'FT'} to ${shortenAddress(form.value.to)}`,
        statusMessageType: 'success',
        statusMessageTxid: tx
      })
      emit('ftTransferred', { tokenId: props.tokenBalance.tokenId, recipient: form.value.to })

    }
  } catch (error: any) {
    console.log(error)
    ui.setStatusMessage({
      statusMessage: error,
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
