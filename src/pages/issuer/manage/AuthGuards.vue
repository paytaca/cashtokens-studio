<template>
  <q-page class="q-ma-sm">
    <div class="row justify-center">
      <div class="col-xs-12 col-md-10">
        <h5 class="text-center">
          AuthGuards
        </h5>
        <q-expansion-item label="More Info">
          <p>
            These are the identity-output UTXOs locked with an AuthGuard contract. These are the same UTXOs you're using
            to manage the FT
            reserves, NFT Reserves and Metadata. You can release this UTXO from the AuthGuard if you don't want
            CashTokens
            Studio
            to manage this UTXOs. See <a class="text-secondary" target="_blank"
              href="https://github.com/mr-zwets/MBC-Token-Standard">Authguard
            </a>spec.
          </p>
        </q-expansion-item>
        <div>
          <q-table v-model:pagination="pagination" @request="onTableRequest" flat bordered
            :rows="ownedAuthHeads.results" color="warning" loading-label="Loading, please wait..."
            :loading="populatingTable" :columns="[

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
                name: 'authguard', label: 'Authguard',
                field: r => '',
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },
              {
                name: 'authkey', label: 'AuthKey ID',
                field: r => '',
                align: 'center',
                headerStyle: 'padding: 1.5em'
              },
              {
                name: 'actions', label: 'Actions',
                field: r => '',
                align: 'center',
                headerStyle: 'padding: 1.5em'

              },
            ]" :rows-per-page-options="rowsPerPageOptions" row-key="name" :visible-columns="visibleColumns">


            <template v-slot:body-cell-icon="value">
              <q-td class="text-center">
                <q-skeleton v-if="!!value.row.processing" type="circle" bordered></q-skeleton>
                <div v-else>
                  <q-avatar v-if="value.row.identitySnapshot?.uris?.icon">
                    <q-img :src="ipfsToGatewayUrl(value.row.identitySnapshot.uris.icon)" />
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
            <!-- <template v-slot:body-cell-utxotx="value">
              <q-td class="text-center cursor-pointer" @click="() => { copyText(value.row.txid) }">
                {{ shortenTx(value.row.txid) }}
                <q-tooltip>Click To Copy</q-tooltip>
              </q-td>
            </template> -->
            <template v-slot:body-cell-authguard="value">
              <q-td class="text-center">
                <q-skeleton v-if="!!value.row.processing" bordered square></q-skeleton>
                <div v-else>
                  <CashAddress v-if="value.row.authKey?.authGuard?.contract?.getTokenDepositAddress()"
                    :cashaddr="value.row.authKey.authGuard.contract.getTokenDepositAddress()"
                    tool-tip="Copy Contract Address" icon-right="lock" />
                </div>
              </q-td>
            </template>
            <template v-slot:body-cell-authkey="value">
              <q-td class="text-center">
                <q-skeleton v-if="!!value.row.processing" bordered square></q-skeleton>
                <div v-else>
                  <TokenCategory v-if="value.row.authKey?.token?.tokenId" :tokenId="value.row.authKey.token.tokenId"
                    icon-right="key" />
                </div>
              </q-td>
            </template>
            <template v-slot:body-cell-actions="value">
              <q-td class="text-center">
                <div v-if="!!value.row.processing" class="flex justify-center">
                  <q-skeleton type="QToggle" bordered square></q-skeleton>
                </div>
                <div v-else>
                  <q-btn id="authchain-action-buttons" icon="more_vert" size="md" round flat dense
                    @click.stop="() => {/*Dont remove to avoid trigger of tr click*/ }">
                    <q-menu>
                      <q-list>
                        <q-item clickable v-close-popup
                          @click.stop="openDialog(UnguardAuthchainDialog.__name, value.row)">
                          Unguard Utxo
                        </q-item>
                        <q-item clickable v-close-popup
                          @click.stop="openDialog(AuthchainBurnerDialog.__name, value.row)">
                          Burn Utxo
                        </q-item>
                        <!-- <q-item clickable @click.stop="refreshTokenBasicMeta(identity)"> Refresh </q-item> -->
                      </q-list>
                    </q-menu>
                  </q-btn>
                </div>
              </q-td>
            </template>
            <!-- <template v-slot:loading>
              <q-inner-loading :showing="populatingTable"></q-inner-loading>
            </template> -->
          </q-table>
          <UnguardAuthchainDialog v-if="dialog" :model-value="dialog === UnguardAuthchainDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide"
            @identity-unguarded="() => onUnguard()" />
          <AuthchainBurnerDialog v-if="dialog" :model-value="dialog === AuthchainBurnerDialog.__name"
            :authchain-identity="(dialogData as AuthchainIdentity)" @hide="onHide" @identity-burned="() => onBurn()" />
        </div>
      </div>
    </div>
  </q-page>
</template>
<script setup lang="ts">
import { onMounted, ref, watch, computed, inject, onBeforeUnmount, onBeforeMount } from 'vue';
import { useUser } from 'src/stores/user'
import { useDialogs } from 'src/composables'
import { ADDRESS_WATCHER_TRIGGERED, AuthKey, AuthchainIdentity, CashToken, Watchtower } from 'src/apps'
import { PaginatedData, TransactionSigner } from 'src/apps/types';
import { FetchUtxoQueryParams } from 'src/apps/Watchtower'
import NFTOwnershipTransferDialog from 'src/components/dialogs/NFTOwnershipTransferDialog.vue'
import { UtxoI, Wallet } from 'mainnet-js';
import TokenCategory from 'src/components/TokenCategory.vue'
import TokenSymbol from 'src/components/TokenSymbol.vue'
import CashAddress from 'src/components/CashAddress.vue'
import { copyText, formatCommitment, ipfsToGatewayUrl, shortenTokenId, shortenTx } from 'src/apps/utils';
import { EventBus, useQuasar } from 'quasar';
import AuthchainRegistryPublisherDialog from 'src/components/dialogs/AuthchainRegistryPublisherDialog.vue'
import UnguardAuthchainDialog from 'src/components/dialogs/UnguardAuthchainDialog.vue'
import AuthchainBurnerDialog from 'src/components/dialogs/AuthchainBurnerDialog.vue';
import AuthchainRegistryFromFilePublisherDialog from 'src/components/dialogs/AuthchainRegistryFromFilePublisherDialog.vue'
import { Token } from 'nft.storage';
import { useTokenStore } from 'src/stores/token';
import { useRouter } from 'vue-router';
import { useUI } from 'src/stores/ui';
import { useMetadataStore } from 'src/stores/metadata';
const $q = useQuasar()
const ui = useUI()
const router = useRouter()
const user = useUser()
const tokenStore = useTokenStore()
const metadataStore = useMetadataStore()
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
    return ['symbol', 'authguard', 'actions']
  }
  return ['icon', 'symbol', 'tokenid', 'utxotx', 'authguard', 'authkey', 'actions']
})

const populateOwnedAuthHeads = async (wallet: Wallet, transactionSigner: TransactionSigner) => {
  if (wallet) {
    populatingTable.value = true
    const query: FetchUtxoQueryParams = { limit: pagination.value.rowsPerPage, offset: (pagination.value.page - 1) * pagination.value.rowsPerPage }
    // const resp = await (new Watchtower()).fetchAuthchainIdentities(wallet.getTokenDepositAddress(), query)

    const authchainIdentities = await user.fetchAuthchainIdentities(
      wallet.getTokenDepositAddress(),
      query
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
          ownedAuthHeads.value.results[i].identitySnapshot = await metadataStore.loadIdentitySnapshot(token.tokenId)
          ownedAuthHeads.value.results[i].processing = ''
        }
      })

    }

  }
}

const onTableRequest = async (props: any) => {
  pagination.value = props.pagination
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
}

const onUnguard = async () => {
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
}

const onBurn = async () => {
  await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
}

watch(() => user.wallet, async (wallet) => {
  if (wallet) {
    await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
  }
})

onBeforeMount(async () => {
  if (user.wallet) {
    await populateOwnedAuthHeads(user.wallet as Wallet, user.transactionSigner!)
  }

})



onMounted(() => {
  ui.routeBack = ''
})

onBeforeUnmount(() => {
  eventBus?.off(ADDRESS_WATCHER_TRIGGERED)
})

</script>
