<template>
  <q-page class="bg-dark-page text-white">
    <div class="row justify-center q-pa-md">
      <div class="col-xs-12 col-sm-10 q-my-lg q-gutter-y-lg">
        <div class="q-mb-md q-px-sm">
          <q-btn flat dense icon="arrow_back" :label="t('button.back')" color="grey-4" @click="router.back()" />
        </div>
        <q-card class="q-pa-lg rounded-borders">
          <div class="row">
            <div class="col-12 flex items-center q-gutter-x-md">
              <q-avatar size="3xl" class="profile-avatar bg-grey-9">
                <q-img v-if="identitySnapshot?.uris?.icon" :src="ipfsToGatewayUrl(identitySnapshot?.uris?.icon)!" />
                <q-img v-else :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${authkeyCategory}`" />
              </q-avatar>
              <div>
                <div class="text-h5 text-weight-bold text-white">{{ identitySnapshot?.name || t('authguard.vault')
                  }}
                </div>
                <div v-if="identitySnapshot?.description" class="text-caption text-grey-4 q-mt-xs">{{
                  identitySnapshot.description }}</div>
              </div>
              <q-btn class="q-ml-auto" outline color="negative" no-caps icon="mdi-shield-alert"
                :label="t('authguard.transferOwnership.button')" @click="onTransferOwnershipClick" rounded />
            </div>

          </div>
        </q-card>
        <q-card class="q-pa-lg rounded-borders">
          <div class="q-pt-lg q-px-md content-container">
            <div class="row q-gutter-y-md q-mb-lg">
              <div class="col-12 col-sm-6">
                <div class="text-caption text-grey-5 text-uppercase q-mb-xs q-gutter-x-sm flex no-wrap items-center">
                  <q-icon name="lock" color="warning"></q-icon>
                  <div>{{ t('authguard.vaultAddress') }}</div>
                </div>
                <div class="flex items-center q-gutter-x-xs">
                  <span class="text-caption text-grey-3 text-mono">{{ shortenCashAddress(vaultAddress) }}</span>
                  <CopyText :text="vaultAddress" />
                </div>
              </div>
              <div class="col-12 col-sm-6">
                <div class="text-caption text-grey-5 text-uppercase q-mb-xs q-gutter-x-sm flex no-wrap items-center">
                  <q-icon name="key" color="warning"></q-icon>
                  <div>{{ t('authguard.keyNftCategory') }}</div>
                </div>
                <div class="flex items-center q-gutter-x-xs">
                  <span class="text-caption text-grey-3 text-mono">{{ shortenTokenId(authkeyCategory) }}</span>
                  <CopyText :text="authkeyCategory" />
                </div>
              </div>
            </div>

            <div class="table-scroll-wrapper">
              <q-table :rows="vaultUtxos" :columns="columns" flat class="border-radius-12 token-reserves-table"
                :loading="loading" row-key="txid" style="min-width: 640px" title="Vault Contents">
                <template v-slot:body-cell-token="props">
                  <q-td :props="props">
                    <div class="flex items-center no-wrap q-gutter-x-md">
                      <q-avatar size="36px" class="bg-grey-9 border-radius-8 shadow-1">
                        <q-img v-if="identitySnapshot?.uris?.icon"
                          :src="ipfsToGatewayUrl(identitySnapshot?.uris?.icon)!" fit="cover" />
                        <q-img v-else
                          :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${props.row.token?.commitment || authkeyCategory}`"
                          fit="cover">
                          <q-tooltip class="bg-grey-9 text-caption text-grey-4">{{ t('authguard.noIconTooltip')
                            }}</q-tooltip>
                        </q-img>
                      </q-avatar>
                      <div>
                        <div class="text-caption text-grey-6 flex items-center no-wrap">
                          UTXO<q-icon name="mdi-identifier" size="sm"></q-icon> = {{ shortenTokenId(props.row.txid)
                          }}:{{
                            props.row.vout
                          }}
                        </div>
                        <div class="flex items-center q-gutter-x-xs">
                          <span class="text-caption text-weight-medium text-primary">
                            Symbol: {{ identitySnapshot?.token?.symbol || '<Not able to fetch metadata>' }}
                          </span>
                        </div>

                        <div>
                          <span class="text-caption text-grey-5">
                            Category: {{ shortenTokenId(props.row.token?.category || authkeyCategory) }}
                          </span>
                        </div>
                        <div class="flex items-center q-gutter-x-xs q-mt-xs">
                          <q-badge v-if="getTokenType(props.row) === 'mixed'" color="dark" text-color="orange-4"
                            class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                            <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                            {{ t('authguard.badgeMixed') }}
                          </q-badge>
                          <q-badge v-else-if="getTokenType(props.row) === 'nft'" color="dark" text-color="blue-6"
                            class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                            <q-icon name="token" size="10px" class="q-mr-xs" />
                            {{ t('authguard.badgeNft') }}
                          </q-badge>
                          <q-badge v-else color="dark" text-color="green-4"
                            class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                            <q-icon name="money" size="10px" class="q-mr-xs" />
                            {{ t('authguard.badgeFungible') }}
                          </q-badge>

                          <q-badge v-if="props.row.token?.nft?.capability === 'minting'" color="dark"
                            text-color="purple-4"
                            class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                            <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                            {{ t('authguard.badgeMinting') }}
                          </q-badge>
                          <q-badge v-else-if="props.row.token?.nft?.capability === 'mutable'" color="dark"
                            text-color="teal-10"
                            class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                            <q-icon name="published_with_changes" size="10px" class="q-mr-xs" />
                            {{ t('authguard.badgeMutable') }}
                          </q-badge>
                          <q-badge v-else-if="props.row.token?.nft?.capability === 'none'" color="dark"
                            text-color="grey-6"
                            class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge border-grey-8"
                            dense>
                            <q-icon name="lock_outline" size="10px" class="q-mr-xs" />
                            {{ t('authguard.badgeImmutable') }}
                          </q-badge>
                        </div>
                      </div>
                    </div>
                  </q-td>
                </template>

                <template v-slot:body-cell-utxoRef="props">
                  <q-td :props="props">
                    <span class="text-caption text-grey-5 text-mono">{{ props.row.txid?.slice(0, 8) }}...:{{
                      props.row.vout }}</span>
                  </q-td>
                </template>

                <template v-slot:body-cell-actions="props">
                  <q-td :props="props" class="text-right">
                    <q-btn flat dense icon="lock_open" :label="t('button.unlock')" size="sm" color="grey-4"
                      class="q-mr-sm" @click="confirmUnguard(props.row)" />
                    <q-btn flat dense icon="mdi-fire" :label="t('button.burn')" size="sm" color="orange"
                      @click="confirmBurn(props.row)" />
                  </q-td>
                </template>
              </q-table>
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <UnguardAuthheadDialog v-model="showUnguardDialog" :icon="identitySnapshot?.uris?.icon"
      :symbol="identitySnapshot?.token?.symbol" :category="authkeyCategory" @cancel="selectedRow = null"
      @unguard="onUnguardDialogConfirm" />

    <BurnAuthheadDialog v-model="showBurnDialog" :icon="identitySnapshot?.uris?.icon"
      :symbol="identitySnapshot?.token?.symbol" :category="authkeyCategory"
      :amount="selectedRow?.token?.amount?.toString()" :capability="selectedRow?.token?.nft?.capability"
      @cancel="selectedRow = null" @burn="onBurnDialogConfirm" />
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthguardStore } from 'src/stores/authguard'
import { useRegistryStore } from 'src/stores/registry'
import { createAuthguardContract } from 'src/core/authguard/create-authguard-contract'
import { unguardAuthhead, burnAuthhead, transferNfts } from 'src/core/transaction'
import { filterAuthKeys } from 'src/core/authguard'
import { shortenTokenId, getTokenType, shortenCashAddress } from 'src/core/utils'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet'
import { useCancelableLoadingDialog } from 'src/composables/useCancelableLoadingDialog'
import { broadcastTransaction } from 'src/services/transaction'
import { TASK_BROADCASTING, TASK_INPUTS_CHECK, TASK_PREPARE_TX, TASK_REFRESH_UTXOS, TASK_WAIT_FOR_SIG, TASK_WAITING_PROPAGATION, txTaskList, updateTxTaskLabel } from 'src/utils'
import { useQuasar } from 'quasar'
import { decodeCashAddress } from '@bitauth/libauth'
import { BaseWallet, NetworkType } from 'mainnet-js-v3'
import CopyText from 'components/CopyText.vue'
import UnguardAuthheadDialog from 'src/components/dialogs/UnguardAuthheadDialog.vue'
import BurnAuthheadDialog from 'src/components/dialogs/BurnAuthheadDialog.vue'
import AuthKeyTransferDialog from 'src/components/dialogs/AuthKeyTransferDialog.vue'
import PromptDialog from 'src/components/dialogs/PromptDialog.vue'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import type { DecoratedUtxo } from 'src/core/types'
import type { QTableColumn } from 'quasar'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const { t } = useI18n()
const { wallet, manager } = useWizardConnectWallet()
const authguardStore = useAuthguardStore()
const registryStore = useRegistryStore()
const { activeAuthhead } = storeToRefs(authguardStore)
const { startLoader, updateStep, stopLoader, getSignal } = useCancelableLoadingDialog()

const vaultUtxos = ref<any[]>([])
const loading = ref(false)
const vaultAddress = ref('')
const authkeyCategory = ref('')
const identitySnapshot = ref<any>(null)
const showUnguardDialog = ref(false)
const showBurnDialog = ref(false)
const selectedRow = ref<any>(null)

const columns: QTableColumn[] = [
  {
    name: 'token',
    label: 'Auth UTXO',
    field: (row) => row.token?.category,
    align: 'left',
    sortable: true
  },
  {
    name: 'actions',
    label: '',
    field: 'actions',
    align: 'right'
  }
]

const loadAuthguardUtxos = async (a: DecoratedUtxo) => {
  const category = a.authkey!.token!.category
  authkeyCategory.value = category
  identitySnapshot.value = a.identitySnapshot || null

  const contract = createAuthguardContract({
    authkeyTokenId: category,
    network: import.meta.env.VITE_BCH_NETWORK as any
  })
  vaultAddress.value = contract.tokenAddress

  const utxos: any[] = await contract.getUtxos()
  vaultUtxos.value = utxos.map(u => ({
    ...u,
    address: contract.address,
    identitySnapshot: a.identitySnapshot,
  }))
}

const confirmUnguard = (row: any) => {
  selectedRow.value = row
  showUnguardDialog.value = true
}

const confirmBurn = (row: any) => {
  selectedRow.value = row
  showBurnDialog.value = true
}

const onUnguardDialogConfirm = () => {
  if (selectedRow.value) {
    handleUnguard(selectedRow.value)
  }
  selectedRow.value = null
}

const onBurnDialogConfirm = () => {
  if (selectedRow.value) {
    handleBurn(selectedRow.value)
  }
  selectedRow.value = null
}

const handleUnguard = async (row: any) => {
  const a = activeAuthhead.value
  if (!a?.authkey) {
    $q.notify({ type: 'negative', message: t('info.authkeyNotAvailable') })
    return
  }

  const funderUtxos = (wallet.value?.utxos || []).filter((u: any) => !u.token)
  if (funderUtxos.length === 0) {
    $q.notify({ type: 'negative', message: t('info.insufficientBchBalance') })
    return
  }

  startLoader(txTaskList, () => {
    $q.notify({ type: 'warning', message: t('info.cancelled') })
  })

  updateStep(TASK_INPUTS_CHECK, 'done')
  updateStep(TASK_PREPARE_TX, 'running')

  try {
    const ownerAddress = wallet.value!.getTokenDepositAddress(0)
    const signRequest = unguardAuthhead({
      authheadUtxo: row,
      authkeyUtxo: a.authkey,
      funderUtxos: funderUtxos as any,
      recipientAddress: ownerAddress,
      network: import.meta.env.VITE_BCH_NETWORK as any
    })

    updateStep(TASK_PREPARE_TX, 'done')
    updateStep(TASK_WAIT_FOR_SIG, 'running')

    const response = await manager.value!.signTransaction(signRequest, { signal: getSignal() })

    updateStep(TASK_WAIT_FOR_SIG, 'done')
    updateStep(TASK_BROADCASTING, 'running')

    const [broadcastError, txid] = await broadcastTransaction({
      transactionHex: response.signedTransaction,
      network: import.meta.env.VITE_BCH_NETWORK,
      onProgress: (progress: string) => {
        const newLabel = updateTxTaskLabel({ txTaskList, taskId: TASK_BROADCASTING, newTaskLabel: progress })
        updateStep(TASK_BROADCASTING, 'running', newLabel)
      }
    })

    if (broadcastError) {
      updateStep(TASK_BROADCASTING, 'failed')
      throw broadcastError
    }

    updateStep(TASK_BROADCASTING, 'done')
    updateStep(TASK_WAITING_PROPAGATION, 'running')

    const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
    await new BaseWallet(networkType).waitForTransaction({ txHash: txid })

    updateStep(TASK_WAITING_PROPAGATION, 'done')
    updateStep(TASK_REFRESH_UTXOS, 'running')

    await loadAuthguardUtxos(a)

    updateStep(TASK_REFRESH_UTXOS, 'done')
    stopLoader(1000)

    $q.dialog({
      component: TransactionStatusDialog,
      componentProps: {
        statusType: 'success',
        statusText: t('success.authheadRelease'),
        txid
      }
    })
  } catch (error: any) {
    stopLoader(3000)
    if (error?.name === 'AbortError') return
    console.log('Unguard error', error)
    $q.notify({ type: 'negative', message: error.message || t('error.authheadRelease') })
  }
}

const handleBurn = async (row: any) => {
  const a = activeAuthhead.value
  if (!a?.authkey) {
    $q.notify({ type: 'negative', message: t('info.authkeyNotAvailable') })
    return
  }

  const funderUtxos = (wallet.value?.utxos || []).filter((u: any) => !u.token)
  if (funderUtxos.length === 0) {
    $q.notify({ type: 'negative', message: t('info.insufficientBchBalance') })
    return
  }

  startLoader(txTaskList, () => {
    $q.notify({ type: 'warning', message: t('info.cancelled') })
  })

  updateStep(TASK_INPUTS_CHECK, 'done')
  updateStep(TASK_PREPARE_TX, 'running')

  try {
    const sampleAddress = wallet.value!.getTokenDepositAddress(0)
    const decodedAddress = decodeCashAddress(sampleAddress)
    if (typeof decodedAddress === 'string') {
      throw new Error(decodedAddress)
    }
    const burnAddress = `${decodedAddress.prefix}:${import.meta.env.VITE_BURN_ADDRESS}`

    const signRequest = burnAuthhead({
      authheadUtxo: row,
      authkeyUtxo: a.authkey,
      funderUtxos: funderUtxos as any,
      burnAddress,
      network: import.meta.env.VITE_BCH_NETWORK as any
    })

    updateStep(TASK_PREPARE_TX, 'done')
    updateStep(TASK_WAIT_FOR_SIG, 'running')

    const response = await manager.value!.signTransaction(signRequest, { signal: getSignal() })

    updateStep(TASK_WAIT_FOR_SIG, 'done')
    updateStep(TASK_BROADCASTING, 'running')

    const [broadcastError, txid] = await broadcastTransaction({
      transactionHex: response.signedTransaction,
      network: import.meta.env.VITE_BCH_NETWORK,
      onProgress: (progress: string) => {
        const newLabel = updateTxTaskLabel({ txTaskList, taskId: TASK_BROADCASTING, newTaskLabel: progress })
        updateStep(TASK_BROADCASTING, 'running', newLabel)
      }
    })

    if (broadcastError) {
      updateStep(TASK_BROADCASTING, 'failed')
      throw broadcastError
    }

    updateStep(TASK_BROADCASTING, 'done')
    updateStep(TASK_WAITING_PROPAGATION, 'running')

    const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
    await new BaseWallet(networkType).waitForTransaction({ txHash: txid })

    updateStep(TASK_WAITING_PROPAGATION, 'done')
    updateStep(TASK_REFRESH_UTXOS, 'running')

    await loadAuthguardUtxos(a)

    updateStep(TASK_REFRESH_UTXOS, 'done')
    stopLoader(1000)

    $q.dialog({
      component: TransactionStatusDialog,
      componentProps: {
        statusType: 'success',
        statusText: t('success.authheadBurn'),
        txid
      }
    })
  } catch (error: any) {
    stopLoader(3000)
    if (error?.name === 'AbortError') return
    console.log('Burn error', error)
    $q.notify({ type: 'negative', message: error.message || t('error.authheadBurn') })
  }
}

/** Vault ownership *is* the AuthKey NFT, so handing over the vault is a plain wallet transfer. */
const findAuthkeyUtxo = async () => {
  const utxos = await wallet.value!.getUtxos()
  return (filterAuthKeys(utxos) as any[]).find((u) => u.token?.category === authkeyCategory.value)
}

const onTransferOwnershipClick = () => {
  $q.dialog({
    component: PromptDialog,
    componentProps: {
      title: t('authguard.transferOwnership.promptTitle'),
      icon: 'key',
      iconColor: 'warning',
      message: t('authguard.transferOwnership.promptMessage', { count: vaultUtxos.value.length }),
      expectedPromptOkResponse: t('authguard.transferOwnership.expected'),
      inputLabel: t('authguard.transferOwnership.inputLabel'),
      inputPlaceholder: t('authguard.transferOwnership.inputPlaceholder'),
      okLabel: t('authguard.transferOwnership.confirm'),
      okColor: 'warning',
      cancelLabel: t('button.cancel'),
    },
    focus: 'none',
  }).onOk(() => openAuthkeyTransferDialog())
}

const openAuthkeyTransferDialog = async () => {
  let authkeyUtxo
  try {
    authkeyUtxo = await findAuthkeyUtxo()
  } catch (error: any) {
    $q.notify({ type: 'Error', message: error.message })
    return
  }

  if (!authkeyUtxo) {
    $q.notify({ type: 'negative', message: t('authguard.transferOwnership.authKeyNotFound') })
    return
  }

  $q.dialog({
    component: AuthKeyTransferDialog,
    componentProps: {
      category: authkeyCategory.value,
      commitment: authkeyUtxo.token?.nft?.commitment,
      identitySnapshot: identitySnapshot.value,
      lockedCount: vaultUtxos.value.length,
      selfAddress: wallet.value?.getTokenDepositAddress(0),
    },
    focus: 'none',
  }).onOk(({ recipient }: { recipient: string }) => transferVaultOwnership(authkeyUtxo, recipient))
}

const transferVaultOwnership = async (authkeyUtxo: any, recipient: string) => {
  startLoader(txTaskList, () => {
    $q.notify({ type: 'warning', message: t('info.cancelled') })
  })

  updateStep(TASK_INPUTS_CHECK, 'done')
  updateStep(TASK_PREPARE_TX, 'running')

  try {
    const signRequest = transferNfts({
      nfts: [authkeyUtxo],
      recipientAddress: recipient,
      changeAddress: wallet.value!.getTokenDepositAddress(0),
      walletUtxos: (wallet.value!.utxos || []) as any,
      network: import.meta.env.VITE_BCH_NETWORK as any,
      userPrompt: t('authguard.transferOwnership.walletPrompt'),
    })

    updateStep(TASK_PREPARE_TX, 'done')
    updateStep(TASK_WAIT_FOR_SIG, 'running')

    const response = await manager.value!.signTransaction(signRequest, { signal: getSignal() })

    updateStep(TASK_WAIT_FOR_SIG, 'done')
    updateStep(TASK_BROADCASTING, 'running')

    const [broadcastError, txid] = await broadcastTransaction({
      transactionHex: response.signedTransaction,
      network: import.meta.env.VITE_BCH_NETWORK,
      onProgress: (progress: string) => {
        const newLabel = updateTxTaskLabel({ txTaskList, taskId: TASK_BROADCASTING, newTaskLabel: progress })
        updateStep(TASK_BROADCASTING, 'running', newLabel)
      },
    })

    if (broadcastError) {
      updateStep(TASK_BROADCASTING, 'failed')
      throw broadcastError
    }

    updateStep(TASK_BROADCASTING, 'done')
    updateStep(TASK_WAITING_PROPAGATION, 'running')

    const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
    await new BaseWallet(networkType).waitForTransaction({ txHash: txid })

    updateStep(TASK_WAITING_PROPAGATION, 'done')
    updateStep(TASK_REFRESH_UTXOS, 'running')

    await wallet.value?.sync()
    await authguardStore.loadAuthkeys(wallet.value, true, true)

    updateStep(TASK_REFRESH_UTXOS, 'done')
    stopLoader(1000)

    $q.dialog({
      component: TransactionStatusDialog,
      componentProps: {
        statusType: 'success',
        statusText: t('success.vaultOwnershipTransferred'),
        txid,
      },
    }).onOk(() => {
      // The vault answers to somebody else now.
      authguardStore.setActiveAuthhead(null as any)
      router.push({ name: 'authkeys' })
    })
  } catch (error: any) {
    stopLoader(3000)
    if (error?.name === 'AbortError') return
    console.log('Transfer vault ownership error', error)
    $q.notify({ type: 'negative', message: error.message || t('error.vaultOwnershipTransfer') })
  }
}

onMounted(async () => {
  const a = activeAuthhead.value
  if (a?.authkey) {
    loading.value = true
    try {
      await loadAuthguardUtxos(a)
    } catch (e) {
      console.log('Failed to load authguard UTXOs', e)
    } finally {
      loading.value = false
    }
    return
  }

  const category = route.params.authkeyCategory as string
  const authheadRef = route.query.authhead as string
  if (!category || !authheadRef) {
    router.back()
    return
  }

  authkeyCategory.value = category
  loading.value = true

  try {
    const contract = createAuthguardContract({
      authkeyTokenId: category,
      network: import.meta.env.VITE_BCH_NETWORK as any
    })
    vaultAddress.value = contract.address

    const utxos: any[] = await contract.getUtxos()
    const [txid, voutStr] = authheadRef.split(':')
    const authhead = utxos.find((u: any) => u.txid === txid && u.vout === Number(voutStr))
    if (!authhead) {
      router.back()
      return
    }

    const snap = await registryStore.fetchIdentitySnapshot(category)
    identitySnapshot.value = snap || null

    const decorated: any = {
      ...authhead,
      authkey: { token: { category } },
      identitySnapshot: snap || undefined,
      address: contract.address,
      isAuthhead: true,
    }
    authguardStore.setActiveAuthhead(decorated)

    vaultUtxos.value = utxos.map(u => ({
      ...u,
      address: contract.address,
      identitySnapshot: snap || undefined,
    }))
  } catch (e) {
    console.log('Failed to resolve authguard', e)
    router.back()
  } finally {
    loading.value = false
  }
})

onBeforeRouteLeave((to) => {
  // Keep the active authhead when returning to the reserves view so it can
  // still render the locked/reserve UTXO. Clear it when leaving elsewhere.
  if (to.name !== 'view-authhead') {
    authguardStore.setActiveAuthhead(null as any)
  }
})
</script>

<style scoped>
.content-container {
  max-width: 80rem;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  box-sizing: border-box;
}

.border-radius-8 {
  border-radius: 8px;
}

.border-radius-12 {
  border-radius: 12px;
}

.token-reserves-table {
  border-color: #2c2c2c !important;
}

.token-reserves-table :deep(.q-table__card) {
  box-shadow: none;
}

.token-reserves-table :deep(thead tr th) {
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 10px;
  color: #888888;
  background-color: #1e1e1e;
  border-bottom: 1px solid #2c2c2c;
}

.token-reserves-table :deep(tbody tr:hover) {
  background-color: #1e1e1e !important;
}

.text-mono {
  font-family: 'Courier New', Courier, monospace;
}

.font-8 {
  font-size: 0.75em;
}

.styled-capability-badge {
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.border-grey-8 {
  border: 1px solid #424242;
}

.table-scroll-wrapper {
  display: block;
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.table-scroll-wrapper::-webkit-scrollbar {
  height: 4px;
}

.table-scroll-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.table-scroll-wrapper::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}
</style>
