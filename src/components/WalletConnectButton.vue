<template>
  <q-btn v-if="isEnabled" :color="color" :unelevated="unelevated" :rounded="rounded" :no-caps="noCaps"
    :loading="state === 'connecting'" :disable="state === 'connecting' || walletIsReady" class="wallet-connect-button"
    @click="onConnect">
    <img src="/images/walletconnect_icon.png" alt="" class="wallet-connect-button-icon q-mr-sm" />
    <span>{{ state === 'connecting' ? t('index.connect.walletConnect.connecting') : (label ??
      t('index.connect.walletConnect.action')) }}</span>
  </q-btn>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useWalletConnectWallet } from 'src/composables/useWalletConnectWallet'

/**
 * The WalletConnect entry point.
 *
 * Self-contained and additive: it renders nothing when the feature is disabled, and it only talks to
 * its own composable. WizardConnect's connect flow is untouched by it.
 */
withDefaults(defineProps<{
  label?: string
  color?: string
  unelevated?: boolean
  rounded?: boolean
  noCaps?: boolean
}>(), {
  color: 'primary',
  unelevated: true,
  rounded: true,
  noCaps: true
})

const { t } = useI18n()
const $q = useQuasar()
const { isEnabled, state, walletIsReady, connect } = useWalletConnectWallet()

const onConnect = async () => {
  try {
    await connect()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `${t('index.connect.walletConnect.failed')}: ${error instanceof Error ? error.message : String(error)}`
    })
  }
}
</script>

<style scoped>
.wallet-connect-button-icon {
  height: 18px;
  width: auto;
  display: block;
}
</style>
