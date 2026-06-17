<template>
  <q-dialog ref="issuerDialogRef" @hide="onDialogHide" class="text-title" :title="transferType" full-width>
    <q-card class="q-px-xs q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h4 text-bold row items-center q-gutter-xs text-grey-4" style="text-wrap:wrap">
          <div class="flex items-center col justify-between">
            <div class="flex items-center text-capitalize">{{ transferType }}</div>
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
          <q-form v-if="issuerUtxo" id="ft-issuer-form" ref="transferForm" @submit.prevent="onSubmit"
            style="justify-items: initial !important;">
            <div class="q-gutter-md">
              <q-input :model-value="shortenTokenId(issuerUtxo.token!.category)" label="Token ID" outlined readonly
                size="lg">
                <template v-slot:append>
                  <CopyText :text="issuerUtxo.token!.category" />
                </template>
              </q-input>
              <q-input :model-value="issuerUtxo.token!.amount" label="Balance" outlined
                style="font-variant-numeric: tabular-nums; font-size: large" class="text-positive" readonly
                hide-bottom-space>
              </q-input>
              <q-input :model-value="identitySnapshot?.token?.decimals || 0" label="Decimals" outlined
                readonly></q-input>
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
                v-if="transferType === 'issuance' && transferAmount && BigInt(transferAmount.replace('.', '')) > 0"
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
        <q-btn v-if="transferType === 'issuance'" text-color="primary" label="Send" icon="send"
          @click.stop="(e) => transferForm.submit(e)" size="lg"
          :disable="!transferAmount || BigInt(transferAmount.replace('.', '')) <= 0">
        </q-btn>
        <q-btn v-else-if="transferType === 'burn'" text-color="orange" label="Burn" icon="local_fire_department"
          @click.stop="(e) => transferForm.submit(e)" size="lg"
          :disable="!transferAmount || BigInt(transferAmount.replace('.', '')) <= 0">
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
import { UtxoFormSafe } from 'src/core/types';
import { shortenTokenId } from 'src/core/utils';

defineEmits([
  ...useDialogPluginComponent.emits,
])

const { dialogRef: issuerDialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const props = defineProps<{
  issuerUtxo: UtxoFormSafe,
  transferType: 'issuance' | 'burn',
  identitySnapshot?: IdentitySnapshot,
  selfAddress?: string,
  burnAddress?: string
}>()

const recipient = ref<string>()
const recipientInputElement = ref()
const transferForm = ref()
const transferAmount = ref<string>('0')
const transferAmountRules = [
  (v: string) => {
    return new BigNumber(newBalance.value) >= new BigNumber(0) || 'Amount should not exceed current balance'
  },
  (v: string) => {
    const i = v.indexOf('.')
    if (i === -1) return true
    const expectedMaxDecimals = Number(props.identitySnapshot?.token?.decimals || 0)
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
    return new BigNumber(props.issuerUtxo.token!.amount).minus(transferAmount.value).toString()
  }
  return new BigNumber(props.issuerUtxo.token!.amount || 0).toString()
})

const confirmIssuance = () => {
  onDialogOK({
    tokenAmount: BigInt(transferAmount.value),
    recipient: recipient.value
  })
  issuerDialogRef.value = undefined
}

const confirmBurn = () => {
  onDialogOK({
    tokenAmount: BigInt(transferAmount.value),
    recipient: props.burnAddress
  })
  issuerDialogRef.value = undefined
}

const onSubmit = () => {
  if (props.transferType === 'issuance') {
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
        // Move cursor to the end
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