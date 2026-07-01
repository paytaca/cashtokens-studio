<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" class="text-title" :title="transferType">
    <q-card class="q-px-xs q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h4 text-bold row items-center q-gutter-xs text-grey-4" style="text-wrap:wrap">
          <div class="flex items-center col justify-between">
            <div class="flex items-center text-capitalize">{{ transferLabel }}</div>
            <div class="flex items-center token-symbol q-gutter-xs">
              <q-avatar>
                <q-img v-if="identitySnapshot?.uris?.icon"
                  :src="ipfsToGatewayUrl(identitySnapshot?.uris?.icon) as string"></q-img>
                <q-icon v-else></q-icon>
              </q-avatar>
              <span>{{ identitySnapshot?.token?.symbol }}</span>
            </div>
          </div>
        </q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <div class="q-mt-sm">
          <q-form id="ft-transfer-form" ref="transferForm" @submit.prevent="onSubmit"
            style="justify-items: initial !important;">
            <div class="q-gutter-md">
              <q-input :model-value="shortenTokenId(tokenCategory)" label="Token ID" outlined readonly size="lg">
                <template v-slot:append>
                  <CopyText :text="tokenCategory" />
                </template>
              </q-input>
              <q-input :model-value="balanceDecimal" label="Balance" outlined
                style="font-variant-numeric: tabular-nums; font-size: large" class="text-positive" readonly
                hide-bottom-space>
              </q-input>
              <q-input :model-value="decimals" label="Decimals" outlined readonly></q-input>
              <q-input v-if="Number(transferAmount) > 0" :model-value="newBalance" label="New Balance After Send"
                outlined class="currency-amount" readonly>
              </q-input>
              <q-input v-model="transferAmount" label="Enter amount to Send" outlined class="currency-amount"
                :rules="transferAmountRules" autofocus hide-bottom-space>
                <template v-slot:prepend>
                  <q-avatar>
                    <q-img v-if="identitySnapshot?.uris?.icon"
                      :src="ipfsToGatewayUrl(identitySnapshot.uris.icon) as string"></q-img>
                    <q-icon v-else name="token"></q-icon>
                  </q-avatar>
                </template>
              </q-input>
              <q-input
                v-if="(transferType === 'issuance' || transferType === 'send') && transferAmount && decimalToBigInt(transferAmount, decimals) > 0n"
                v-model="recipient" ref="recipientInputElement" label="Recipient"
                placeholder="Paste recipient's token address"
                :rules="[(v: string) => v && isTokenAddress(v) || 'Value should be a cashtoken address']" outlined>
                <template v-slot:append>
                  <q-btn @click="sendToSelf" text-color="primary" no-caps>Self</q-btn>
                </template>
              </q-input>
            </div>
          </q-form>
        </div>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn v-if="transferType === 'issuance' || transferType === 'send'" text-color="primary" label="Send"
          icon="send" @click.stop="(e) => transferForm.submit(e)" size="lg"
          :disable="!transferAmount || decimalToBigInt(transferAmount, decimals) <= 0n">
        </q-btn>
        <q-btn v-else-if="transferType === 'burn'" color="orange" text-color="dark" label="Burn"
          icon="local_fire_department" @click.stop="(e) => transferForm.submit(e)" size="lg"
          :disable="!transferAmount || decimalToBigInt(transferAmount, decimals) <= 0n">
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { type IdentitySnapshot } from 'mainnet-js'
import { computed, nextTick, onMounted, ref } from 'vue';
import BigNumber from 'bignumber.js'
import { ipfsToGatewayUrl, isTokenAddress } from '../../apps/utils';
import { shortenTokenId } from 'src/core/utils';
import CopyText from 'components/CopyText.vue'

defineEmits([
  ...useDialogPluginComponent.emits,
])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const props = defineProps<{
  tokenCategory: string
  balance: bigint
  decimals: number
  transferType: 'issuance' | 'send' | 'burn'
  identitySnapshot?: IdentitySnapshot
  selfAddress?: string
  burnAddress?: string
}>()

function decimalToBigInt(value: string, decimals: number): bigint {
  const parts = value.split('.')
  const whole = parts[0] || '0'
  const fraction = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals)
  return BigInt(whole + fraction)
}

function bigIntToDecimal(value: bigint, decimals: number): string {
  const s = value.toString()
  if (decimals === 0) return s
  if (s.length <= decimals) return '0.' + s.padStart(decimals, '0')
  const whole = s.slice(0, -decimals)
  const fraction = s.slice(-decimals)
  return whole + '.' + fraction
}

const transferLabel = computed(() => {
  if (props.transferType === 'issuance') return 'Release Reserves'
  if (props.transferType === 'send') return 'Send Tokens'
  return 'Burn Tokens'
})

const balanceDecimal = computed(() => bigIntToDecimal(props.balance, props.decimals))

const recipient = ref<string>()
const recipientInputElement = ref()
const transferForm = ref()
const transferAmount = ref<string>('0')
const transferAmountRules = [
  (v: string) => {
    try {
      const rawAmount = decimalToBigInt(v, props.decimals)
      return BigInt(props.balance) - rawAmount >= 0n || 'Amount should not exceed current balance'
    } catch {
      return 'Invalid amount'
    }
  },
  (v: string) => {
    const i = v.indexOf('.')
    if (i === -1) return true
    const expectedMaxDecimals = Number(props.decimals || 0)
    if (expectedMaxDecimals === 0) return 'Violates max decimal value'
    return v.substring(i + 1).length <= expectedMaxDecimals || 'Violates max decimal value'
  },
  (v: string) => {
    if (v.includes('.')) {
      return (v.match(/./g)?.filter(i => i == '.') || []).length <= 1 || 'Invalid number of decimal point'
    }
    return true
  },
]
const newBalance = computed(() => {
  if (transferAmount.value) {
    try {
      const rawTransferAmount = decimalToBigInt(transferAmount.value, props.decimals)
      const remaining = BigInt(props.balance) - rawTransferAmount
      return bigIntToDecimal(remaining, props.decimals)
    } catch {
      return balanceDecimal.value
    }
  }
  return balanceDecimal.value
})

const confirmIssuance = () => {
  const rawAmount = decimalToBigInt(transferAmount.value, props.decimals)
  onDialogOK({
    tokenAmount: rawAmount,
    recipient: recipient.value
  })
  dialogRef.value = undefined
}

const confirmBurn = () => {
  const rawAmount = decimalToBigInt(transferAmount.value, props.decimals)
  onDialogOK({
    tokenAmount: rawAmount,
    recipient: props.burnAddress
  })
  dialogRef.value = undefined
}

const onSubmit = () => {
  if (props.transferType === 'issuance' || props.transferType === 'send') {
    return confirmIssuance()
  }
  if (props.transferType === 'burn') {
    confirmBurn()
  }
}

const sendToSelf = () => {
  if (props.selfAddress) {
    recipient.value = props.selfAddress
    nextTick(() => {
      const inputEl = recipientInputElement.value.$el.querySelector('input')
      if (inputEl) {
        inputEl.focus()
        const len = inputEl.value.length
        inputEl.setSelectionRange(len, len)
      }
    })
  }
}

onMounted(() => {
  transferForm.value?.resetValidation()
  transferForm.value?.reset()
})
</script>
