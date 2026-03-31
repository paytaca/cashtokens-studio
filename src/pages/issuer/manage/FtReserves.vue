<template>
  <q-page :class="$q.screen.gt.xs ? 'q-ma-sm' : 'q-ma-xs'">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center q-mb-sm">
          FT Reserve Supplies
        </h5>
        <q-banner inline-actions rounded class="bg-grey-10 text-grey-6 q-mb-md"
          style="border: 1px solid rgba(255,255,255,0.1)">
          <template v-slot:avatar>
            <q-icon name="info" color="primary" />
          </template>
          <div class="text-body2 text-justify">
            <strong class="text-primary">FT Reserve Supplies</strong> are unissued tokens held by a contract (AuthGuard
            contract).
            Only the wallet with the corresponding contract key (AuthKey) can release/issue this funds.
          </div>
        </q-banner>
        <div>
          <q-table v-model:pagination="pagination" @request="onTableRequest" flat bordered
            :rows="ownedAuthHeads.results" color="warning" :loading="populatingTable"
            loading-label="Loading, please wait..." :columns="[
              {
                name: 'balance', label: 'Balance',
                field: r => r.token?.amount || 0,
                align: 'left',
                headerClasses: 'text-h5 text-bold'
              },
              {
                name: 'actions', label: '',
                field: r => '',
                align: 'center',
              }
            ]" :rows-per-page-options="rowsPerPageOptions" row-key="name" :visible-columns="visibleColumns"
            :dense="$q.screen.lt.sm">
            <template v-slot:body-cell-balance="value">
              <q-td>
                <div class="row justify-left items-center flex wrap q-gutter-sm">
                  <div class="col-auto">
                    <q-skeleton v-if="!!value.row.processing && populatingTable" type="circle" bordered></q-skeleton>
                    <div v-else>
                      <q-avatar v-if="value.row.identitySnapshot?.uris?.icon">
                        <q-img :src="ipfsToGatewayUrl(value.row.identitySnapshot.uris.icon)" />
                      </q-avatar>
                      <q-icon v-else name="token" size="xl" color="grey-8"></q-icon>
                    </div>
                  </div>
                  <div class="col text-wrap text-left" style="font-size: 1.2em; letter-spacing: 2px;">
                    <q-skeleton v-if="!!value.row.processing && populatingTable" bordered square></q-skeleton>

                    <div v-else>
                      <div style="font-variant-numeric: tabular-nums;" class="text-positive">
                        {{ formatBalance(value.row) }}
                      </div>
                      <div class="text-bold text-grey-4" style="letter-spacing: 3px; font-variant:unicase">
                        ({{ value.row.identitySnapshot?.token?.symbol }})
                      </div>
                    </div>
                  </div>

                  <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                    <q-skeleton v-if="!!value.row.processing && populatingTable" bordered square></q-skeleton>
                    <div v-else>
                      <div v-if="value.row.identitySnapshot?.token">
                        <div class="text-weight-thin text-caption text-grey-8">
                          Category: {{ shortenTokenId(value.row.identitySnapshot?.token?.category) }}
                          <CopyText :text="value.row.identitySnapshot?.token?.category" />
                        </div>
                        <div class="text-weight-thin text-caption text-grey-8">
                          Decimals: <span
                            :class="value.row.identitySnapshot?.token?.decimals ? 'text-warning' : 'text-grey-8'">{{
                              value.row.identitySnapshot?.token?.decimals }}</span>
                        </div>
                      </div>
                      <div v-else class="text-grey-8">
                        {{ '<metadata not found>' }}
                      </div>
                    </div>
                  </div>
                </div>
              </q-td>
            </template>
            <template v-slot:body-cell-actions="value">
              <q-td class="text-center">
                <div v-if="!!value.row.processing && populatingTable" class="flex justify-center q-gutter-x-lg">
                  <q-skeleton type="QToggle" bordered square></q-skeleton>
                  <q-skeleton type="QToggle" bordered square></q-skeleton>
                </div>
                <div v-else>
                  <q-btn icon="send" size="md" :label="$q.screen.xs ? '' : 'Issue Tokens'" text-color="primary" no-caps
                    @click.stop="() => openIssueFtDialog(value.row, value.row.identitySnapshot)"
                    :disable="!!value.row.processing">
                  </q-btn>
                  <q-btn icon="local_fire_department" size="md" :label="$q.screen.xs ? '' : 'Burn'" text-color="orange"
                    no-caps @click.stop="() => openBurnFtDialog(value.row, value.row.identitySnapshot)"
                    :disable="!!value.row.processing">
                  </q-btn>
                </div>
              </q-td>
            </template>
          </q-table>
        </div>
      </div>
    </div>
    <q-inner-loading :showing="!!progress" id="inner-loading" style="background-color:#0000002b">
      <q-spinner size="5em" color="warning" class="q-mb-lg"></q-spinner>
      <span class="bg-black q-py-sm q-px-md text-warning text-center" style="border-radius:10px">{{ progress
      }}</span>
    </q-inner-loading>
  </q-page>
</template>
<script setup lang="ts">
import { onMounted, ref, computed, inject, onBeforeUnmount, watch } from 'vue';
import { useMetadataStore } from 'src/stores/metadata'
import { useUser } from 'src/stores/user'
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, AuthchainIdentity, Watchtower } from 'src/apps'
import { PaginatedData, TransactionSigner } from 'src/apps/types';
import { IdentitySnapshot, UtxoI, Wallet } from 'mainnet-js';
import { EventBus, useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useEventBus } from 'src/composables'
import ftAmountFormatter from 'src/apps/utils/ftAmountFormatter'
import { ipfsToGatewayUrl, shortenAddress, shortenTokenId } from 'src/apps/utils'
import CopyText from 'src/components/CopyText.vue';
import FTBurnDialog from 'src/components/dialogs/FTBurnDialog.vue'
import FTIssuerDialog from 'src/components/dialogs/FTIssuerDialog.vue'
import { buildBurnFtReserveTx, buildIssueFtReserveTx, signTx } from 'src/apps/transactions'
import { broadcastTx } from 'src/apps/transactions/broadcastTx'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import BigNumber from 'bignumber.js';
import { nextTick } from 'process';
import txIsInMempool from 'src/apps/utils/txIsInMempool';
const $q = useQuasar()
const router = useRouter()
const metadataStore = useMetadataStore()
const user = useUser()
const { $ebus } = useEventBus()
const eventBus = inject<EventBus>('eventBus')
const populatingTable = ref<boolean>(false)
const progress = ref<string | boolean>()
const ownedAuthHeads = ref<PaginatedData>({
  count: 0,
  limit: 0,
  offset: 0,
  next: null,
  previous: null,
  results: []
})

const pagination = ref({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 12,
  rowsNumber: 12
})

const rowsPerPageOptions = computed(() => {
  return [12, 24, 36]
})


const visibleColumns = computed(() => {
  if ($q.screen.lt.sm) {
    return ['symbol', 'balance', 'actions']
  }
  return ['icon', 'symbol', 'tokenid', 'balance', 'decimals', 'actions']
})

const formatBalance = computed(() => {
  return (authchainIdentity: AuthchainIdentity) => {
    const [w, d] = ftAmountFormatter.toDecimal(
      authchainIdentity.token!.amount.toString(), authchainIdentity.identitySnapshot?.token?.decimals
    ).split('.')
    let b = w
    if (d && Number(d) > 0) {
      b = b + `.${d}`
    }
    b = b.includes('.') ? b.replace(/\B(?=(\d{3})+(?!\d).)/g, ",") : b.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return b
  }
})

const populateOwnedAuthHeads = async (wallet: Wallet, transactionSigner: TransactionSigner, populateSilently?: boolean) => {
  if (wallet) {
    if (!populateSilently) {
      populatingTable.value = true
    }
    const query = {
      limit: pagination.value.rowsPerPage,
      offset: (pagination.value.page - 1) * pagination.value.rowsPerPage,
      token_amount__gte: 1
    }

    // const resp = await (new Watchtower()).fetchAuthchainIdentities(wallet.getTokenDepositAddress(), query)
    // console.log('fetchAuthchainIdentities response', resp)
    const authchainIdentities = await user.fetchAuthchainIdentities(
      wallet.getTokenDepositAddress(),
      query,
      true
    ) as PaginatedData

    populatingTable.value = false
    if (authchainIdentities?.count > 0) {
      ownedAuthHeads.value = authchainIdentities
      pagination.value.rowsNumber = authchainIdentities.count
      ownedAuthHeads.value.results?.forEach(async (cashtoken, i) => {
        const authKeyUtxoClone = Object.assign({}, cashtoken.authKey)
        const authKey = new AuthKey({ ...authKeyUtxoClone, ownerWallet: user.wallet })
        const {
          txid,
          vout,
          satoshis,
          height,
          coinbase,
          token
        } = cashtoken
        ownedAuthHeads.value.results[i] = new AuthchainIdentity({ txid, vout, satoshis, height, coinbase, token, authKey: authKey, ownerWallet: wallet as Wallet }, transactionSigner)

        // await ownedAuthHeads.value.results[i].resolveIdentitySnapshot()
        if (token?.tokenId) {
          ownedAuthHeads.value.results[i].processing = 'Resolving identity snapshot'
          ownedAuthHeads.value.results[i].identitySnapshot = await metadataStore.resolveIdentitySnapshot(token.tokenId)
          ownedAuthHeads.value.results[i].processing = ''
        }
      })

    }

  }
}


const openBurnFtDialog = (v: AuthchainIdentity, identitySnapshot: IdentitySnapshot) => {
  const originalBalance = v.token?.amount
  $q.dialog({
    component: FTBurnDialog,
    componentProps: {
      token: v.token,
      identitySnapshot
    },
    focus: 'none'
  }).onOk(async (value: { amountToBurn: string, newBalance: string, decimals: number }) => {
    try {
      progress.value = 'Processing...'
      const amountToBurnRaw = (new BigNumber(value.amountToBurn).toFixed(value.decimals)).toString()
      const burnTx = await buildBurnFtReserveTx({
        authUtxo: v,
        authKey: v.authKey,
        amount: amountToBurnRaw.replace('.', ''),
        wallet: user.wallet
      })
      progress.value = 'Waiting for signature. Pls check your wallet!'
      const signingResult = await signTx({
        signer: user.transactionSigner!,
        decodedTx: burnTx.decoded, sourceOutputs: burnTx.sourceOutputs,
        prompt: `Burn ${value.amountToBurn} ${identitySnapshot?.token?.symbol || 'FTs'}`
      })

      if (signingResult?.signedTransaction) {
        progress.value = 'Submitting transaction, please wait...'
        const tx = await broadcastTx(signingResult)
        if (tx) {
          progress.value = 'Transaction submitted, awaiting propagation...'
          // await user.wallet?.waitForTransaction({ txHash: tx })
          await Promise.race([
            txIsInMempool({ txHash: tx, address: user.wallet!.getDepositAddress() }),
            user.wallet?.waitForTransaction({ txHash: tx })
          ])
          $ebus?.emit('transaction', {
            txid: tx,
            txType: 'ft-burn',
            timestamp: new Date().getTime(),
            successMsg: `${value.amountToBurn} ${identitySnapshot?.token?.symbol || 'FTs'} Burned!`
          })
          progress.value = false
          populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!, true)
          $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
              statusType: 'success',
              statusText: `${value.amountToBurn} ${identitySnapshot?.token?.symbol || 'FTs'} Burned!`,
              txid: tx
            }
          })
        }
      } else {
        progress.value = false
        v.token.amount = originalBalance
      }
    } catch (error) {
      $q.dialog({
        message: error?.toString(),
        ok: true,
        focus: 'ok',
        class: 'q-pa-lg'
      })
      v.token.amount = originalBalance
    } finally {
      progress.value = false
    }
  }).onCancel(() => {
    v.token.amount = originalBalance
  })
}

const openIssueFtDialog = (v: any, identitySnapshot: IdentitySnapshot) => {
  const originalBalance = v.token.amount
  $q.dialog({
    component: FTIssuerDialog,
    componentProps: {
      token: v.token,
      identitySnapshot,
      wallet: user?.wallet
    },
    focus: 'none'
  }).onOk(async (value: { amountToSend: string, newBalance: string, decimals: number, recipient: string }) => {
    try {
      progress.value = 'Processing...'
      const amountToSendRaw = (new BigNumber(value.amountToSend).toFixed(value.decimals)).toString()
      const burnTx = await buildIssueFtReserveTx({
        authUtxo: v,
        authKey: v.authKey,
        amount: amountToSendRaw.replace('.', ''),
        recipient: value.recipient,
        wallet: user.wallet
      })
      progress.value = 'Waiting for signature. Pls check your wallet!'
      const signingResult = await signTx({
        signer: user.transactionSigner!,
        decodedTx: burnTx.decoded, sourceOutputs: burnTx.sourceOutputs,
        prompt: `Issue ${value.amountToSend} ${identitySnapshot?.token?.symbol || 'FTs'} to ${shortenAddress(value.recipient)}`
      })

      if (signingResult && signingResult.walletType === 'p2shMultisig') {
        $ebus?.emit('transaction', {
          txid: signingResult.unsignedHash,
          unsignedHash: signingResult.unsignedHash,
          txType: 'ft-issuance',
          timestamp: new Date().getTime(),
          successMsg: signingResult.message,
          statusUrl: signingResult.statusUrl
        })

        await new Promise((resolve) => {
          $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
              statusType: 'pending',
              statusText: signingResult.message,
              statusUrl: signingResult.statusUrl,
              txid: null,

            }
          }).onOk(() => {
            resolve(true)

          }).onDismiss(() => {
            resolve(true)
          })
        })
        return router.push({ name: 'recent-transactions' })
      }

      if (signingResult?.signedTransaction) {
        progress.value = 'Submitting transaction, please wait...'
        const tx = await broadcastTx(signingResult)
        if (tx) {
          progress.value = 'Transaction submitted, awaiting propagation...'
          await user.wallet?.waitForTransaction({ txHash: tx })
          $ebus?.emit('transaction', {
            txid: tx,
            txType: 'ft-issuance',
            timestamp: new Date().getTime(),
            successMsg: `${value.amountToSend} ${identitySnapshot?.token?.symbol || 'FTs'} sent to ${shortenAddress(value.recipient)}!`
          })
          progress.value = false
          populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!, true)
          $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
              statusType: 'success',
              statusText: `${value.amountToSend} ${identitySnapshot?.token?.symbol || 'FTs'} sent to ${shortenAddress(value.recipient)}!`,
              txid: tx
            }
          })
        }
      } else {
        progress.value = false
        v.token.amount = originalBalance
      }
    } catch (error) {
      $q.dialog({
        message: error?.toString(),
        ok: true,
        focus: 'ok',
        class: 'q-pa-lg'
      })
      v.token.amount = originalBalance
    } finally {
      progress.value = false
    }


  }).onCancel(() => {
    v.token.amount = originalBalance
  })
}

watch(() => progress.value, async (v) => {
  if (v) {
    nextTick(() => {
      document.getElementById('inner-loading')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }
})

watch(() => user.wallet, async (wallet) => {
  if (wallet) {
    await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
  }
})

onMounted(async () => {
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
})

const onTableRequest = async (props: any) => {
  pagination.value = props.pagination
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
}

onBeforeUnmount(() => {
  eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
})

</script>
