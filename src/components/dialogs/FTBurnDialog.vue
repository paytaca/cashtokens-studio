<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" title="Burn">
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold q-mb-md" style="text-wrap:wrap">
          Burn
        </q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <div class="q-mt-sm" style="max-width: 100%;overflow-x: auto;">
          <template v-if="tokenCopy">
            <q-form>
              <Token v-bind:token="tokenCopy" :hide="['capability', 'commitment']"
                :decimals="identitySnapshot?.token?.decimals" :readonly="['amount']"
                :labels="{ amount: 'Current Balance' }" />
              <div class="q-gutter-lg">
                <q-input v-if="Number(burnAmount) > 0" :model-value="newBalance" label="New Balance" outlined
                  readonly></q-input>
                <q-input v-model="burnAmount" label="Enter amount to burn" :rules="burnAmountRules" outlined autofocus>
                </q-input>
              </div>

            </q-form>
          </template>
        </div>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn text-color="orange" label="Burn" icon="local_fire_department" @click.stop="confirmBurn"></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { TokenI, type IdentitySnapshot } from 'mainnet-js'
import Token from 'src/components/Token.vue'
import { computed, onMounted, ref, toRaw } from 'vue';
import BigNumber from 'bignumber.js'

const props = defineProps<{ token: Omit<TokenI, 'amount'> & { amount: string }, identitySnapshot?: IdentitySnapshot }>()
const tokenCopy = ref<Omit<TokenI, 'amount'> & { amount: string }>()
const burnAmount = ref<string>('0')
const burnAmountRules = [
  (v: string) => {
    return new BigNumber(tokenCopy.value!.amount) >= new BigNumber(0) || 'Amount should not exceed current balance'
  },
  // TODO: max decimal places, based on decimals metadata
]
const newBalance = computed(() => {
  if (tokenCopy.value?.amount) {
    return new BigNumber(tokenCopy.value.amount).minus(burnAmount.value).toString()
  }
  return 0

})

defineEmits([
  ...useDialogPluginComponent.emits,
])
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const confirmBurn = () => {
  onDialogOK({ amountToBurn: burnAmount.value, newBalance: newBalance.value })
}

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
})


</script>