<template>
  <q-page>
    <q-layout view="lHh Lpr lFf" container style="height: 100vh">
      <!-- <q-footer v-if="bcmrNewRevision && !progress" class="q-pa-lg text-right"
        style="background-color: rgb(20,20,20, 0.71);" reveal>
        <div class="text-right q-gutter-sm">
          <div class="q-gutter-sm row items-center text-right flex">
            <q-icon name="warning" size="xs" color="warning"></q-icon>
            <span class="text-justify">{{ progress || `Registry modified, added new revision history. Just continue
              editing, your changes will
              be
              applied to this new revision.` }}</span>
          </div>
          <q-btn v-if="!progress" @click.stop="reset" size="md" icon="undo" text-color="negative">
            Reset
          </q-btn>
          <q-btn @click.stop="() => promptForRevisionOptions(downloadRevisedRegistry, 'Download')" icon="download"
            size="md" text-color="primary" :disabled="!!progress">
            <q-tooltip>Download registry</q-tooltip>
            <q-spinner v-if="!!progress"></q-spinner>Download
          </q-btn>
          <q-btn @click.stop="() => promptForRevisionOptions(publish, 'Confirm Publish')" size="md" color="primary"
            :disabled="!!progress">
            <q-tooltip>Publish changes</q-tooltip>
            <q-spinner v-if="!!progress && !progress.toString().includes('Download')"></q-spinner>Publish Changes
          </q-btn>
        </div>
      </q-footer> -->
      <q-page-container>
        <q-page padding class="q-mb-lg">
          <div class="col-12 text-right q-mr-lg q-gutter-md">

            <q-btn v-if="!bcmrNewRevision" @click.stop="newRevision" size="md" icon="edit" text-color="primary">
              <q-tooltip>Click to edit</q-tooltip>
            </q-btn>
            <div v-else class="q-gutter-md">
              <q-btn v-if="!progress" @click.stop="reset" size="md" icon="undo" text-color="negative">
                <q-tooltip>Reset</q-tooltip>
              </q-btn>
              <q-btn @click.stop="() => promptForRevisionOptions(downloadRevisedRegistry, 'Download')" icon="download"
                size="md" text-color="primary" :disabled="!!progress">
                <q-tooltip>Download registry</q-tooltip>
                <q-spinner v-if="!!progress"></q-spinner>
              </q-btn>
              <q-btn @click.stop="() => promptForRevisionOptions(publish, 'Confirm Publish')" size="md" color="primary"
                :disabled="!!progress" icon="cloud_upload">
                <q-tooltip>Publish changes</q-tooltip>
                <q-spinner v-if="!!progress && !progress.toString().includes('Download')"></q-spinner>
              </q-btn>

            </div>
            <!-- <q-btn v-else @click.stop="reset" size="md" icon="undo" text-color="negative">
              Reset
            </q-btn> -->
          </div>
          <q-form id="bcmr-form" ref="bcmrForm" disabled>
            <div class="col-sm-2" :class="$q.screen.xs ? 'flex justify-center q-mb-sm' : ''">
              <div class="row justify-center items-center">
                <div class="col-12 text-center">
                  <q-img
                    v-if="bcmrSelectedAuthbase && bcmrSelectedIdentityHistory && bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris?.icon"
                    :src="bcmrSelectedAuthbase && bcmrSelectedIdentityHistory && bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris?.icon"
                    class="rounded-borders cursor-pointer" @click.stop="iconFileRef.pickFiles()"
                    style="width:200px;height:200px"></q-img>
                  <q-icon v-else name="broken_image" size="200px" color="grey-8" class="cursor-pointer"
                    @click.stop="iconFileRef.pickFiles()"></q-icon>
                  <div>
                    <btn class="text-underline cursor-pointer" @click.stop="iconFileRef.pickFiles()" flat>Select Token
                      Icon
                      <q-icon name="attach_file"></q-icon>
                    </btn>
                  </div>
                  <label v-if="newTokenIconUploading" class="text-warning">
                    Uploading<q-spinner-dots color="warning" class="q-mr-sm"></q-spinner-dots>
                  </label>
                </div>
                <div style="width:8em" class="col-12 flex justify-center">
                  <q-file ref="iconFileRef" v-model="newTokenIconFile" accept=".jpg,.png, image/*"
                    @rejected="() => console.log('rejected')" :disable="newTokenIconUploading" borderless stack-label>
                  </q-file>
                </div>

              </div>
            </div>
            <div class="col-xs-12 col-sm-10">
              <div v-if="publicationTx" class="q-px-lg">
                🎉 Registry published <q-btn :href="openTxInExplorer(publicationTx)" target="_blank" flat dense
                  color="secondary" label="View Tx in Explorer" />
              </div>
              <q-expansion-item v-model="expansionItemOne" label="Registry" class="q-px-md q-pt-sm q-my-sm"
                icon="menu_book">
                <div class="q-mx-md q-gutter-sm q-my-sm">
                  <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                    <label>Schema</label>
                    <q-input class="registry-field" v-model="bcmr!.$schema" outlined disable></q-input>
                  </div>
                  <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                    <label>Version</label>
                    <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setVersion(v)"
                      :model-value="bcmr.versionString" outlined>
                    </q-input>
                  </div>
                  <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                    <label>Latest Revision</label>
                    <q-input class="registry-field" v-model="bcmr.latestRevision" outlined disable>
                    </q-input>
                  </div>
                  <div v-if="bcmrNewRevision" class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                    <label>New Revision<q-icon name="priority_high" color="warning"></q-icon></label>
                    <q-input class="registry-field" v-model="bcmr.latestRevision" outlined disable>
                      <template v-slot:prepend>
                        <q-icon name="priority_high" color="warning"></q-icon>
                      </template>
                    </q-input>
                  </div>
                  <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                    <label>License</label>
                    <q-input class="registry-field" v-model="bcmr.license" placeholder="Example: CC0-1.0"
                      aria-placeholder="Example: CC0-1.0" outlined stack-label>
                    </q-input>
                  </div>
                </div>
              </q-expansion-item>
              <q-expansion-item v-model="expansionItemTwo" label="Token Identity" class="q-px-md q-pt-sm q-my-sm"
                icon="menu_book">
                <div class="q-mx-md q-gutter-sm q-my-sm">
                  <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                    <label>Authbase</label>
                    <q-select v-model="bcmrSelectedAuthbase" class="ellipsis"
                      :options="Object.keys(bcmr.identities || {})" outlined autogrow>
                    </q-select>
                  </div>
                </div>
                <div v-if="bcmr.identities && bcmrSelectedAuthbase" class="q-mx-md q-gutter-sm q-my-sm">
                  <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                    <label>Identity Revision History <q-icon v-if="bcmrNewRevision == bcmrSelectedIdentityHistory"
                        color="warning" name="priority_high"></q-icon><q-icon
                        v-if="bcmrNewRevision == bcmrSelectedIdentityHistory" color="warning"
                        name="fiber_new"></q-icon></label>
                    <q-select v-model="bcmrSelectedIdentityHistory" :options="bcmrIdentityHistories" outlined>
                    </q-select>
                  </div>
                </div>
                <div v-if="bcmrSelectedAuthbase && bcmrSelectedIdentityHistory" class="q-mx-md q-gutter-sm q-my-sm">
                  <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                    <label>Name</label>
                    <q-input class="registry-field"
                      v-model="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].name"
                      outlined stack-label autofocus>
                    </q-input>
                  </div>
                  <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                    <label>Description</label>
                    <q-input class="registry-field"
                      v-model="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].description"
                      outlined autogrow stack-label>
                    </q-input>
                  </div>
                  <div class="text-h6">Token <q-icon name="token"></q-icon></div>
                  <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                    <label>Symbol</label>
                    <q-input class="registry-field"
                      v-model="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].token!.symbol"
                      outlined autogrow stack-label>
                    </q-input>
                  </div>
                  <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                    <label>Category</label>
                    <q-input class="registry-field"
                      v-model="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].token!.category"
                      outlined autogrow disable>
                    </q-input>
                  </div>
                  <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                    <label>Decimals</label>
                    <q-input class="registry-field"
                      v-model="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].token!.decimals"
                      outlined autogrow>
                    </q-input>
                  </div>
                  <div class="text-h6">URIs <q-icon name="link"></q-icon></div>
                  <div class="col-12 q-gutter-y-sm">
                    <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                      <label>Icon</label>
                      <q-input class="registry-field"
                        :model-value="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris?.icon"
                        @update:model-value="(v: any) => bcmr.identities![bcmrSelectedAuthbase!][bcmrSelectedIdentityHistory!.toISOString()].uris = { ...bcmr.identities![bcmrSelectedAuthbase!][bcmrSelectedIdentityHistory!.toISOString()].uris, ...{ ['icon']: v } }"
                        outlined autogrow>
                        <template v-slot:prepend>
                          <q-avatar
                            @click="delete bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris?.icon">
                            <q-img
                              v-if="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris?.icon"
                              :src="bcmr.identities![bcmrSelectedAuthbase!][bcmrSelectedIdentityHistory.toISOString()].uris?.icon" />
                            <q-icon v-else name="broken_image" color="grey-8" size="4em"></q-icon>
                          </q-avatar>
                        </template>
                      </q-input>
                    </div>
                    <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
                      <label>Web</label>
                      <q-input class="registry-field"
                        :model-value="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris?.web"
                        @update:model-value="(v: any) => bcmr.identities![bcmrSelectedAuthbase!][bcmrSelectedIdentityHistory!.toISOString()].uris = { ...bcmr.identities![bcmrSelectedAuthbase!][bcmrSelectedIdentityHistory!.toISOString()].uris, web: v }"
                        outlined autogrow>
                      </q-input>
                    </div>
                    <div
                      v-for="[k], i  in  Object.entries(bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris || {})"
                      :key="i" class="q-gutter-sm">
                      <template v-if="k.toLowerCase() !== 'icon' && k.toLowerCase() !== 'web'">
                        <label style="text-transform: capitalize;">{{ k }}</label>
                        <q-input input-class="registry-field"
                          @update:model-value="(v: any) => bcmr.identities![bcmrSelectedAuthbase!][bcmrSelectedIdentityHistory!.toISOString()].uris = { ...bcmr.identities![bcmrSelectedAuthbase!][bcmrSelectedIdentityHistory!.toISOString()].uris, [k]: v }"
                          :model-value="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris?.[k]"
                          outlined>
                          <template v-slot:after>
                            <q-btn text-color="negative" icon="delete"
                              @click="delete bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris![k]"></q-btn>
                          </template>
                        </q-input>
                      </template>
                    </div>
                    <div class="text-right">
                      <q-btn @click="openAddUriDialog" icon="add" text-color="primary">
                      </q-btn>
                    </div>
                  </div>
                </div>
              </q-expansion-item>
              <q-expansion-item v-model="expansionItemThree" label="Nfts"
                :icon="nftTypesSelectedForPublication.length > 0 ? 'priority_high' : 'collections'"
                class="q-px-md q-pt-sm q-my-sm" :class="nftTypesSelectedForPublication.length > 0 ? 'text-warning' : ''"
                style="overflow-x:scroll">
                <q-tabs v-model="nftTypesShown" active-color="warning">
                  <q-tab name="published" label="Published" />
                  <q-tab name="unpublished" label="Unpublished" />
                  <q-tab name="minted" label="Minted" />
                </q-tabs>
                <q-tab-panels v-model="nftTypesShown" style="background: unset">
                  <q-tab-panel name="published" label="Published">
                    <div class="text-grey-5 row items-center">
                      <q-icon name="info" class="text-grey-5 q-mr-sm"></q-icon>
                      <span>These contains the list of the NFTs defined on the
                        currently published token metadata.</span>
                    </div>
                  </q-tab-panel>
                  <q-tab-panel name="unpublished" label="Unpublished">
                    <div class="text-grey-5 row items-center">
                      <span>These contains the list of temporarily saved unpublished NFTs. Select an item and
                        click <span class="text-primary"> 'Add Selected Item' </span> to add
                        the NFT metadata to the registry, the added item will be included when you publish the revision.
                        Click
                        <span class="text-negative">'Delete Selected Item'</span> to remove selected item from the local
                        storage.</span>
                    </div>
                    <div v-if="nftTypesSelected.length > 0 && bcmrNewRevision"
                      class="q-gutter-sm row items-center q-mt-sm">
                      <span class="text-grey-4"></span>
                      <q-btn text-color="negative" @click.stop="openDeleteUnpublishNftsDialog" no-caps>Delete Selected
                        Item
                      </q-btn>
                      <q-btn text-color="primary" class="cursor-pointer" @click.stop="commitSelectedUnpublishedNfts"
                        no-caps>Add Selected
                        Item</q-btn>
                      <q-btn v-if="nftTypesSelectedForPublication.length > 0" @click.stop="undoCommitOfUnpublishedNfts"
                        text-color="warning">Undo Add</q-btn>
                    </div>
                  </q-tab-panel>
                  <q-tab-panel name="minted" label="Minted">
                    <div class="text-grey-5 row items-center">

                      <span><q-icon name="info" class="text-grey-5 q-mr-sm inline"></q-icon>These contains the list of the
                        minted
                        tokens/existing tokens of this token
                        category.</span>
                      <div class="col-12 text-right">
                        <q-checkbox v-if="nftTypesShown == 'minted'" v-model="showMintersInMintedNfts" class="self-right">
                          Show Minters
                        </q-checkbox>
                      </div>
                    </div>
                  </q-tab-panel>
                </q-tab-panels>
                <div style="overflow-x: scroll">
                  <q-table v-model:pagination="nftTypesPagination" flat :rows="nftTypes.results"
                    v-model:selected="nftTypesSelected" :selection="nftTypesShown == 'unpublished' ? 'multiple' : 'none'"
                    style="background:unset" :columns="[
                      {
                        name: 'nfttype', label: 'Nft Type',
                        field: r => '',
                        align: 'left',
                        headerStyle: 'padding: 1.5em',
                      },
                      {
                        name: 'actions', label: '',
                        field: r => '',
                        align: 'center',
                        headerStyle: 'padding: 1.5em',
                      },
                    ]" :rows-per-page-options="nftTypesRowsPerPage" row-key="id"
                    :visible-columns="['nfttype', 'actions']" bordered>
                    <template v-slot:body-cell-nfttype="value">
                      <td>
                        <div class="row justify-left items-center flex wrap q-gutter-sm">
                          <div class="col-auto">
                            <q-avatar v-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.icon"
                              rounded>
                              <q-img
                                :src="ipfsToGatewayUrl(value.row[value.row._meta?.commitment || value.row.commitment].uris.icon)" />
                            </q-avatar>
                            <q-avatar
                              v-else-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.image"
                              rounded>
                              <q-img
                                :src="ipfsToGatewayUrl(value.row[value.row._meta?.commitment || value.row.commitment].uris.image)" />
                            </q-avatar>
                            <q-avatar
                              v-else-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.asset"
                              rounded>
                              <q-img
                                :src="ipfsToGatewayUrl(value.row[value.row._meta?.commitment || value.row.commitment].uris.asset)" />
                            </q-avatar>
                            <q-icon v-else name="broken_image" size="xl" color="grey-8" round></q-icon>
                          </div>
                          <div class="col text-wrap text-left" style="font-size: 1.5em; letter-spacing: 2px;">
                            <div style="font-variant-numeric: tabular-nums;" class="text-grey-4 text-bold">
                              {{ !value.row.identitySnapshot?.nfts?.parse?.bytecode &&
                                value.row.identitySnapshot?.nfts?.parse?.bytecode !== '00d26b' ?
                                `#${formatCommitment(value.row._meta?.commitment || value.row.commitment, 'vm-number',
                                  'decimal')}` :
                                value.row._meta?.commitment || value.row.commitment }}
                            </div>
                            <div class="text-bold text-grey-4" style="letter-spacing: 3px; font-variant:unicase">
                              {{ `(${value.row[value.row._meta?.commitment || value.row.commitment]?.name})` }}
                            </div>
                          </div>
                          <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                            <div class="text-grey-6 ellipsis-2-lines">
                              Description: {{
                                value.row[value.row._meta?.commitment || value.row.commitment].description
                                || '<no description>' }}
                            </div>
                          </div>
                          <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                            <div class="text-grey-8">
                              Commitment: {{
                                value.row._meta?.commitment || value.row.commitment
                              }}
                            </div>
                          </div>
                          <div v-if="value.row.capability" class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                            <div class="text-grey-8">
                              Capability: {{
                                value.row.capability
                              }}
                            </div>
                          </div>
                          <div
                            v-if="Object.keys(value.row[value.row._meta?.commitment || value.row.commitment]).length == 0"
                            class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                            <div class="text-grey-8">
                              {{ `<no metadata>` }}
                            </div>
                          </div>
                        </div>
                      </td>
                    </template>
                    <template v-slot:body-cell-actions="value">
                      <q-td class="text-center">
                        <div
                          v-if="Object.keys(value.row[value.row._meta?.commitment || value.row.commitment]).length == 0">
                          <q-btn label="Add Metadata" text-color="primary"
                            :to="{ name: 'nft-metadata', query: { authhead: tokenStore.token.txid, commitment: value.row._meta?.commitment || value.row.commitment, capability: value.row.capability, amount: value.row.amount } }"
                            disable>
                          </q-btn>
                          <div class="text-grey-8">under development</div>
                        </div>
                      </q-td>
                    </template>
                  </q-table>
                  <!-- <q-inner-loading :showing="nftTypesIsLoading" >
                    <q-spinner-grid size="30px" />
                  </q-inner-loading> -->
                </div>
              </q-expansion-item>
            </div>
          </q-form>
          <!-- <q-inner-loading :showing="!!progress" id="inner-loading" class="bg-transparent">
            <q-spinner size="xl" color="warning" class="q-mb-lg"></q-spinner>
            <span class="bg-black q-px-sm" style="border-radius:10px">{{ progress }}</span>
          </q-inner-loading> -->
          <q-page-sticky v-if="!bcmrNewRevision" position="bottom-right" :offset="[30, 18]">
            <q-btn @click="newRevision" fab icon="edit" color="primary" />
          </q-page-sticky>
          <q-page-sticky v-else position="bottom-right" :offset="[30, 25]" class="q-gutter-md">
            <div class="q-gutter-md">
              <q-btn v-if="!progress" @click.stop="reset" fab size="md" icon="undo" text-color="negative">
                <q-tooltip>Reset</q-tooltip>
              </q-btn>
              <q-btn @click.stop="() => promptForRevisionOptions(downloadRevisedRegistry, 'Download')" icon="download"
                size="md" text-color="primary" :disabled="!!progress" fab>
                <q-tooltip>Download registry</q-tooltip>
                <q-spinner v-if="!!progress"></q-spinner>
              </q-btn>
              <q-btn @click.stop="() => promptForRevisionOptions(publish, 'Confirm Publish')" size="md" color="primary"
                :disabled="!!progress" icon="cloud_upload" fab>
                <q-tooltip>Publish changes</q-tooltip>
                <q-spinner v-if="!!progress && !progress.toString().includes('Download')"></q-spinner>
              </q-btn>
            </div>
          </q-page-sticky>
        </q-page>
      </q-page-container>
    </q-layout>
    <q-inner-loading :showing="!!progress" id="inner-loading" style="background-color:#0000002b" class="bg-transparent">
      <q-spinner size="xl" color="warning" class="q-mb-lg"></q-spinner>
      <span class="bg-black q-px-sm" style="border-radius:10px">{{ progress }}</span>
    </q-inner-loading>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, watch, onBeforeMount, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useUI } from 'src/stores/ui'
import { Bcmr, BcmrIndexer, ChainGraph } from 'src/app';
import { useDialogs } from 'src/composables/useDialogs';
import AuthchainRegistryPublisherDialog from 'src/components/dialogs/AuthchainRegistryPublisherDialog.vue'
import UnguardAuthchainDialog from 'src/components/dialogs/UnguardAuthchainDialog.vue'
import AuthchainBurnerDialog from 'src/components/dialogs/AuthchainBurnerDialog.vue';
import AuthchainRegistryFromFilePublisherDialog from 'src/components/dialogs/AuthchainRegistryFromFilePublisherDialog.vue'
import AddUriDialog from 'src/components/dialogs/AddUriDialog.vue'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { BcmrStorageArtifact, IconStorageArtifact, PaginatedData } from 'src/app/types';
import { useTokenStore } from 'src/stores/token'
import { ipfsToGatewayUrl, shortenTokenId, formatCommitment } from 'src/app/utils'
import { NftType, delay } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { useLocalForage } from 'src/composables/useLocalForage';
import RegistryPublishDialog from 'src/components/dialogs/RegistryPublishDialog.vue';
import PublishRevisionOption from 'src/components/dialogs/PublishRevisionOption.vue';
import { stringify } from 'querystring';
import { openTxInExplorer } from 'src/app/utils';
import { useAuthhead } from 'src/stores/authhead';
import { useEventBus } from 'src/composables';
import { Console } from 'console';

const $q = useQuasar()
const ui = useUI()
const router = useRouter()
const authhead = useAuthhead()
const localForage = useLocalForage()
const tokenStore = useTokenStore()
const { $ebus } = useEventBus()
const publicationTx = ref<string>()
const bcmr = ref<Bcmr>(new Bcmr({
  $schema: '',
  version: { major: 1, minor: 0, patch: 0 },
  latestRevision: new Date().toISOString(),
  registryIdentity: '',
  identities: {}
}))

const bcmrForm = ref()
const bcmrSelectedAuthbase = ref<string>()
const bcmrIdentityHistories = ref<Date[]>()
const bcmrSelectedIdentityHistory = ref<Date>()

const bcmrNewRevision = ref<Date>()
const bcmrNewVersion = ref<string>()
const bcmrIndexer = reactive<BcmrIndexer>(new BcmrIndexer())
const bcmrUseOnlyLatestIdentityHistory = ref<boolean>(true) // Maintain a single IdentitySnapshot
const bcmrIsModified = computed(() => {
  return bcmr?.value?.isModified || nftTypesSelectedForPublication.value.length > 0
})

const status = ref<'burned' | 'active' | 'unguarded'>('active')
const iconFileRef = ref()
const newTokenIconFilePicker = ref()
const newTokenIconFile = ref()
const newTokenIconPreview = ref()
const newTokenIconUploading = ref<boolean>(false)
const newTokenIconUploadArtifact = ref<IconStorageArtifact>()

const expansionItemOne = ref<boolean>(false)
const expansionItemTwo = ref<boolean>(false)
const expansionItemThree = ref<boolean>(false)

const authbase = ref<string>()
const uploadArtifact = ref<BcmrStorageArtifact>({
  uris: {
    https: '',
    ipfs: ''
  },
  contentHash: ''
})

const nftTypes = ref<PaginatedData>({
  count: 0,
  limit: 10,
  offset: 0,
  next: null,
  previous: null,
  results: [],
})

const nftTypesIsLoading = ref<boolean>()
const nftTypesShown = ref<'published' | 'unpublished' | 'minted'>('published')
const nftTypesSelected = ref<any[]>([])
const nftTypesSelectedForPublication = ref<any[]>([])
const nftTypesTableVisibleCols = computed(() => {
  // if ($q.screen.xs) {
  //   return ['icon', 'name']
  // }
  // if (nftTypesShown.value == 'minted' && $q.screen.gt.xs) {
  //   return ['icon', 'name', 'description', 'commitment', 'capability']
  // }
  return ['icon', 'actions']

})
const showMintersInMintedNfts = ref<boolean>(false)

const nftTypesPagination = ref({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  //rowsNumber: 10
})

const nftTypesRowsPerPage = computed(() => {
  return [12, 24, 36]
})

const progress = ref<boolean | string>()

const newRevision = () => {
  publicationTx.value = ''
  bcmrNewRevision.value = new Date()
  console.log('new revision timestamp', bcmrNewRevision.value.toISOString())
  bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevision.value.toISOString()]
    = JSON.parse(JSON.stringify(Object.assign({ name: '' }, bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrSelectedIdentityHistory.value!.toISOString()])))
  bcmrIdentityHistories.value?.push(bcmrNewRevision.value)
  bcmrSelectedIdentityHistory.value = bcmrNewRevision.value
  console.log('New Revision', bcmr.value)
  document.getElementById('bcmr-form')?.removeAttribute('disabled')
}

type RevisionOption = { newVersion: string, newRevision: string, revisionOption: 'update' | 'create' }
type RevisionOptionCallback = (arg1: RevisionOption) => any

const promptForRevisionOptions = async (callback: RevisionOptionCallback, okLabel?: string) => {
  $q.dialog({
    component: PublishRevisionOption,
    componentProps: {
      version: bcmr.value.versionString,
      latestRevision: bcmr.value.latestRevision,
      newRevision: bcmrNewRevision.value?.toString() || new Date().toString(),
      okLabel: okLabel
    }
  }).onOk((options: RevisionOption) => {
    // publish(options)
    callback(options)
    // let innerLoadingElement = document.getElementById('inner-loading');
    // innerLoadingElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  })
}



const publish = async (revisionOptions: RevisionOption) => {
  let { newVersion, revisionOption } = revisionOptions
  bcmrSelectedIdentityHistory.value = bcmrNewRevision.value
  bcmr.value.versionString = newVersion
  // bcmr.value.authchainIdentity = tokenStore.token
  progress.value = 'Authenticating authhead, please wait...'
  try {
    const trackedAuthhead = await (new ChainGraph()).fetchAuthheadTxid(bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevision.value!.toISOString()].token!.category)
    progress.value = false
    console.log('AUTHHEAD', trackedAuthhead)
    if (trackedAuthhead != tokenStore.token.txid) {
      await new Promise(res => {
        $q.dialog({
          message: `This UTXO is not authorized to publish metadata for token ${shortenTokenId(bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevision.value!.toISOString()].token!.category)}`,
          ok: true,
          focus: 'ok',
          class: 'q-pa-lg'
        }).onDismiss(() => res(null))
      })
      return
    }

  } catch (error) {
    $q.dialog({
      message: `Error authenticating authhead, please try again later...`,
      ok: true,
      focus: 'ok',
      class: 'q-pa-lg'
    })
  }
  const bcmrNewRevisionISOString = bcmrNewRevision.value!.toISOString()
  console.log('REVISION OPTION', revisionOption)
  if (revisionOption == 'update') {
    const singleRevision = Object.assign({}, bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString])
    bcmr.value.identities![bcmrSelectedAuthbase.value!] = {
      [bcmrNewRevisionISOString]: singleRevision
    }
  }

  // add nfts
  if (nftTypesSelectedForPublication.value.length > 0) {
    console.log('FOR PUBLICATINO', nftTypesSelectedForPublication.value)
    // const newNftTypes = nftTypesSelectedForPublication.value.map((nftType) => ({[nftType._meta.commitment]: nftType[nftType._meta.commitment]}))
    if (!bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString].token?.nfts) {
      bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString].token!.nfts = {
        parse: {
          bytecode: '',
          types: {}
        }
      }
    }
    for (const nftType of nftTypesSelectedForPublication.value) {
      console.log('ADDING', nftType)
      bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString].token!.nfts!.parse!.types[nftType._meta.commitment] = nftType[nftType._meta.commitment]

    }
  }
  console.log('ABOUT TO PUBLISH', bcmr.value)
  bcmr.value.latestRevision = bcmrNewRevisionISOString

  // const newBcmr = new Bcmr({ ...bcmr.value, latestRevision: bcmrNewRevision.value!.toISOString() })
  // bcmr.value.latestRevision = bcmrNewRevision.value!.toISOString()
  progress.value = 'Uploading registry to IPFS, please wait...'
  console.log('BEFORE SUCCESS', bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString])
  const tokenSymbol = bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString].token?.symbol
  console.log('Token symbol', tokenSymbol)
  console.log('UTXO BEFORE UPDATE', tokenStore.token.utxo)
  console.log('key UTXO BEFORE UPDATE', tokenStore.token.authKey?.utxo)

  let tx = ''
  try {
    const artifact = await bcmr.value.storeRegistry()
    if (artifact?.uris.https) {
      progress.value = 'Publishing, please wait...'
      tx = await tokenStore.token.publish({ url: artifact.uris.https, contentHash: artifact.contentHash })
    }
  } catch (error: any) {
    $q.dialog({
      message: error?.toString(),
      ok: true,
      focus: 'ok',
      class: 'q-pa-lg'
    })
  } finally {
    progress.value = false
  }

  if (tx) {
    progress.value = 'Registry published, waiting for confirmation...'
    try {
      await tokenStore.token.ownerWallet.waitForTransaction({ txHash: tx })
      await tokenStore.token.updateUtxo()
      await tokenStore.token.updateAuthKeyUtxo()
      $q.dialog({
        component: TransactionStatusDialog,
        componentProps: {
          statusType: 'success',
          statusText: `Metadata registry published!`,
          txid: tx
        }
      })
      console.log('AFTER SUCCESS', bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString])
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'AuthchainIdentity.publish',
        timestamp: new Date().getTime(),
        successMsg: `Published ${tokenSymbol}'s registry'`
      })
      bcmrNewRevision.value = undefined
      console.log('UTXO AFTER UPDATE', tokenStore.token.utxo)
      console.log('key UTXO AFTER UPDATE', tokenStore.token.authKey?.utxo)
      publicationTx.value = tx
      deleteSelectedUnpublishedNfts()
    } catch (error: any) {
      $q.dialog({
        message: error?.toString(),
        ok: true,
        focus: 'ok',
        class: 'q-pa-lg'
      })
    } finally {
      progress.value = false
    }
  }
}


const openDeleteUnpublishNftsDialog = () => {
  $q.dialog({
    message: 'Are you sure you want to delete the selected unpublished NFT metadata?',
    ok: 'Yes',
    cancel: 'No',
  }).onOk(async () => {
    deleteSelectedUnpublishedNfts()
  })
}

const deleteSelectedUnpublishedNfts = async () => {
  for (const [i, nftType] of nftTypesSelected.value.entries()) {
    await localForage.nftTypesStore.removeItem(nftType.id) // id is storage key
    console.log('REMOVED', nftType.id)
    nftTypesSelected.value.splice(i)
  }
  populateNftsTable()
}

const commitSelectedUnpublishedNfts = () => {
  nftTypesSelectedForPublication.value = nftTypesSelected.value.map((nftType) => {
    nftType.forPublish = true
    return nftType
  })
  console.log('SELECTED', nftTypesSelectedForPublication.value)
}

const undoCommitOfUnpublishedNfts = () => {
  nftTypesSelected.value.forEach((i: any) => i.forPublish = false)
  nftTypesSelectedForPublication.value = []
}

const saveNewIconInIPFS = async () => {
  if (newTokenIconFile.value) {
    try {
      const formData = new FormData();
      formData.append('icon', newTokenIconFile.value);
      console.log(newTokenIconFile.value)
      newTokenIconUploading.value = true
      const resp = await fetch(`api/tokens/icon/upload?tokenId=${tokenStore.token?.token?.tokenId}`, {
        method: 'POST', body: formData
      })
      const respJson = await resp.json()
      if (bcmrSelectedAuthbase.value && bcmrNewRevision.value && respJson.iconUris?.https) {
        bcmr.value.addIdentitySnapshotUri(bcmrSelectedAuthbase.value, bcmrNewRevision.value!.toISOString(), { icon: respJson.iconUris?.https })
        console.log('BEFORE ADDING URI', bcmr.value)
      }

    } catch (error) {
      console.log(error)
    } finally {
      newTokenIconUploading.value = false
    }
  }
}

const openAddUriDialog = (uri: any) => {
  $q.dialog({
    component: AddUriDialog,
    componentProps: {
      name: uri.name,
      value: uri.value
    },
    ok: { label: 'Add' },
    cancel: { label: 'Cancel' }
  }).onOk((uri) => {
    console.log('URI', uri)
    if (bcmrNewRevision.value && bcmrSelectedAuthbase.value) {
      bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevision.value!.toISOString()]
        .uris = {
        ...bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevision.value!.toISOString()]
          .uris, ...uri
      }
    }

  })
}

const downloadRegistryFile = (registry: any) => {
  const blob = new Blob([registry], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bitcoin-cash-metadata-registry.json'; // Specify the desired file name with the appropriate extension
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}

const downloadRevisedRegistry = async (revisionOptions: RevisionOption) => {
  progress.value = 'Downloading'
  const { revisionOption } = revisionOptions
  const bcmrNewRevisionISOString = bcmrNewRevision.value!.toISOString()
  if (revisionOption == 'update') {
    const singleRevision = Object.assign({}, bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString])
    bcmr.value.identities![bcmrSelectedAuthbase.value!] = {
      [bcmrNewRevisionISOString]: singleRevision
    }
  }

  // add nfts
  if (nftTypesSelectedForPublication.value.length > 0) {
    if (!bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString].token?.nfts) {
      bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString].token!.nfts = {
        parse: {
          bytecode: '',
          types: {}
        }
      }
    }
    for (const nftType of nftTypesSelectedForPublication.value) {
      bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString].token!.nfts!.parse!.types[nftType._meta.commitment] = nftType[nftType._meta.commitment]
    }
  }
  downloadRegistryFile(bcmr.value.getContent())
  progress.value = false
}

const onUnguard = () => {
  status.value = 'unguarded'
}

const onBurn = () => {
  status.value = 'burned'
}

const reset = async () => {
  nftTypesSelectedForPublication.value = []
  bcmrSelectedIdentityHistory.value = new Date(bcmr.value.latestRevision)
  if (bcmrNewRevision.value) {
    bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevision.value!.toISOString()]
    const i = bcmrIdentityHistories.value?.findIndex(v => v == bcmrNewRevision.value)
    if (i && i != -1) {
      bcmrIdentityHistories.value?.splice(i, 1)
    }
    bcmrNewRevision.value = undefined
  }
  document.getElementById('bcmr-form')?.setAttribute('disabled', '')
}

const loadNftTypes = async () => {
  if (bcmr.value && bcmrSelectedAuthbase.value && bcmrSelectedIdentityHistory.value) {
    // // Push to webworker
    console.log('COUNT', Object.keys(bcmr.value.identities![bcmrSelectedAuthbase.value][bcmrSelectedIdentityHistory.value.toISOString()].token?.nfts?.parse?.types || {}).length)
    nftTypes.value.count = Object.keys(bcmr.value.identities![bcmrSelectedAuthbase.value][bcmrSelectedIdentityHistory.value.toISOString()].token?.nfts?.parse?.types || {}).length
    // nftTypesPagination.value.rowsNumber = Object.keys(bcmr.value.identities![bcmrSelectedAuthbase.value][bcmrSelectedIdentityHistory.value.toISOString()].token?.nfts?.parse?.types || {}).length
    nftTypes.value.offset = (nftTypesPagination.value.page - 1) * nftTypesPagination.value.rowsPerPage
    nftTypes.value.limit = nftTypesPagination.value.rowsPerPage
    const types = bcmr.value.identities![bcmrSelectedAuthbase.value][bcmrSelectedIdentityHistory.value.toISOString()]
      .token?.nfts?.parse?.types || {}
    nftTypes.value.results = Object.keys(types).map((k) => ({ [k]: types[k], _meta: { commitment: k } })).slice()
  }
}

const loadUnpublishedNftTypes = async () => {
  const results: any = []
  for (const [index, key] of (await localForage.nftTypesStore.keys()).entries()) {
    if (key.startsWith(tokenStore?.token?.token?.tokenId)) {

      let item: {
        [key: string]: NftType,
      } & { _meta: { commitment: string }, id: number | string } | null

        = await localForage.nftTypesStore.getItem(key)
      if (item && typeof (item) == 'string') {
        item = JSON.parse(item)
      }
      item!.id = key // Just so we have a row-key in q-table
      item!._meta = { commitment: Object.keys(item!)[0] }

      results.push(item)
    }
  }
  nftTypes.value = {
    count: results.length,
    offset: 0,
    limit: 12,
    next: null,
    previous: null,
    results
  }
}

const loadMintedNftTypes = async () => {
  nftTypes.value = {
    count: 0,
    offset: 0,
    limit: 12,
    next: null,
    previous: null,
    results: []
  }
  const query = {
    paginated: true,
    limit: nftTypesPagination.value.rowsPerPage,
    offset: (nftTypesPagination.value.page - 1) * nftTypesPagination.value.rowsPerPage,
    include_metadata: true,
    capability: ['none', 'mutable']
  }
  if (showMintersInMintedNfts.value) {
    query.capability.push('minting')
  }
  const fntResp = await (new BcmrIndexer()).fetchMintedNftTypes(tokenStore.token.identitySnapshot.token.category, query)
  if (fntResp && fntResp.results) {

    type ItemType = {
      capability?: string,
      commitment?: string,
      amount?: number,
      metadata: { nft?: { [key: string]: NftType } }
    }

    fntResp.results = fntResp.results.map((item: ItemType) => {
      // Transform
      const { metadata, ...rest } = item
      if (item.metadata?.nft) {
        return { ...rest, ...item.metadata.nft }
      }
      return { ...rest, ...{ [item.commitment as string]: {} } }
    })
    nftTypes.value = fntResp
  }
}

const populateNftsTable = async () => {

  nftTypes.value.results = []
  if (nftTypesShown.value == 'unpublished') {
    return await loadUnpublishedNftTypes()
  }
  nftTypesIsLoading.value = true
  if (nftTypesShown.value == 'published') {
    await loadNftTypes()
  }
  else if (nftTypesShown.value == 'minted') {
    await loadMintedNftTypes()
  }
  nftTypesIsLoading.value = false
}


const onTableRequest = async (props: any) => {
  nftTypesPagination.value = props.pagination
  console.log('PROPS, PAGINATION', props.pagination)
  await populateNftsTable()

}


watch(() => newTokenIconFile.value, async (b) => {
  if (b) {
    newTokenIconPreview.value = URL.createObjectURL(b)
    newTokenIconUploadArtifact.value = undefined
    await saveNewIconInIPFS()
  }
})


watch(() => nftTypesShown.value, async () => {
  await populateNftsTable()
})

watch(() => showMintersInMintedNfts.value, async () => {
  await populateNftsTable()
})

watch(() => tokenStore?.token?.processing, async (v) => {
  if (v) {
    progress.value = v
  } else {
    progress.value = false
  }
})

onBeforeMount(async () => {
  try {
    progress.value = 'Loading registry, please wait...'
    const pubInfo = await (new ChainGraph()).retrieveLastRegistryPublication(tokenStore.token?.identitySnapshot?.token?.category)
    const r = await (new BcmrIndexer()).fetchRegistry(tokenStore.token?.identitySnapshot?.token?.category, true)
    console.log('PUBINFO', pubInfo)
    console.log('R', r)
    // if (pubInfo && pubInfo[0].uris && pubInfo[0].uris) {

    // }
    if (r) {
      bcmr.value = new Bcmr({ ...r })
      bcmr.value.versionString = `${r.version?.major || 0}.${r.version?.minor || 0}.${r.version?.patch || 0}`
      bcmrSelectedAuthbase.value = Object.keys(r.identities || {})[0]

      if (bcmrSelectedAuthbase.value) {
        bcmrIdentityHistories.value = Object.keys(r.identities[bcmrSelectedAuthbase.value] || {})
          .filter((v) => !Number.isNaN(new Date(v).getDate()))
          .map(v => new Date(v))
          .sort((a: any, b: any) => b - a)
        bcmrSelectedIdentityHistory.value = bcmrIdentityHistories.value[0]
        expansionItemTwo.value = true
      }
      loadNftTypes()
    }
  } catch (error) {
    progress.value = false
  } finally {
    progress.value = false
  }
})

onBeforeUnmount(async () => {
  try {
    await localForage.registryTempStore.removeItem(`registry-for-${tokenStore.token.txid}`)
  } catch (error) {
    console.log('Error removing registry cash from localstorage')
  }

})

onMounted(async () => {
  ui.routeBack = `registries`

})


</script>

<style scoped>
.disabled,
[disabled] {
  opacity: 0.8 !important;
}
</style>