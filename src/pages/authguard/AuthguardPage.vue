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
                <!-- <q-img v-if="identitySnapshot?.uris?.icon" :src="ipfsToGatewayUrl(identitySnapshot?.uris?.icon)!" />
                <q-img v-else :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${authkeyCategory}`" /> -->
                <q-icon name="mdi-safe-square-outline"></q-icon>
              </q-avatar>
              <div>
                <div class="text-h5 text-weight-bold text-white">{{ vaultHeading }}
                </div>

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
                  <q-icon name="mdi-safe-square-outline" color="warning"></q-icon>
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
                :loading="loading" row-key="txid">
                <template v-slot:top>
                  <div class="row items-center no-wrap q-gutter-x-sm">
                    <div class="text-h6">{{ t('authguard.vaultContents') }}</div>
                    <q-badge color="warning" text-color="dark" class="text-weight-bold">{{ vaultUtxos.length
                      }}</q-badge>
                  </div>
                </template>

                <template v-slot:body-cell-token="props">
                  <q-td :props="props">
                    <div class="flex items-center no-wrap q-gutter-x-md">
                      <q-avatar size="36px" class="bg-grey-9 border-radius-8 shadow-1">
                        <q-img v-if="props.row.identitySnapshot?.uris?.icon"
                          :src="ipfsToGatewayUrl(props.row.identitySnapshot.uris.icon)!" fit="cover" />
                        <q-img v-else
                          :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${props.row.token?.commitment || authkeyCategory}`"
                          fit="cover">
                          <q-tooltip class="bg-grey-9 text-caption text-grey-4">{{ t('authguard.noIconTooltip')
                          }}</q-tooltip>
                        </q-img>
                      </q-avatar>
                      <div>
                        <div class="text-caption text-grey-6 flex items-center no-wrap">
                          {{ t('authguard.utxo') }}<q-icon name="mdi-identifier" size="sm"></q-icon> = {{
                            shortenTokenId(props.row.txid)
                          }}:{{
                            props.row.vout
                          }}
                        </div>
                        <div class="flex items-center q-gutter-x-xs">
                          <span class="text-caption text-weight-medium text-primary">
                            {{ t('authguard.symbol') }}:
                            {{ props.row.identitySnapshot?.token?.symbol || t('authguard.noMetadata') }}
                          </span>
                        </div>

                        <div>
                          <span class="text-caption text-grey-5">
                            {{ t('authguard.category') }}:
                            {{ shortenTokenId(props.row.token?.category || authkeyCategory) }}
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
                        <div v-if="$q.screen.lt.sm" class="actions">
                          <q-btn flat icon="lock_open" :label="t('button.unlock')" dense color="negative"
                            class="q-mr-sm" @click="confirmUnguard(props.row)" size="sm" />
                          <q-btn flat icon="mdi-fire" :label="t('button.burn')" dense color="orange"
                            @click="confirmBurn(props.row)" size="sm" />
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
                  <q-td v-if="$q.screen.gt.xs" :props="props" class="text-right">
                    <q-btn flat icon="mdi-lock-open-variant" :label="t('button.unlock')" color="negative"
                      class="q-mr-sm" @click="confirmUnguard(props.row)" />
                    <q-btn flat icon="mdi-fire" :label="t('button.burn')" color="orange"
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
      :default-destination-address="defaultUnguardRecipientAddress" @unguard="onUnguardDialogConfirm" />

    <BurnAuthheadDialog v-model="showBurnDialog" :icon="identitySnapshot?.uris?.icon"
      :symbol="identitySnapshot?.token?.symbol" :category="authkeyCategory"
      :amount="selectedRow?.token?.amount?.toString()" :decimals="selectedRow?.identitySnapshot?.token?.decimals"
      :capability="selectedRow?.token?.nft?.capability" @cancel="selectedRow = null" @burn="onBurnDialogConfirm" />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, triggerRef } from 'vue'
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
import { db } from 'src/core/client-db'
import { getRegistryWorker } from 'src/workers'
import { useWalletSigner } from 'src/composables/useWalletSigner'
import { useCancelableLoadingDialog } from 'src/composables/useCancelableLoadingDialog'
import { broadcastTransaction } from 'src/services/transaction'
import { TASK_BROADCASTING, TASK_INPUTS_CHECK, TASK_PREPARE_TX, TASK_REFRESH_UTXOS, TASK_WAIT_FOR_SIG, TASK_WAITING_PROPAGATION, txTaskList, updateTxTaskLabel } from 'src/utils'
import { useQuasar } from 'quasar'
import { BaseWallet, NetworkType } from 'mainnet-js'
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
const { wallet, signTransaction } = useWalletSigner()
const authguardStore = useAuthguardStore()
const registryStore = useRegistryStore()
const { activeAuthhead, authheads } = storeToRefs(authguardStore)
const { startLoader, updateStep, stopLoader, getSignal } = useCancelableLoadingDialog()

const vaultUtxos = ref<any[]>([])
const loading = ref(false)
const vaultAddress = ref('')
const authkeyCategory = ref('')
const identitySnapshot = ref<any>(null)
const showUnguardDialog = ref(false)
const showBurnDialog = ref(false)
const selectedRow = ref<any>(null)
const defaultUnguardRecipientAddress = computed(() => {
  return wallet.value?.getTokenDepositAddress(0)
})

/**
 * A vault locking a single token is effectively that token's vault, so its symbol is meaningful.
 * Once it holds several, only the generic label is honest.
 */
const vaultHeading = computed(() => {
  if (vaultUtxos.value.length !== 1) return t('authguard.vault')
  return identitySnapshot.value?.token?.symbol || identitySnapshot.value?.name || t('authguard.vault')
})

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

/**
 * Registry metadata for a category. The authguard store already decorates its authheads with the
 * registry snapshots — the same data the managed and collected token pages render from — so prefer
 * that source and only reach for a registry lookup when it comes up empty.
 */
const resolveSnapshot = async (category?: string) => {
  if (!category) return undefined

  const decorated = authheads.value.find(
    (a) => a.token?.category === category || a.identitySnapshot?.token?.category === category
  )
  if (decorated?.identitySnapshot) return decorated.identitySnapshot

  try {
    return await registryStore.fetchIdentitySnapshot(category)
  } catch (error) {
    return undefined
  }
}

/**
 * Vault table rows. Each carries its own token's metadata where we can resolve it — a vault can lock
 * more than one category — falling back to the vault identity's snapshot.
 */
const buildVaultRows = async (utxos: any[], contract: { address: string }) => {
  const snapshots = new Map<string, any>()
  await Promise.all(
    utxos.map(async (u) => {
      const rowCategory = u.token?.category
      if (!rowCategory || snapshots.has(rowCategory)) return
      snapshots.set(rowCategory, await resolveSnapshot(rowCategory))
    })
  )
  return utxos.map((u) => ({
    ...u,
    address: contract.address,
    identitySnapshot: snapshots.get(u.token?.category) ?? identitySnapshot.value,
  }))
}

const loadAuthguardUtxos = async (a: DecoratedUtxo) => {
  const category = a.authkey!.token!.category
  authkeyCategory.value = category

  const contract = createAuthguardContract({
    authkeyTokenId: category,
    network: import.meta.env.VITE_BCH_NETWORK as any
  })
  vaultAddress.value = contract.tokenAddress

  identitySnapshot.value = a.identitySnapshot ?? (await resolveSnapshot(category)) ?? null

  const utxos: any[] = await contract.getUtxos()
  vaultUtxos.value = await buildVaultRows(utxos, contract)
}

const confirmUnguard = (row: any) => {
  selectedRow.value = row
  showUnguardDialog.value = true
}

const confirmBurn = (row: any) => {
  selectedRow.value = row
  showBurnDialog.value = true
}

const onUnguardDialogConfirm = (finalDestinationAddress: string) => {
  if (selectedRow.value) {
    handleUnguard(selectedRow.value, finalDestinationAddress)
  }
  selectedRow.value = null
}

const onBurnDialogConfirm = () => {
  if (selectedRow.value) {
    handleBurn(selectedRow.value)
  }
  selectedRow.value = null
}

const handleUnguard = async (row: any, finalDestinationAddress: string) => {
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
    // const ownerAddress = wallet.value!.getTokenDepositAddress(0)
    const ownerAddress = finalDestinationAddress
    const signRequest = unguardAuthhead({
      authheadUtxo: row,
      authkeyUtxo: a.authkey,
      funderUtxos: funderUtxos as any,
      recipientAddress: ownerAddress as string,
      network: import.meta.env.VITE_BCH_NETWORK as any
    })

    updateStep(TASK_PREPARE_TX, 'done')
    updateStep(TASK_WAIT_FOR_SIG, 'running')

    const response = await signTransaction(signRequest, { signal: getSignal() })

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
    triggerRef(wallet);
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
    $q.notify({ type: 'negative', message: error.message || t('error.authheadRelease') })
  }
}

const handleBurn = async (row: any) => {
  const a = activeAuthhead.value
  if (!a?.authkey) {
    $q.notify({ type: 'negative', message: t('info.authkeyNotAvailable') })
    return
  }

  startLoader(txTaskList, () => {
    $q.notify({ type: 'warning', message: t('info.cancelled') })
  })

  updateStep(TASK_INPUTS_CHECK, 'done')

  try {

    updateStep(TASK_PREPARE_TX, 'running', t('info.uploadingRegistryToIpfs'))

    // Burning is a final registry publication: the publication data-carrier becomes the identity
    // output (CHIP-BCMR's burned marker), so the same revision is published with only its status
    // changed — the worker bumps the patch and stamps latestRevision.
    // The identity being burned is the token the vault holds, so the registry authbase is that
    // token's category. authkeyCategory is the AuthKey NFT in the wallet and only derives the
    // contract address.
    const authbase = row.token?.category
    if (!authbase) {
      throw new Error(t('authguard.burnNeedsRegistry'))
    }

    const registryRecord = await db.registry.where('authbase').equals(authbase).first()
    const revisionTimestamps = registryRecord?.registry?.identities?.[authbase]
    if (!registryRecord?.contentHash || !revisionTimestamps?.length) {
      throw new Error(t('authguard.burnNeedsRegistry'))
    }

    const { contentHash } = registryRecord
    const timestamp = [...revisionTimestamps].sort((x, y) => y.localeCompare(x))[0]!

    // Write the status into the snapshot row the bump reads, exactly like a metadata modify does.
    const existingRecord = await db.identitySnapshot
      .where('[contentHash+authbase+timestamp]')
      .equals([contentHash, authbase, timestamp] as [string, string, string])
      .first()
    const burnedSnapshot = {
      ...(existingRecord?.identitySnapshot ?? identitySnapshot.value),
      status: 'burned'
    }
    if (existingRecord?.id) {
      await db.identitySnapshot
        .where('id')
        .equals(existingRecord.id)
        .modify({ identitySnapshot: burnedSnapshot, status: 'modified' })
    } else {
      await db.identitySnapshot.add({
        contentHash,
        authbase,
        timestamp,
        category: authbase,
        registryIdentity: registryRecord.registryIdentity,
        identitySnapshot: burnedSnapshot,
        nftTypeKeys: [],
        status: 'modified'
      })
    }

    const publication = await getRegistryWorker().bumpRegistry({
      originalContentHash: contentHash,
      bumpType: 'patch',
      targetIdentity: { authbase, timestamp }
    })
    if (!publication) {
      throw new Error(t('authguard.burnPublicationFailed'))
    }

    const signRequest = burnAuthhead({
      authheadUtxo: row,
      authkeyUtxo: a.authkey,
      registryPublicationData: {
        contentHash: publication.contentHash,
        uris: publication.uris
      },
      changeAddress: wallet.value!.getTokenDepositAddress(0),
      network: import.meta.env.VITE_BCH_NETWORK as any,
      userPrompt: t('authguard.burnTokenIdentity')
    })

    updateStep(TASK_PREPARE_TX, 'done')
    updateStep(TASK_WAIT_FOR_SIG, 'running')

    const response = await signTransaction(signRequest, { signal: getSignal() })

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
    }).onOk(() => {
      // The identity output is gone: the vault no longer has anything to guard.
      authguardStore.setActiveAuthhead(null as any)
      router.push({ name: 'authkeys' })
    })
  } catch (error: any) {
    stopLoader(3000)
    if (error?.name === 'AbortError') return
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

    const response = await signTransaction(signRequest, { signal: getSignal() })

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

    const snap = await resolveSnapshot(category)
    identitySnapshot.value = snap || null

    const decorated: any = {
      ...authhead,
      authkey: { token: { category } },
      identitySnapshot: snap || undefined,
      address: contract.address,
      isAuthhead: true,
    }
    authguardStore.setActiveAuthhead(decorated)

    vaultUtxos.value = await buildVaultRows(utxos, contract)
  } catch (e) {
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
