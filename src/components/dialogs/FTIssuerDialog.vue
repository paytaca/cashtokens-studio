<template>
  <q-dialog ref="issuerDialogRef" @hide="onDialogHide" title="Issue" :no-refocus="true" :no-focus="true">
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h4 text-bold row items-center q-gutter-xs text-grey-4" style="text-wrap:wrap">
          <div class="flex items-center col justify-between">
            <div class="flex items-center"><q-icon name="send"></q-icon><span>Issue</span></div>
            <div class="flex items-center token-symbol q-gutter-xs">
              <q-avatar v-if="identitySnapshot?.uris?.icon">
                <q-img :src="ipfsToGatewayUrl(identitySnapshot?.uris?.icon)"></q-img>
              </q-avatar>{{ identitySnapshot?.token?.symbol }}
            </div>
          </div>
        </q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <div class="q-mt-sm" style="max-width: 100%;overflow-x: auto;">
          <q-form id="ft-issuer-form" ref="issuerForm" @submit.prevent="() => confirmSend()">
            <Token v-if="tokenCopy" v-bind:token="tokenCopy" :hide="['capability', 'commitment']" :readonly="['amount']"
              :labels="{ amount: 'Current Balance' }" />
            <div class="q-gutter-lg">
              <q-input :model-value="identitySnapshot?.token?.decimals || 0" label="Decimals" outlined
                readonly></q-input>
              <q-input v-if="Number(issuedAmount) > 0" :model-value="newBalance" label="New Balance After Send" outlined
                class="currency-amount" readonly>
              </q-input>
              <q-input v-model="issuedAmount" label="Enter amount to Send" :rules="issuedAmountRules" outlined
                class="currency-amount">
              </q-input>
              <q-input v-if="issuedAmount" v-model="recipient" label="Recipient"
                :rules="[(v: string) => v && isTokenAddress(v) || 'Value should be a cashtoken address']" outlined>
              </q-input>
            </div>
          </q-form>
        </div>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn text-color="orange" label="Send" icon="send" @click.stop="(e) => issuerForm.submit(e)" size="lg"
          :disable="!issuedAmount || BigInt(issuedAmount.replace('.', '')) <= 0">
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { TokenI, type IdentitySnapshot } from 'mainnet-js'
import { computed, onBeforeMount, onMounted, ref, toRaw } from 'vue';
import BigNumber from 'bignumber.js'
import Token from '../../components/Token.vue'
import { ipfsToGatewayUrl, isTokenAddress } from '../../app/utils';

const props = defineProps<{ token: Omit<TokenI, 'amount'> & { amount: string }, identitySnapshot?: IdentitySnapshot }>()
const tokenCopy = ref<Omit<TokenI, 'amount'> & { amount: string }>()
const recipient = ref<string>()
const issuerForm = ref()
const issuedAmount = ref<string>('0')
const issuedAmountRules = [
  (v: string) => {
    return new BigNumber(newBalance.value) >= new BigNumber(0) || 'Amount should not exceed current balance'
  },
  (v: string) => {
    const i = v.indexOf('.')
    if (i == -1) return true
    if (Number(props.identitySnapshot?.token?.decimals || 0) == 0) return 'Violates max decimal value'
    return v.substring(i + 1).length <= Number(props.identitySnapshot?.token?.decimals || 0) || 'Violates max decimal value'
  },
  (v: string) => {
    if (v.includes('.')) {
      return (v.match(/./g)?.filter(i => i == '.') || []).length <= 1 || 'Invalid number of decimal point'
    }
    return true
  }
]
const newBalance = computed(() => {
  if (tokenCopy.value?.amount) {
    return new BigNumber(tokenCopy.value.amount).minus(issuedAmount.value).toString()
  }
  return new BigNumber(tokenCopy.value?.amount || 0).toString()

})

defineEmits([
  ...useDialogPluginComponent.emits,
])
const { dialogRef: issuerDialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const confirmSend = () => {
  const decimals = Number(props.identitySnapshot?.token?.decimals || 0)

  onDialogOK({ amountToSend: issuedAmount.value, newBalance: newBalance.value, decimals, recipient: recipient.value })
  issuerDialogRef.value = undefined
}

onBeforeMount(() => {
  tokenCopy.value = structuredClone(toRaw(props.token))
})

onMounted(() => {

  if (props.token) {
    tokenCopy.value = structuredClone(toRaw(props.token))
    const decimals = props.identitySnapshot?.token?.decimals || 0
    if (decimals > 0) {
      const whole = BigInt(tokenCopy.value?.amount || '0') / BigInt(eval(`1e${decimals}`))
      const fraction = (BigInt(tokenCopy.value?.amount || '0') % BigInt(eval(`1e${decimals}`))).toString().padStart(decimals, '0')
      tokenCopy.value.amount = `${whole}.${fraction}`
    }
  }
  issuerForm.value?.resetValidation()
  issuerForm.value?.reset()
})


</script>