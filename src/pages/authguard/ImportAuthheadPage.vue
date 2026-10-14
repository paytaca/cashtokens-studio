<template>
  <q-page class="q-ma-lg">
    <div class="row justify-center q-mx-sm">
      <div class="col-xs-12 col-md-10">
        <ExplainerBanner class="q-mb-lg" icon="move_to_inbox" :title="t('authguard.importAuthhead.title')">
          <template #subtitle>
            {{ t('authguard.importAuthhead.cashonizeNote') }}
            {{ t('authguard.importAuthhead.explainerVault') }}
          </template>
          <!-- <q-btn icon="key" :label="t('authguard.importAuthhead.createPairCta')" color="secondary" no-caps rounded
            :to="{ name: 'create-authkey', query: { returnTo: route.fullPath, from: 'import-authhead' } }" /> -->
        </ExplainerBanner>

        <q-card v-if="!walletIsReady" flat bordered class="q-pa-lg text-center feature-card-bg">
          <q-icon name="account_balance_wallet" size="2em" color="warning" />
          <div class="q-mt-md text-grey-4">{{ t('authguard.importAuthhead.connectWallet') }}</div>
        </q-card>

        <div v-else-if="scanning" class="q-pa-lg flex flex-center">
          <q-spinner color="primary" size="2em" />
          <span class="q-ml-md text-grey-4">{{ t('authguard.importAuthhead.scanning') }}</span>
        </div>

        <q-card v-else-if="scanError" flat bordered class="q-pa-lg text-center feature-card-bg">
          <q-icon name="error_outline" size="2em" color="negative" />
          <div class="q-mt-md text-grey-4">{{ t('authguard.importAuthhead.scanFailed') }}</div>
          <q-btn class="q-mt-lg" :label="t('authguard.importAuthhead.retry')" color="primary" icon="refresh" rounded
            no-caps @click="scanForUnusedAuthkey" />
        </q-card>

        <q-card v-else-if="!unusedAuthkey" flat bordered class="q-pa-lg text-center feature-card-bg">
          <q-icon name="key_off" size="2em" color="warning" />
          <div class="q-mt-md text-grey-4">{{ t('authguard.importAuthhead.noAuthkey') }}</div>
          <q-btn :to="{ name: 'create-authkey', query: { returnTo: route.fullPath, from: 'import-authhead' } }"
            class="q-mt-lg" :label="t('createAuthkey.title')" color="primary" icon="add" rounded no-caps />
        </q-card>

        <template v-else>
          <q-card flat bordered class="q-pa-lg text-center feature-card-bg">
            <div class="row items-center justify-center text-grey-4">
              <span class="text-subtitle1">{{ t('authguard.vaultAddress') }}</span>
              <q-icon name="mdi-safe-square-outline" size="sm" color="grey-6" />
            </div>

            <div class="flex flex-center q-mt-md">
              <div class="import-authhead-qr-frame flex flex-center">
                <qr-code :contents="vaultTokenAddress" class="import-authhead-qr" module-color="#1c7d43"
                  position-ring-color="#13532d" position-center-color="#70c559" />
              </div>
            </div>

            <div class="q-mt-md text-body1 text-primary">
              {{ t('authguard.importAuthhead.sendToAddress') }}
            </div>

            <div class="flex flex-center q-mt-sm">
              <CashAddress :cashaddr="vaultTokenAddress" tool-tip="Copy Contract Address" icon-right="lock" />
            </div>
          </q-card>

          <!-- <q-card flat bordered class="q-pa-lg q-mt-lg feature-card-bg">
            <div class="row items-center justify-center q-gutter-x-sm text-grey-4">
              <q-icon name="key" size="md" color="warning" />
              <span class="text-subtitle1">{{ t('authguard.keyNftCategory') }}</span>
            </div>

            <div class="row justify-center q-mt-md">
              <TokenCategory :tokenId="unusedAuthkey.token!.category" icon-right="key" />
            </div>

            <div class="row justify-center q-mt-md q-gutter-x-sm text-grey-4">
              <span>{{ t('createAuthkey.commitment') }}:</span>
              <span class="text-mono">{{ unusedAuthkey.token?.nft?.commitment }}</span>
            </div>
          </q-card> -->

          <div class="q-mt-lg flex flex-center text-grey-5">
            <q-spinner-dots color="primary" size="1.5em" />
            <span class="q-ml-md">{{ t('authguard.importAuthhead.waitingDeposit') }}</span>
          </div>
        </template>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { type Network } from 'cashscript'
import { createAuthguardContract, filterAuthKeys, findUnusedAuthkey } from 'src/core/authguard'
import type { DecoratedUtxo, UtxoWithPath } from 'src/core/types'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { useAuthguardStore } from 'src/stores/authguard'
import { subscribe } from 'src/services/watchtower'
import CashAddress from 'src/components/CashAddress.vue'
import TokenCategory from 'src/components/TokenCategory.vue'
import ExplainerBanner from 'src/components/ExplainerBanner.vue'

/** How often the vault is polled for the imported auth UTXO. */
const DEPOSIT_POLL_MS = 5000

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { wallet, walletIsReady } = useWizardConnectWallet()
const { setReceivedAuthheads } = useAuthguardStore()

const scanning = ref<boolean>(false)
const scanError = ref<string>('')
const unusedAuthkey = ref<UtxoWithPath | undefined>()
const vaultTokenAddress = ref<string>('')
const vaultContract = ref<ReturnType<typeof createAuthguardContract> | undefined>()

let depositPoller: ReturnType<typeof setInterval> | undefined

const network = () => import.meta.env.VITE_BCH_NETWORK as Network

const stopWatchingDeposit = () => {
  if (depositPoller) {
    clearInterval(depositPoller)
    depositPoller = undefined
  }
}

/**
 * The vault receives the auth UTXO as a plain on-chain transfer, so nothing pushes to the client:
 * poll the contract until it holds something, then hand over to the managed tokens page.
 */
const watchForDeposit = () => {
  stopWatchingDeposit()

  depositPoller = setInterval(async () => {
    if (!vaultContract.value) return

    try {
      const utxos = await vaultContract.value.getUtxos()
      if (utxos.length === 0) return

      stopWatchingDeposit()

      // Spotlight the arrival on the managed tokens page, which forgets about it on navigation.
      setReceivedAuthheads(utxos.map((utxo) => ({
        ...utxo,
        authkey: unusedAuthkey.value,
        isAuthhead: true
      } as DecoratedUtxo)))
      router.push({ name: 'managed-tokens' })
    } catch (error) {
      console.log('@ImportAuthheadPage deposit poll:', error)
    }
  }, DEPOSIT_POLL_MS)
}

const showVault = async (authkey: UtxoWithPath) => {
  unusedAuthkey.value = authkey
  vaultContract.value = createAuthguardContract({ authkeyTokenId: authkey.token!.category, network: network() })
  vaultTokenAddress.value = vaultContract.value.tokenAddress

  // Best effort: let the indexer know about the vault so the imported tokens are picked up.
  subscribe(vaultTokenAddress.value).catch()

  watchForDeposit()
}

/**
 * Look for an AuthKey NFT whose vault is still empty. Without one there is nothing to import into,
 * so send the user to create one and come back here (the query flag keeps that from looping).
 */
const scanForUnusedAuthkey = async () => {
  scanning.value = true
  scanError.value = ''
  unusedAuthkey.value = undefined
  stopWatchingDeposit()

  try {
    const utxos = await wallet.value.getUtxos()
    const authkeys = filterAuthKeys(utxos) as UtxoWithPath[]
    const unused = await findUnusedAuthkey(authkeys, network())

    console.log('@ImportAuthheadPage scan:', {
      authkeys: authkeys.length,
      unusedAuthkey: unused?.token?.category,
      alreadyScanned: !!route.query.scanned
    })

    if (!unused) {
      if (!route.query.scanned) {
        console.log('@ImportAuthheadPage: no unused AuthKey, sending the user to create one')
        return await router.replace({
          name: 'create-authkey',
          query: { returnTo: route.fullPath, scanned: '1', from: 'import-authhead' }
        })
      }
      return
    }

    await showVault(unused)
  } catch (error: any) {
    console.log('@ImportAuthheadPage scan:', error)
    scanError.value = error?.message || String(error)
  } finally {
    scanning.value = false
  }
}

watch(walletIsReady, async (ready, readyBefore) => {
  if (ready && ready !== readyBefore) {
    await scanForUnusedAuthkey()
  }
})

onMounted(async () => {
  if (walletIsReady.value) {
    await scanForUnusedAuthkey()
  }
})

onBeforeUnmount(stopWatchingDeposit)
</script>

<style scoped lang="scss">
/* The <qr-code> web component paints black modules on a transparent host, so it needs a light
   frame behind it (same treatment as the wallet connect modal's QR). */
.import-authhead-qr-frame {
  background: white;
  border-radius: 25px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  padding: 1em;
}

.import-authhead-qr {
  display: block;
  width: 220px;
  height: 220px;
}

.text-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>
