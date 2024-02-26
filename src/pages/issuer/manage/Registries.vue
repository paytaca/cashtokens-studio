<template>
  <q-page class="q-ma-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          Metadata Registries
        </h5>
        <div>
          <q-table v-model:pagination="pagination" @row-click="onRowClicked" @request="onTableRequest" flat bordered
            loading-label="Loading, please wait..." :rows="ownedAuthHeads.results" :loading="populatingTable" :columns="[
              {
                name: 'icon', label: 'Icon',
                field: r => r.identitySnapshot?.uris?.icon || '<not found>',
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },
              {
                name: 'symbol', label: 'Symbol',
                field: r => r.identitySnapshot?.token?.symbol || '<metadata not found>',
                align: 'center',
                headerStyle: 'padding: 1.5em',
                style: 'font-size: 1em;font-weight: bold',
                classes: 'ellipsis'
              },
              {
                name: 'tokenid', label: 'Category',
                field: r => r.identitySnapshot?.token?.category || '<metadata not found>',
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },
              {
                name: 'actions', label: 'Actions',
                field: r => '',
                align: 'center',
                headerStyle: 'padding: 1.5em'

              }
            ]" :rows-per-page-options="rowsPerPageOptions" row-key="name" :visible-columns="visibleColumns">

            <template v-slot:body-cell-icon="value">
              <q-td class="text-center">
                <div v-if="!!value.row.processing" class="flex justify-center">
                  <q-skeleton type="circle" bordered></q-skeleton>
                </div>
                <div v-else>
                  <q-avatar v-if="value.row.identitySnapshot?.uris?.icon">
                    <q-img :src="value.row.identitySnapshot.uris.icon" />
                  </q-avatar>
                  <q-icon v-else name="token" size="xl" color="grey-8"></q-icon>
                </div>
              </q-td>
            </template>
            <template v-slot:body-cell-symbol="value">
              <q-td class="text-center">
                <q-skeleton v-if="!!value.row.processing" bordered square></q-skeleton>
                <div v-else>
                  <span v-if="value.row.identitySnapshot?.token?.symbol" class="text-primary text-bold text-h6">
                    <TokenSymbol :symbol="value.row.identitySnapshot.token.symbol" />
                  </span>
                  <span v-else class="text-grey-8">{{ '<metadata not found>' }}</span>
                </div>
              </q-td>
            </template>
            <template v-slot:body-cell-tokenid="value">
              <q-td class="text-center">
                <q-skeleton v-if="!!value.row.processing" bordered square></q-skeleton>
                <div v-else>
                  <TokenCategory v-if="value.row.identitySnapshot?.token?.category"
                    :tokenId="value.row.identitySnapshot.token.category" />
                  <span v-else class="text-grey-8">{{ '<metadata not found>' }}</span>
                </div>
              </q-td>
            </template>
            <template v-slot:body-cell-actions="value">
              <q-td class="text-center">
                <div v-if="!!value.row.processing" class="flex justify-center">
                  <q-skeleton type="QToggle" bordered square></q-skeleton>
                </div>

                <div v-else>
                  <q-btn id="authchain-action-buttons" text-color="grey-6" icon="auto_stories" size="md" round flat dense
                    @click.stop="(e) => { e.preventDefault(); onRowClicked(e, value.row) }">
                    <q-tooltip>View</q-tooltip>
                  </q-btn>
                  <!-- <q-btn id="authchain-action-buttons" icon="more_vert" size="md" round flat dense
                    @click.stop="() => {/*Dont remove to avoid trigger of tr click*/ }">
                    <q-menu>
                      <q-list>
                        <q-item clickable v-close-popup
                          @click.stop="openPublisherDialog('url', value.row.identitySnapshot?.token?.category, value.row)">
                          Publish Registry From URL
                        </q-item>
                        <q-item clickable v-close-popup
                          @click.stop="openPublisherDialog('file', value.row.identitySnapshot?.token?.category, value.row)">
                          Publish Registry From File
                        </q-item>
                        <q-item clickable @click.stop="(e) => onRowClicked(e, value.row)">
                          <q-icon name="auto_stories"></q-icon>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn> -->
                </div>
              </q-td>
            </template>
            <!-- <template v-slot:loading>
              <q-inner-loading :showing="populatingTable"></q-inner-loading>
            </template> -->
          </q-table>
          <AuthchainRegistryPublisherDialog v-if="dialog"
            :model-value="dialog === AuthchainRegistryPublisherDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @registry-published="() => { }" />
          <AuthchainRegistryFromFilePublisherDialog v-if="dialog"
            :model-value="dialog === AuthchainRegistryFromFilePublisherDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @registry-published="() => { }" />
        </div>
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { onMounted, ref, computed, inject, onBeforeUnmount, onBeforeMount, defineComponent, watch } from 'vue';
import { useUser } from 'src/stores/user'
import { useDialogs } from 'src/composables'
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, AuthchainIdentity, ChainGraph, Watchtower } from 'src/app'
import { PaginatedData, TransactionSigner } from 'src/app/types';
import { FetchUtxoQueryParams } from 'src/app/Watchtower'
import { Wallet } from 'mainnet-js';
import TokenCategory from 'src/components/TokenCategory.vue'
import TokenSymbol from 'src/components/TokenSymbol.vue'
import { EventBus, useQuasar } from 'quasar';
import AuthchainRegistryPublisherDialog from 'src/components/dialogs/AuthchainRegistryPublisherDialog.vue'
import AuthchainRegistryFromFilePublisherDialog from 'src/components/dialogs/AuthchainRegistryFromFilePublisherDialog.vue'
import { useTokenStore } from 'src/stores/token';
import { useRouter } from 'vue-router';
import { useUI } from 'src/stores/ui';
import { useAuthhead } from 'src/stores/authhead';

defineComponent({ name: 'RegistryList' })
const $q = useQuasar()
const ui = useUI()
const router = useRouter()
const user = useUser()
const authhead = useAuthhead()
const tokenStore = useTokenStore()
const eventBus = inject<EventBus>('eventBus')
const { dialog, dialogData, openDialog, onHide, hideDialog } = useDialogs()
const populatingTable = ref<boolean>()

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
    return ['icon', 'symbol', 'actions']
  }
  return ['icon', 'symbol', 'tokenid', 'actions']
})


const onRowClicked = (event: any, authHead: AuthchainIdentity) => {
  tokenStore.token = authHead // deprecate this
  // authhead.value = authhead
  router.push(`/issuer/manage/token/${authHead.identitySnapshot?.token?.category || authHead.utxo?.token?.tokenId}`)
}

const populateOwnedAuthHeads = async (wallet: Wallet, transactionSigner: TransactionSigner) => {
  if (wallet) {
    const query: FetchUtxoQueryParams = { limit: pagination.value.rowsPerPage, offset: (pagination.value.page - 1) * pagination.value.rowsPerPage }
    populatingTable.value = true
    const resp = await (new Watchtower()).fetchAuthchainIdentities(wallet.getTokenDepositAddress(), query)
    populatingTable.value = false
    if (resp?.count > 0) {
      ownedAuthHeads.value = resp
      pagination.value.rowsNumber = resp.count
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

        await ownedAuthHeads.value.results[i].resolveIdentitySnapshot()
      })

    }

  }
}

const openPublisherDialog = async (type: 'url' | 'file', tokenId: string, authchainIdentity: AuthchainIdentity) => {

  let proceed = false
  const d = $q.dialog({
    message: 'Checking if this UTXO has authority to publish metadata for this particular token id...',
    progress: true,
    class: 'q-pa-lg',
    ok: false
  })

  const authhead = await (new ChainGraph()).fetchAuthheadTxid(tokenId)
  console.log('AUTHHEAD', authchainIdentity.txid)

  if (authhead != authchainIdentity.txid) {
    d.update({
      dark: true,
      message: 'Unauthorized, this UTXO isn\'t the current authhead for this particular token id.',
      persistent: true,
      ok: true,
      focus: 'ok',
      progress: false
    }).onDismiss(() => {
      proceed = false
    })
  } else {
    proceed = true
  }
  d.hide()

  if (!proceed) return

  if (type == 'file') {
    openDialog(AuthchainRegistryFromFilePublisherDialog.__name, authchainIdentity)
  } else {
    openDialog(AuthchainRegistryPublisherDialog.__name, authchainIdentity)
  }

}

onBeforeMount(async () => {
  if (user.wallet) {
    await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
  }
})

const onTableRequest = async (props: any) => {
  pagination.value = props.pagination
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
}

onMounted(() => {
  ui.routeBack = ''
})

onBeforeUnmount(() => {
  eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
})

</script>
