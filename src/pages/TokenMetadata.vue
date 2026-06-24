<template>
  <q-page>
    <q-layout view="lHh Lpr lFf" container style="height: 100vh">
      <q-footer style="background-color:#19191ab0">
        <div v-if="!bcmrNewRevision" class="row justify-end q-pa-md">
          <q-btn @click="newRevision" fab icon="edit" color="primary" />
        </div>
        <div v-else class="row justify-end q-pa-md">
          <div class="q-gutter-md">
            <q-btn v-if="!progress && !newTokenIconUploading && bcmrNotFound == false" @click.stop="reset" fab size="md"
              icon="undo" text-color="negative">
              <q-tooltip>Reset/Cancel Edit</q-tooltip>
            </q-btn>
            <q-btn v-if="bcmrNotFound == false"
              @click.stop="() => promptForRevisionOptions(downloadRevisedRegistry, 'Download')" size="md"
              text-color="primary" :disabled="!!progress || newTokenIconUploading" fab>
              <q-tooltip>Download registry</q-tooltip>
              <q-spinner v-if="!!progress || newTokenIconUploading"></q-spinner>
              <q-icon v-else name="download"></q-icon>
            </q-btn>
            <q-btn v-if="!progress && !newTokenIconUploading && bcmrNotFound == false"
              @click.stop="openPublishRegistryFromFileDialog" size="md" icon="file_open" text-color="primary">
              <q-tooltip>Publish registry from file</q-tooltip>
            </q-btn>
            <q-btn @click.stop="() => promptForRevisionOptions(publish, 'Confirm Publish')" size="md" color="primary"
              :disabled="!!progress || newTokenIconUploading" fab>
              <q-tooltip>Publish changes</q-tooltip>
              <q-spinner
                v-if="!!progress || newTokenIconUploading && !progress?.toString().includes('Download')"></q-spinner>
              <q-icon v-else name="cloud_upload"></q-icon>
            </q-btn>
          </div>
        </div>

      </q-footer>
      <q-page-container>
        <q-page class="q-mb-lg">
          <div class="row justify-center">
            <div class="col-xs-12 col-sm-10 col-lg-9 bg-content rounded-borders q-pa-lg">
              <div class="col-12 text-center text-h3">
                Metadata
                <q-btn icon="open_in_new" :href="`${bcmrApiHost}bcmr/${tokenStore.token?.token?.tokenId}/`"
                  target="_blank">
                </q-btn>
              </div>
              <div class="col-12 text-right q-mr-lg q-gutter-md">
                <q-btn v-if="!bcmrNewRevision" @click.stop="newRevision" size="md" icon="edit" text-color="primary">
                  <q-tooltip>Click to edit</q-tooltip>
                </q-btn>
                <div v-else class="q-gutter-md">

                  <q-btn v-if="!progress && !newTokenIconUploading && bcmrNotFound == false" @click.stop="reset"
                    size="md" icon="undo" text-color="negative">
                    <q-tooltip>Reset/Cancel Edit</q-tooltip>
                  </q-btn>
                  <q-btn @click.stop="() => promptForRevisionOptions(downloadRevisedRegistry, 'Download')" size="md"
                    text-color="primary" :disabled="!!progress || newTokenIconUploading">
                    <q-tooltip>Download registry</q-tooltip>
                    <q-spinner v-if="!!progress || newTokenIconUploading"></q-spinner>
                    <q-icon v-else name="download"></q-icon>
                  </q-btn>
                  <q-btn v-if="!progress && !newTokenIconUploading && bcmrNotFound == false"
                    @click.stop="openPublishRegistryFromFileDialog" size="md" icon="file_open" text-color="primary">
                    <q-tooltip>Publish registry from file</q-tooltip>
                  </q-btn>
                  <q-btn @click.stop="() => promptForRevisionOptions(publish, 'Confirm Publish')" size="md"
                    color="primary" :disabled="!!progress || newTokenIconUploading">
                    <q-tooltip>Publish changes</q-tooltip>
                    <q-spinner
                      v-if="(!!progress || newTokenIconUploading) && !progress?.toString().includes('Download')"></q-spinner>
                    <q-icon v-else name="cloud_upload"></q-icon>
                  </q-btn>
                </div>
              </div>
              <div v-if="bcmrNotFound">
                <div class="q-px-lg q-my-sm row justify-center items-center">
                  <div class="col-12 flex items-center justify-center">
                    <q-icon name="priority_high" color="warning"></q-icon>
                    <div>No Metadata Found</div>
                  </div>
                  <div class="text-center">We've initialize a basic metadata registry for you. You may fill up the form
                    here
                    below and publish
                    when you're done.
                  </div>
                </div>
              </div>
              <q-form id="bcmr-form" ref="bcmrForm" disabled>
                <div class="col-12">
                  <div v-if="publicationTx" class="q-px-lg text-center">
                    🎉 Registry published <q-btn :href="openTxInExplorer(publicationTx)" target="_blank" flat dense
                      color="secondary" label="View Tx in Explorer" />
                  </div>
                  <q-expansion-item v-model="expansionItemOne" label="Registry" class="q-px-md q-pt-sm q-my-sm"
                    icon="data_object">
                    <div class="q-mx-md q-gutter-md q-my-sm">
                      <div class="col-xs-12 col-md-8  q-gutter-y-sm items-center">
                        <label>Schema</label>
                        <q-input v-model="bcmr!.$schema" outlined disable></q-input>
                      </div>
                      <div class="col-xs-12 col-md-8  q-gutter-y-sm items-center">
                        <label>Version *</label>
                        <q-input @update:model-value="(v: any) => bcmr?.setVersion(v)" :model-value="bcmr.versionString"
                          :rules="[(v) => v.length > 0 || 'Required']" outlined>
                        </q-input>
                      </div>
                      <div class="col-xs-12 col-md-8  q-gutter-y-sm items-center">
                        <label>Latest Revision</label>
                        <q-input v-model="bcmr.latestRevision" outlined disable>
                        </q-input>
                      </div>
                      <div v-if="bcmrNewRevision" class="col-xs-12 col-md-8  q-gutter-y-sm items-center">
                        <label>New Revision<q-icon name="priority_high" color="warning"></q-icon></label>
                        <q-input v-model="bcmr.latestRevision" outlined :disable="!bcmrNewRevision">
                          <template v-slot:prepend>
                            <q-icon name="priority_high" color="warning"></q-icon>
                          </template>
                        </q-input>
                      </div>
                      <div class="col-xs-12 col-md-8 q-gutter-y-sm items-center">
                        <label>License</label>
                        <q-input v-model="bcmr.license" placeholder="Example: CC0-1.0"
                          aria-placeholder="Example: CC0-1.0" outlined stack-label>
                        </q-input>
                      </div>
                      <div class="col-xs-12 col-md-8 q-gutter-y-sm items-center">
                        <label>Authbase *</label>
                        <q-select v-model="bcmrSelectedAuthbase" class="ellipsis"
                          :options="Object.keys(bcmr.identities || {})" :rules="[(v) => v.length > 0 || 'Required']"
                          outlined autogrow>
                        </q-select>
                      </div>
                      <div v-if="bcmr.identities && bcmrSelectedAuthbase"
                        class="col-xs-12 col-md-8 q-gutter-y-sm items-center">
                        <label>Identity Revision History <q-icon v-if="bcmrNewRevision == bcmrSelectedIdentityHistory"
                            color="warning" name="priority_high"></q-icon><q-icon
                            v-if="bcmrNewRevision == bcmrSelectedIdentityHistory" color="warning"
                            name="fiber_new"></q-icon></label>
                        <q-select v-model="bcmrSelectedIdentityHistory" :options="bcmrIdentityHistories" outlined>
                        </q-select>
                      </div>
                    </div>
                  </q-expansion-item>
                  <q-expansion-item v-model="expansionItemTwo" label="Token Identity" class="q-px-md q-pt-sm q-my-sm"
                    icon="token">
                    <div v-if="bcmrSelectedAuthbase && bcmrSelectedIdentityHistory" class="q-mx-md q-gutter-sm q-my-sm">
                      <div class="col-xs-12 col-md-8 q-gutter-y-sm items-center justify-left">
                        <q-banner class="rounded-borders text-grey-4 q-pa-md q-mb-lg"
                          style="border: 3px solid rgb(73, 72, 72);border-radius: 15px; line-height: 1.3em;background: linear-gradient(109.6deg, rgb(0, 37, 84) 11.2%, rgba(0, 37, 84, 0.32) 100.2%);">
                          <div class="row items-center q-p-sm">
                            <div class="col">
                              <q-chip size="1.5em">
                                <q-avatar>
                                  <q-img
                                    v-if="bcmrSelectedAuthbase && bcmrSelectedIdentityHistory && bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris?.icon"
                                    :src="ipfsToGatewayUrl(bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris?.icon || '')" />
                                  <q-icon v-else name="broken_image" color="grey-8"></q-icon>
                                </q-avatar>
                                <span style="letter-spacing: 5px;">
                                  {{
                                    bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].token?.symbol
                                  }}
                                </span>
                              </q-chip>
                            </div>
                          </div>
                        </q-banner>
                      </div>
                      <div class="col-xs-12 col-md-8 q-gutter-y-sm items-center">
                        <label>Name *</label>
                        <q-input class="registry-field"
                          v-model="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].name"
                          outlined stack-label autofocus :rules="[(v) => v.length > 0 || 'Required']"
                          :disable="!bcmrNewRevision">
                        </q-input>
                      </div>
                      <div class="col-xs-12 col-md-8 q-gutter-y-sm items-center q-mb-md">
                        <label>Description</label>
                        <q-input class="registry-field"
                          v-model="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].description"
                          outlined autogrow stack-label :disable="!bcmrNewRevision">
                        </q-input>
                      </div>
                      <div class="col-xs-12 col-md-8 q-gutter-y-sm items-center">
                        <label>Symbol *</label>
                        <q-input class="registry-field"
                          v-model="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].token!.symbol"
                          outlined autogrow stack-label :rules="[(v) => v.length > 0 || 'Required']"
                          :disable="!bcmrNewRevision">
                        </q-input>
                      </div>

                      <div class="col-xs-12 col-md-8  q-gutter-y-sm items-center q-mb-md">
                        <label>Decimals (For Fungible Tokens)</label>
                        <q-input class="registry-field"
                          v-model="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].token!.decimals"
                          outlined autogrow :disable="!bcmrNewRevision"
                          :rules="[(v) => v == undefined || (Number(v) >= 0 && Number(v) <= 18) || 'Value should be between 0 - 18 inclusive. Default is 0.']">
                        </q-input>
                      </div>
                      <div class="col-xs-12 col-md-8 q-gutter-y-sm items-center q-mb-md">
                        <label>Category</label>
                        <q-input class="registry-field"
                          v-model="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].token!.category"
                          outlined autogrow disable>

                          <template v-slot:append>
                            <q-icon name="edit_off"></q-icon>
                          </template>
                        </q-input>
                      </div>
                      <div class="text-h6 q-mt-lg">URIs <q-icon name="link"></q-icon></div>
                      <div class="col-12 q-gutter-y-md">
                        <div class="col-xs-12 col-md-8 q-gutter-y-sm items-center"
                          :style="$q.screen.xs ? 'margin-bottom: 4rem' : 'margin-bottom: 2rem'">
                          <label>Token Icon {{ newTokenIconUploading ? 'Uploading' : '' }}<q-spinner-dots
                              v-if="newTokenIconUploading" color="warning" class="q-mr-sm"></q-spinner-dots></label>
                          <div>
                            <q-file ref="iconFileRef" v-model="newTokenIconFile" accept=".jpg, .png, image/*"
                              @rejected="() => $q.dialog({ message: 'File, rejected. Please attach an image.' })"
                              :disable="newTokenIconUploading" outlined bottom-slots class="hidden">
                            </q-file>
                            <q-input
                              v-model="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris!.icon"
                              label="Paste URL or click icon on the right to upload icon" :disable="!bcmrNewRevision"
                              outlined bottom-slots>

                              <template v-slot:prepend>
                                <div @click.stop=" iconFileRef.pickFiles()">
                                  <q-spinner-box v-if="newTokenIconUploading" color="warning"></q-spinner-box>
                                  <q-avatar
                                    v-else-if="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris?.icon">
                                    <q-img
                                      :src="ipfsToGatewayUrl(bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris!.icon)"></q-img>
                                  </q-avatar>
                                  <q-icon v-else name="broken_image" color="grey-8"></q-icon>
                                </div>
                              </template>

                              <template v-slot:append>
                                <div @click.stop="() => { if (bcmrNewRevision) iconFileRef.pickFiles() }">
                                  <q-spinner-box v-if="newTokenIconUploading" color="warning"></q-spinner-box>
                                  <q-btn v-else icon="upload_file" class="cursor-pointer" text-color="warning" />
                                </div>
                              </template>

                              <template v-slot:hint>
                                <span style="line-height: 1.2rem;">
                                  It's recommended to provide an image as icon for this NFT so it'll show up nicely on
                                  user
                                  interfaces.
                                  Recommended max size is 400x400.
                                </span>
                              </template>
                            </q-input>
                          </div>
                        </div>
                        <!-- <div class="col-xs-12 col-md-8 q-gutter-y-sm items-center">
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
                    </div> -->
                        <div class="col-xs-12 col-md-8 q-gutter-y-sm items-center">
                          <label>Web</label>
                          <q-input class="registry-field"
                            :model-value="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris?.web"
                            @update:model-value="(v: any) => bcmr.identities![bcmrSelectedAuthbase!][bcmrSelectedIdentityHistory!.toISOString()].uris = { ...bcmr.identities![bcmrSelectedAuthbase!][bcmrSelectedIdentityHistory!.toISOString()].uris, web: v }"
                            :disable="!bcmrNewRevision" outlined autogrow>
                          </q-input>
                        </div>
                        <div
                          v-for="[k], i in Object.entries(bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris || {})"
                          :key="i" class="q-gutter-sm">

                          <template v-if="k.toLowerCase() !== 'icon' && k.toLowerCase() !== 'web'">
                            <label style="text-transform: capitalize;">{{ k }}</label>
                            <q-input input-class="registry-field"
                              @update:model-value="(v: any) => bcmr.identities![bcmrSelectedAuthbase!][bcmrSelectedIdentityHistory!.toISOString()].uris = { ...bcmr.identities![bcmrSelectedAuthbase!][bcmrSelectedIdentityHistory!.toISOString()].uris, [k]: v }"
                              :model-value="bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris?.[k]"
                              :disable="!bcmrNewRevision" outlined>
                              <template v-slot:append>
                                <q-btn text-color="negative" icon="remove_circle"
                                  @click="delete bcmr.identities![bcmrSelectedAuthbase][bcmrSelectedIdentityHistory.toISOString()].uris![k]"
                                  :disable="!bcmrNewRevision"></q-btn>
                              </template>
                            </q-input>
                          </template>
                        </div>
                        <div class="text-right">
                          <q-btn @click="openAddUriDialog" icon="add" text-color="primary" :disable="!bcmrNewRevision">
                          </q-btn>
                        </div>
                      </div>
                    </div>
                  </q-expansion-item>
                  <q-expansion-item v-model="expansionItemThree" label="Nfts"
                    :icon="nftTypesSelectedForPublication.length > 0 ? 'priority_high' : 'collections'"
                    class="q-px-md q-pt-sm q-mt-sm q-mb-lg"
                    :class="nftTypesSelectedForPublication.length > 0 ? 'text-warning' : ''"
                    style="overflow-x:scroll; margin-bottom: 5rem;">
                    <q-tabs v-model="nftTypesShown" active-color="warning">
                      <q-tab name="published" label="Published" />
                      <q-tab name="unpublished" label="Unpublished"
                        :alert="nftTypesUnpublished?.length > 0 ? 'warning' : ''"
                        :alert-icon="nftTypesUnpublished?.length > 0 ? 'priority_high' : ''" />
                      <q-tab name="minted" label="Minted" />
                    </q-tabs>
                    <div v-if="nftTypesSelectedForPublication.length > 0" class="text-center q-my-sm">
                      <q-icon name="warning" color="warning"></q-icon>
                      <span class="text-grey-4"> There are unpublished NFT metadata. Click <q-btn
                          @click.stop="() => promptForRevisionOptions(publish, 'Confirm Publish')" color="primary"
                          :disabled="!!progress || newTokenIconUploading" size="xs" round>
                          <q-tooltip>Publish changes</q-tooltip>
                          <q-spinner
                            v-if="!!progress || newTokenIconUploading && !progress?.toString().includes('Download')"></q-spinner>
                          <q-icon v-else name="cloud_upload"></q-icon>
                        </q-btn>
                        to publish. </span>
                    </div>
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
                            the NFT metadata to the registry, the added item will be included when you publish the
                            revision.
                            Click
                            <span class="text-negative">'Delete Selected Item'</span> to remove selected item from the
                            local
                            storage.</span>
                        </div>
                        <div v-if="nftTypesSelected.length > 0 && bcmrNewRevision"
                          class="q-gutter-sm row items-center q-mt-sm">
                          <span class="text-grey-4"></span>
                          <q-btn text-color="negative" @click.stop="openDeleteUnpublishNftsDialog" no-caps>Delete
                            Selected
                            Item
                          </q-btn>
                          <q-btn text-color="primary" class="cursor-pointer" @click.stop="commitSelectedUnpublishedNfts"
                            no-caps :disable="!bcmrNewRevision">Add
                            Selected
                            Item</q-btn>
                          <q-btn v-if="nftTypesSelectedForPublication.length > 0"
                            @click.stop="undoCommitOfUnpublishedNfts" text-color="warning">Undo Add</q-btn>
                        </div>
                      </q-tab-panel>
                      <q-tab-panel name="minted" label="Minted">
                        <div class="text-grey-5 row items-center">
                          <span><q-icon name="info" class="text-grey-5 q-mr-sm inline"></q-icon>These contains the list
                            of
                            the
                            minted
                            tokens/existing tokens of this token
                            category.</span>
                          <div class="col-12 text-right">
                            <q-checkbox v-if="nftTypesShown == 'minted'" v-model="showMintersInMintedNfts"
                              class="self-right">
                              Show Minters
                            </q-checkbox>
                          </div>
                        </div>
                      </q-tab-panel>
                    </q-tab-panels>
                    <div style="overflow-x: scroll">
                      <q-table v-model:pagination="nftTypesPagination" flat :rows="nftTypes.results"
                        v-model:selected="nftTypesSelected"
                        :selection="nftTypesShown == 'unpublished' ? 'multiple' : 'none'" :loading="nftTypesIsLoading"
                        color="warning" @request="onTableRequest" style="background:unset;margin-bottom: 3rem;"
                        :columns="[
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
                                <q-avatar
                                  v-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.icon"
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
                                <q-avatar
                                  v-else-if="value.row[value.row._meta?.commitment || value.row.commitment]?.uris?.web"
                                  rounded>
                                  <q-img
                                    :src="ipfsToGatewayUrl(value.row[value.row._meta?.commitment || value.row.commitment].uris.web)" />
                                </q-avatar>
                                <q-icon v-else name="broken_image" size="xl" color="grey-8" round></q-icon>
                              </div>
                              <div class="col text-wrap text-left" style="font-size: 1.5em; letter-spacing: 2px;">
                                <div style="font-variant-numeric: tabular-nums;" class="text-grey-4 text-bold">
                                  {{
                                    isSequentialNftCollection(value.row.identitySnapshot?.nfts?.parse?.bytecode) ?
                                      `#${computedNftSequenceNumber(value.row._meta?.commitment || value.row.commitment ||
                                        '')}` :
                                      value.row._meta?.commitment || value.row.commitment
                                  }} {{
                                    computedNftNameForSequentialNft(value.row.identitySnapshot?.nfts?.parse?.bytecode,
                                      value.row._meta?.commitment || value.row.commitment ||
                                      '') }}
                                  <sup v-if="value.row?._meta?.modified"><q-badge outline color="warning"><q-icon
                                        name="priority_high" color="warning"></q-icon>Modified</q-badge> </sup>
                                </div>
                                <div class="text-bold text-grey-4" style="letter-spacing: 3px; font-variant:unicase">
                                  {{
                                    `(${value.row[value.row._meta?.commitment || value.row.commitment || '']?.name})`
                                  }}
                                </div>
                              </div>
                              <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                                <div class="text-grey-6 text-justify"
                                  :style="$q.screen.xs ? 'text-wrap:wrap;width:20ch;max-width:20ch' : 'text-wrap:wrap;width:60ch;max-width:80ch'">
                                  Description:
                                  {{
                                    value.row[value.row._meta?.commitment ||
                                      value.row.commitment || '']?.description ||
                                    '<no description>'
                                  }}
                                </div>
                              </div>
                              <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                                <div class="text-grey-8">
                                  <!-- Commitment: {{
                  value.row._meta?.commitment || value.row.commitment
                }} --> <q-chip v-for="k, i in Object.keys(value.row[value.row._meta?.commitment || value.row.commitment || '']?.extensions?.attributes || {})"
                                    :label="value.row[value.row._meta?.commitment || value.row.commitment]?.extensions?.attributes[k]"
                                    :key="'attributes' + i">
                                  </q-chip>
                                </div>
                              </div>
                              <div class="col-12 text-bold q-pl-sm" style="letter-spacing: 2px;">
                                <div class="text-grey-8 flex wrap">
                                  <span
                                    v-for="k, i in Object.keys(value.row[value.row._meta?.commitment || value.row.commitment || '']?.extensions || {})"
                                    :key="'extensions' + i">
                                    <q-chip
                                      v-if="typeof (value.row[value.row._meta?.commitment || value.row.commitment || '']?.extensions[k]) == 'string'"
                                      :label="value.row[value.row._meta?.commitment || value.row.commitment]?.extensions[k]"></q-chip>
                                    <q-chip v-else :label="'ext.' + k + '...'"></q-chip>
                                  </span>
                                </div>
                              </div>
                              <div v-if="value.row.capability" class="col-12 text-bold q-pl-sm"
                                style="letter-spacing: 2px;">
                                <div class="text-grey-8">
                                  Capability: {{ value.row.capability }}
                                </div>
                              </div>
                              <div
                                v-if="Object.keys(value.row[value.row._meta?.commitment || value.row.commitment || ''] || {}).length == 0"
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
                            <div>
                              <q-btn
                                :label="Object.keys(value.row[value.row._meta?.commitment || value.row.commitment || ''] || {}).length == 0 ? 'Add Metadata' : 'Edit Metadata'"
                                text-color="primary" @click.stop="() => openNftTypeDialog(value.row)"
                                :disable="!bcmrNewRevision">
                              </q-btn>
                            </div>
                          </q-td>
                        </template>
                        <q-inner-loading :showing="nftTypesIsLoading" id="inner-loading"
                          style="background-color:#0000002b" class="bg-transparent">
                          <q-spinner size="5em" color="warning" class="q-mb-lg"></q-spinner>
                          <span class="bg-black q-py-sm q-px-md text-warning text-center" style="border-radius:10px">{{
                            progress }}</span>
                        </q-inner-loading>
                      </q-table>

                    </div>
                  </q-expansion-item>
                </div>
              </q-form>
              <!-- <q-page-sticky v-if="!bcmrNewRevision" position="bottom-right" :offset="[30, 18]">
                <q-btn @click="newRevision" fab icon="edit" color="primary" />
              </q-page-sticky>
              <q-page-sticky v-else position="bottom-right">
                <div class="q-gutter-md">
                  <q-btn v-if="!progress && !newTokenIconUploading && bcmrNotFound == false" @click.stop="reset" fab
                    size="md" icon="undo" text-color="negative">
                    <q-tooltip>Reset/Cancel Edit</q-tooltip>
                  </q-btn>
                  <q-btn v-if="bcmrNotFound == false"
                    @click.stop="() => promptForRevisionOptions(downloadRevisedRegistry, 'Download')" size="md"
                    text-color="primary" :disabled="!!progress || newTokenIconUploading" fab>
                    <q-tooltip>Download registry</q-tooltip>
                    <q-spinner v-if="!!progress || newTokenIconUploading"></q-spinner>
                    <q-icon v-else name="download"></q-icon>
                  </q-btn>
                  <q-btn v-if="!progress && !newTokenIconUploading && bcmrNotFound == false"
                    @click.stop="openPublishRegistryFromFileDialog" size="md" icon="file_open" text-color="primary">
                    <q-tooltip>Publish registry from file</q-tooltip>
                  </q-btn>
                  <q-btn @click.stop="() => promptForRevisionOptions(publish, 'Confirm Publish')" size="md"
                    color="primary" :disabled="!!progress || newTokenIconUploading" fab>
                    <q-tooltip>Publish changes</q-tooltip>
                    <q-spinner
                      v-if="!!progress || newTokenIconUploading && !progress?.toString().includes('Download')"></q-spinner>
                    <q-icon v-else name="cloud_upload"></q-icon>
                  </q-btn>
                </div>
              </q-page-sticky> -->

            </div>
          </div>
        </q-page>
      </q-page-container>
    </q-layout>
    <q-inner-loading :showing="!!progress" id="inner-loading" style="background-color:#0000002b" class="bg-transparent">
      <q-spinner size="5em" color="warning" class="q-mb-lg"></q-spinner>
      <span class="bg-black q-py-sm q-px-md text-warning text-center" style="border-radius:10px">{{ progress }}</span>
    </q-inner-loading>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, onBeforeMount, computed, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUI } from 'src/stores/ui'
import { Bcmr, BcmrIndexer, ChainGraph } from 'src/apps';
import AddUriDialog from 'src/components/dialogs/AddUriDialog.vue'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import RegistryPublishFromFileDialog from 'src/components/dialogs/RegistryPublishFromFileDialog.vue';
import { BcmrStorageArtifact, IconStorageArtifact, PaginatedData } from 'src/apps/types';
import { useTokenStore } from 'src/stores/token'
import { ipfsToGatewayUrl, shortenTokenId, formatCommitment, isSquareImage, sortNftTypesASC, openTxInExplorer } from 'src/apps/utils'
import { NFTCapability, NftType, delay } from 'mainnet-js';
import { useQuasar } from 'quasar';
import { useLocalForage } from 'src/composables/useLocalForage';
import PublishRevisionOption from 'src/components/dialogs/PublishRevisionOption.vue';
import AuthbasePromptDialog from 'src/components/dialogs/AuthbasePromptDialog.vue';
import NftTypeDialog from 'src/components/dialogs/NftTypeDialog.vue'
// import { useAuthguardStore } from 'src/stores/authhead';
import { useEventBus } from 'src/composables';
import { useUser } from 'src/stores/user';
import { upload as uploadToIPFS } from 'src/apps/ipfs'
import { locateRegistry } from 'src/apps/bcmr';

const $q = useQuasar()
const ui = useUI()
const router = useRouter()
const route = useRoute()
// const authhead = useAuthguardStore()
const user = useUser()
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
const bcmrNotFound = ref<boolean>(false)
const bcmrSelectedAuthbase = ref<string>()
const bcmrIdentityHistories = ref<Date[]>()
const bcmrSelectedIdentityHistory = ref<Date>()
const bcmrNewRevision = ref<Date>()

const status = ref<'burned' | 'active' | 'unguarded'>('active')
const iconFileRef = ref()
// const newTokenIconFilePicker = ref()
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

/**
 * Table data source
 */
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
const nftTypesSelectedKeys = ref<Set<string>>(new Set()) // commitments
const nftTypesSelectedForPublication = ref<any[]>([])
const nftTypesUnpublished = ref() // Just a temporary storage to check that there are unpublished nfts on load
const showMintersInMintedNfts = ref<boolean>(false)

const nftTypesPagination = ref<{
  sortBy: string,
  descending: boolean,
  page: number,
  rowsPerPage: number,
  rowsNumber?: number
}>({
  sortBy: 'desc',
  descending: false,
  page: 1,
  rowsPerPage: 10
  // rowsNumber: 10
})

const nftTypesRowsPerPage = computed(() => {
  return [12, 24, 36]
})

const progress = ref<boolean | string>()

const isURI = /^(?:[a-zA-Z][a-zA-Z\d+\-.]*:\/\/)?[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(?:[^\s]*)$/

const bcmrApiHost = computed(() => {
  return process.env.BCMR_API
})

const isSequentialNftCollection = computed(() => {
  return (byteCode: string | undefined) => {
    if (!byteCode) return true
    if (byteCode != '00d26b') return true
    return false
  }
})

const computedTokenSymbol = computed(() => {
  if (bcmr.value?.identities && bcmrSelectedAuthbase.value) {
    if (bcmrNewRevision.value) {
      return bcmr.value.identities[bcmrSelectedAuthbase.value][bcmrNewRevision.value.toISOString()].token?.symbol || ''
    }
    if (bcmrSelectedIdentityHistory.value) {
      return bcmr.value.identities[bcmrSelectedAuthbase.value][bcmrSelectedIdentityHistory.value.toISOString()].token?.symbol || ''
    }
  }
  return ''
})

/**
 * For Sequential Nft Collection
 */
const computedNftSequenceNumber = computed(() => {
  return (commitment: string) => {
    if (commitment == '80') return '-0'
    if (commitment == '') return '0'
    return formatCommitment(commitment, 'vm-number', 'decimal')
  }
})

/**
 * Use ticker symbol if commitment decodes to negative or
 * invalid number per BCMR spec.
 */
const computedNftNameForSequentialNft = computed(() => {
  return (parseBytecode: string | undefined, commitment: string) => {
    if (!isSequentialNftCollection.value(parseBytecode)) return
    const sequenceNumber = computedNftSequenceNumber.value(commitment)
    if (sequenceNumber == '-0' || BigInt(sequenceNumber) < 0) {
      return `${computedTokenSymbol.value}-X${commitment}`
    }
    return ''
  }
})

const newRevision = () => {
  if (bcmrSelectedAuthbase.value) {
    publicationTx.value = ''
    bcmrNewRevision.value = new Date()
    // If no metadata, initialize empty bcmr
    if (!bcmrSelectedIdentityHistory.value && !bcmrIdentityHistories.value) {
      bcmrSelectedIdentityHistory.value = new Date()
      bcmrIdentityHistories.value = [bcmrSelectedIdentityHistory.value]
      bcmrNewRevision.value = bcmrSelectedIdentityHistory.value
      bcmr.value.identities = {
        [bcmrSelectedAuthbase.value]: {
          [bcmrNewRevision.value.toISOString()]: {
            name: '',
            description: '',
            token: {
              symbol: '',
              category: bcmrSelectedAuthbase.value,
              decimals: undefined
            },
            uris: {
              web: '',
              icon: ''
            }
          }
        }
      }
      document.getElementById('bcmr-form')?.removeAttribute('disabled')
      return
    }
    // If there's existing metadata
    bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevision.value.toISOString()]
      = JSON.parse(JSON.stringify(Object.assign({ name: '' }, bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrSelectedIdentityHistory.value!.toISOString()])))
    bcmrIdentityHistories.value?.push(bcmrNewRevision.value)
    bcmrSelectedIdentityHistory.value = bcmrNewRevision.value
    document.getElementById('bcmr-form')?.removeAttribute('disabled')
    if (!tokenStore.token.token) { // If non-token authhead, attach identity snapshot from loaded registry to the utxo
      tokenStore.token.identitySnapshot = bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevision.value.toISOString()]
    }
  }

}

type RevisionOption = { newVersion: string, newRevision: string, revisionOption: 'update' | 'create' }
type RevisionOptionCallback = (arg1: RevisionOption) => any

const promptForRevisionOptions = async (callback: RevisionOptionCallback, okLabel?: string) => {

  const isValid = await bcmrForm.value.validate()

  if (!isValid) {
    expansionItemOne.value = true
    expansionItemTwo.value = true
    $q.dialog({
      title: 'Validation failed!',
      message: 'Please check input fields for errors.',
      class: 'q-pa-md'
    })
  }

  if (!isValid) return

  if (bcmrNotFound.value) {
    // No need to prompt it there's no metadata found, i.e. we're creating a new one
    return callback({ revisionOption: 'create', newVersion: '1.0.0', newRevision: bcmrNewRevision.value?.toISOString() || new Date().toISOString() })

  }
  $q.dialog({
    component: PublishRevisionOption,
    componentProps: {
      version: bcmr.value.versionString,
      latestRevision: bcmr.value.latestRevision,
      newRevision: bcmrNewRevision.value?.toString() || new Date().toString(),
      okLabel: okLabel
    }
  }).onOk((options: RevisionOption) => {
    callback(options)
  })
}


const publish = async (revisionOptions: RevisionOption) => {
  tokenStore.token.transactionSigner = user.transactionSigner
  let { newVersion, revisionOption } = revisionOptions
  bcmrSelectedIdentityHistory.value = bcmrNewRevision.value
  bcmr.value.versionString = newVersion
  // progress.value = 'Authenticating authhead, please wait...'

  // try {
  //   const trackedAuthhead = await (new ChainGraph()).fetchAuthheadTxid(bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevision.value!.toISOString()].token!.category)
  //   progress.value = false
  // console.log(`🚀 Tracked Authhead = ${trackedAuthhead}, Authhead being used = ${tokenStore.token.txid}`)

  //   if (trackedAuthhead != tokenStore.token.txid) {
  //     await new Promise(res => {
  //       $q.dialog({
  //         message: `Output being spent (${tokenStore.token.txid}) does not match authhead (${trackedAuthhead}). Unauthorized to publish metadata for token ${shortenTokenId(bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevision.value!.toISOString()].token!.category)}.`,
  //         ok: true,
  //         focus: 'ok',
  //         class: 'q-pa-lg'
  //       }).onDismiss(() => res(null))
  //     })
  //     return
  //   }

  // } catch (error) {
  //   $q.dialog({
  //     message: `Error authenticating authhead, please try again later...`,
  //     ok: true,
  //     focus: 'ok',
  //     class: 'q-pa-lg'
  //   })
  // }
  progress.value = `Processing request. Authhead: ${tokenStore.token.txid}`
  const bcmrNewRevisionISOString = bcmrNewRevision.value!.toISOString()
  const tokenId = bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString].token!.category
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
      let clone = JSON.parse(JSON.stringify(nftType[nftType._meta.commitment]))
      delete clone.saved
      delete clone.published
      delete clone.forPublish
      bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString].token!.nfts!.parse!.types[nftType._meta.commitment] = clone
    }
  }
  bcmr.value.latestRevision = bcmrNewRevisionISOString
  bcmr.value.appendAuthGuardTokenStandardExtension(tokenStore.token?.authKey?.token?.tokenId)
  progress.value = 'Uploading registry to IPFS, please wait...'
  const tokenSymbol = bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString].token?.symbol
  bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString].token!.decimals = Number(bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevisionISOString].token?.decimals || 0)
  let tx = ''
  try {
    const artifact = await bcmr.value.storeRegistry(tokenId)

    const urls = []

    if (artifact?.uris?.ipfs) {
      urls.push(artifact?.uris?.ipfs)
    }
    if (artifact?.uris?.https) {
      urls.push(artifact?.uris?.https)
    }

    if (urls && artifact?.contentHash) {
      progress.value = 'Publishing, please wait...'
      tx = await tokenStore.token.publish({ url: urls, contentHash: artifact.contentHash })
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
    progress.value = 'Transaction sent, awaiting propagation...'
    try {
      await tokenStore.token.ownerWallet.waitForTransaction({ txHash: tx })
      await tokenStore.token.updateUtxo(tx)
      await tokenStore.token.updateAuthKeyUtxo(tx)
      $q.dialog({
        component: TransactionStatusDialog,
        componentProps: {
          statusType: 'success',
          statusText: `Metadata registry published!`,
          txid: tx
        }
      })
      $ebus?.emit('transaction', {
        txid: tx,
        txType: 'AuthchainIdentity.publish',
        timestamp: new Date().getTime(),
        successMsg: `Published ${tokenSymbol}'s registry'`
      })
      bcmrNewRevision.value = undefined
      publicationTx.value = tx
      bcmrNotFound.value = false
      document.getElementById('bcmr-form')?.setAttribute('disabled', '')
      await deleteSelectedPublishedNfts(nftTypesSelectedForPublication.value as [{ [key: string]: NftType } & { id: string }])

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


    try {
      if (publicationTx.value) {
        await localForage.registryTempStore.setItem(`registry:${tokenId}`, JSON.parse(bcmr.value.getContent()))
      }
    } catch (error) {
      await localForage.registryTempStore.removeItem(`registry:${tokenId}`)
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

const openPublishRegistryFromFileDialog = () => {
  if (Number(user.walletBchBalance || 0) < 0.00003) {
    $q.dialog({
      message: 'You do not have enough balance to publish a registry.',
      ok: 'OK'
    })
    return
  }
  $q.dialog({
    component: RegistryPublishFromFileDialog,
    componentProps: {
      authchainIdentity: tokenStore.token
    }
  }).onOk(async (param: { authbase: string, tx: string }) => {
    if (param.authbase && param.tx) {
      publicationTx.value = param.tx
      progress.value = 'Loading update...'
      try {
        const r = await locateRegistry(param.authbase)
        if (r) {
          initBcmr(r)
        }
      } catch (error) {
        $q.dialog({
          message: error?.toString() || 'Unable to load registry'
        })
      }
      progress.value = 'Updating authhead'
      await tokenStore.token.updateUtxo()
      await tokenStore.token.updateAuthKeyUtxo()
      progress.value = ''
      bcmrNewRevision.value = undefined
    }

  })
}

/**
 * Delete selected items in Unpublished table
 */
const deleteSelectedUnpublishedNfts = async () => {
  for (const [i, nftType] of nftTypesSelected.value.entries()) {
    await localForage.nftTypesStore.removeItem(nftType.id) // id is storage key
  }
  nftTypesSelected.value = []
  nftTypesSelectedKeys.value?.clear()
  await populateNftsTable()
}

/**
 * Delete the selected items in Unpublished table after it was published.
 * 
 */
const deleteSelectedPublishedNfts = async (recentlyPublished: [{ [key: string]: NftType } & { id: string }]) => {
  for (const [i, nftType] of recentlyPublished.entries()) {
    await localForage.nftTypesStore.removeItem(nftType.id) // id is storage key
  }
  nftTypesSelectedForPublication.value = []
  nftTypesSelectedKeys.value?.clear()
  populateNftsTable()
}

const commitSelectedUnpublishedNfts = () => {
  nftTypesSelectedForPublication.value = nftTypesSelected.value.map((nftType) => {
    nftType.forPublish = true
    return nftType
  })
}

const undoCommitOfUnpublishedNfts = () => {
  nftTypesSelected.value.forEach((i: any) => i.forPublish = false)
  nftTypesSelectedForPublication.value = []
}

const saveNewIconInIPFS = async () => {
  if (newTokenIconFile.value) {
    try {
      newTokenIconUploading.value = true
      const artifact = await uploadToIPFS(newTokenIconFile.value, { tokenId: tokenStore.token?.token?.tokenId })
      if (bcmrSelectedAuthbase.value && bcmrNewRevision.value && artifact?.uris?.ipfs) {
        bcmr.value.addIdentitySnapshotUri(bcmrSelectedAuthbase.value, bcmrNewRevision.value!.toISOString(), { icon: artifact?.uris?.ipfs })
      }

    } catch (error) {
      $q.dialog({
        message: error?.toString(),
        ok: true,
        focus: 'ok',
        class: 'q-pa-lg'
      })
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
    if (bcmrNewRevision.value && bcmrSelectedAuthbase.value) {
      bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevision.value!.toISOString()]
        .uris = {
        ...bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrNewRevision.value!.toISOString()]
          .uris, ...uri
      }
    }

  })
}

const openNftTypeDialog = async (token: { amount: number, category: string, commitment?: string, capability?: NFTCapability } & { [type: string]: NftType } & { _meta: { commitment: string, authbase: string, category: string } }) => {
  // Load from the unpublished list, in case user already added metadata and wants to edit
  let defaultNftType = nftTypesSelectedForPublication.value.find((v: { [key: string]: NftType }) => !!v[token.commitment!])

  let nftCollectionType = tokenStore?.token?.nftCollectionType // If authhead is token
  let identitySnapshot = tokenStore?.token?.identitySnapshot   // If authhead is token
  if (!nftCollectionType) { // to accomodate non-token authhead, we'll check the registry directly
    nftCollectionType = bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrSelectedIdentityHistory.value!.toISOString()!].token?.nfts?.parse?.bytecode ? 'ParsableNftCollection' : 'SequentialNftCollection'
  }
  if (!identitySnapshot) { // to accomodate non-token authhead, we'll check the registry directly
    identitySnapshot = bcmr.value.identities![bcmrSelectedAuthbase.value!][bcmrSelectedIdentityHistory.value!.toISOString()!]
  }

  if (!token._meta) {
    token._meta = {
      authbase: bcmrSelectedAuthbase.value!,
      commitment: token.commitment!,
      category: token.category
    }
  } else if (token._meta && !token.tokenId) { // When editing Published NftType
    // Dummy token for NftTypeDialog
    token.category = identitySnapshot.token?.category
    token.commitment = token._meta.commitment
    token.amount = 0
  }

  if (!defaultNftType?.name) {
    // Use the current metadata (from BCMR indexer) if any
    defaultNftType = token[token.commitment || token._meta.commitment]
  }
  // If no metadata suggest default
  if (!defaultNftType?.name) {
    defaultNftType = {
      name: nftCollectionType == 'SequentialNftCollection' ? `${identitySnapshot?.token?.symbol} - ${formatCommitment(token.commitment || '', 'vm-number', 'decimal')}` : `${identitySnapshot?.token?.symbol} - ${token.commitment}`,
      uris: {
        icon: '',
        asset: ''
      }
    }
  }


  $q.dialog({
    component: NftTypeDialog,
    componentProps: {
      token: token,
      title: nftCollectionType == 'SequentialNftCollection' ? `Metadata of ${identitySnapshot?.token?.symbol} #${formatCommitment(token.commitment || '', 'vm-number', 'decimal')}` : 'Metadata',
      defaultNftType: defaultNftType
    }
  }).onOk(async ({ type, nftType }) => {
    // Format, to preview metadata on `Minted` list
    token[type] = nftType
    token._meta = {
      commitment: type,
      category: identitySnapshot?.token?.category,
      authbase: identitySnapshot?.token?.category
    }

    await localForage.nftTypesStore.setItem(`${token._meta.category}-${type}`, { [type]: JSON.parse(JSON.stringify(nftType)) })
    const savedNftType = {
      id: `${token._meta.category}-${type}`,
      ...token
    }
    const s = nftTypesSelectedKeys.value.size
    if (nftTypesSelectedKeys.value.add(type).size > s) {
      nftTypesSelectedForPublication.value.push(savedNftType)
      nftTypesSelected.value.push(savedNftType)
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

  bcmr.value.latestRevision = bcmrNewRevisionISOString
  bcmr.value.appendAuthGuardTokenStandardExtension(tokenStore.token?.authKey?.token?.tokenId)
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
  delete nftTypesPagination.value.rowsNumber
  nftTypes.value.results = []
  if (bcmr.value && bcmrSelectedAuthbase.value && bcmrSelectedIdentityHistory.value) {
    // // Push to webworker
    nftTypes.value.count = Object.keys(bcmr.value.identities![bcmrSelectedAuthbase.value][bcmrSelectedIdentityHistory.value.toISOString()].token?.nfts?.parse?.types || {}).length
    // nftTypesPagination.value.rowsNumber = Object.keys(bcmr.value.identities![bcmrSelectedAuthbase.value][bcmrSelectedIdentityHistory.value.toISOString()].token?.nfts?.parse?.types || {}).length
    nftTypes.value.offset = (nftTypesPagination.value.page - 1) * nftTypesPagination.value.rowsPerPage
    nftTypes.value.limit = nftTypesPagination.value.rowsPerPage
    const types = bcmr.value.identities![bcmrSelectedAuthbase.value][bcmrSelectedIdentityHistory.value.toISOString()]
      .token?.nfts?.parse?.types || {}
    const category = bcmr.value.identities![bcmrSelectedAuthbase.value][bcmrSelectedIdentityHistory.value.toISOString()].token?.category
    const parseByteCode = bcmr.value.identities![bcmrSelectedAuthbase.value][bcmrSelectedIdentityHistory.value.toISOString()].token?.nfts?.parse?.bytecode

    const typesList = []
    if (category) {
      for (const nftTypeKey of Object.keys(types)) {
        const storageKey = `${category}-${nftTypeKey}`
        const savedUnpublishedNftMetadata = await localForage.nftTypesStore.getItem(storageKey)
        if (savedUnpublishedNftMetadata) {
          // use the saved unpublished version
          typesList.push({ ...savedUnpublishedNftMetadata, _meta: { commitment: nftTypeKey, modified: true } })
          continue
        }
        typesList.push({ [nftTypeKey]: types[nftTypeKey], _meta: { commitment: nftTypeKey } })
      }
    }

    nftTypes.value.results = typesList

    if (isSequentialNftCollection.value(parseByteCode)) {
      nftTypes.value.results = typesList.sort(sortNftTypesASC)
    }

    // nftTypes.value.results = Object.keys(types).map((k) => ({ [k]: types[k], _meta: { commitment: k } })).slice()
  }
}

const getUnpublishedNftTypesFromStorage = async () => {
  const results: any = []

  for (const [index, key] of (await localForage.nftTypesStore.keys()).entries()) {
    if (key.startsWith('undefined')) {
      await localForage.nftTypesStore.removeItem(key)
    }
    if (key.startsWith(bcmrSelectedAuthbase.value!)) {
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
  return results
}

const loadUnpublishedNftTypes = async () => {
  delete nftTypesPagination.value.rowsNumber
  const results = await getUnpublishedNftTypesFromStorage()
  nftTypesUnpublished.value = results
  nftTypes.value = {
    count: results.length,
    offset: 0,
    limit: 12,
    next: null,
    previous: null,
    results
  }
}

type MintedtokenItemType = {
  category: string,
  capability?: string,
  commitment?: string,
  amount?: number,
  metadata: { nft?: { [key: string]: NftType } }
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
    page: nftTypesPagination.value.page,
    include_metadata: true,
    capability: ['none', 'mutable']
  }
  if (showMintersInMintedNfts.value) {
    query.capability.push('minting')
  }
  const fntResp = await (new BcmrIndexer()).fetchMintedNftTypes(bcmrSelectedAuthbase.value!, query)
  if (fntResp && fntResp.results) {
    nftTypesPagination.value.rowsNumber = fntResp.count
    // Transform data for display. Attach previously saved but unpublished NftType metadata if any
    const transformedResults = []
    for (const mintedToken of fntResp.results) {
      const { metadata, ...token } = mintedToken as MintedtokenItemType
      if (metadata?.nft) {
        transformedResults.push({ ...token, ...metadata.nft })
        continue
      }
      const storageKey = `${token.category}-${token.commitment}`
      const savedUnpublishedNftMetadata = await localForage.nftTypesStore.getItem(storageKey)
      if (savedUnpublishedNftMetadata) {

        transformedResults.push({ ...token, ...savedUnpublishedNftMetadata, _meta: { modified: true } })
        continue
      }
      // default empty
      transformedResults.push({ ...token, ...{ [token.commitment as string]: {} } })
    }


    fntResp.results = transformedResults
    // fntResp.results = fntResp.results.map((item: MintedtokenItemType) => {
    //   // Transform
    //   const { metadata, ...token } = item
    //   if (metadata?.nft) {
    //     return { ...token, ...metadata.nft }
    //   }
    //   return { ...token, ...{ [token.commitment as string]: {} } }
    // })
    nftTypes.value = fntResp

  }
  progress.value = false
}

const populateNftsTable = async () => {
  nftTypesPagination.value.rowsPerPage
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
  await populateNftsTable()
}


watch(() => newTokenIconFile.value, async (file) => {
  if (file) {
    const squareIcon = await isSquareImage(file)
    if (!squareIcon) {
      $q.dialog({
        message: `Please provide a square icon. Recommended dimension is 400px by 400px.
        Icons should also be suitable for display against light and dark backgrounds. Transparency is supported.`
      })
    } else {
      newTokenIconPreview.value = URL.createObjectURL(file)
      newTokenIconUploadArtifact.value = undefined
      await saveNewIconInIPFS()
    }
  }
})

watch(() => nftTypesShown.value, async () => {
  await populateNftsTable()
})

watch(() => showMintersInMintedNfts.value, async () => {
  await populateNftsTable()
})

watch(() => bcmrNewRevision.value, async (v) => {
  if (v) {

  }
})

watch(() => tokenStore?.token?.processing, async (v) => {
  if (v) {
    progress.value = v
  } else {
    progress.value = false
  }
})

watch(() => progress.value, async (v) => {
  if (v) {
    document.getElementById('inner-loading')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
})

/**
 * @param {object} r The parsed BCMR json
 */
const initBcmr = (r: any) => {
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

    if (!tokenStore.token.token && bcmrSelectedAuthbase.value && bcmrSelectedIdentityHistory.value) { // If non-token authhead, attach identity snapshot from loaded registry
      tokenStore.token.identitySnapshot = r.identities[bcmrSelectedAuthbase.value][bcmrSelectedIdentityHistory.value.toISOString()]
    }

    loadNftTypes()
  }
}




const ipfsToGatewayUrls = (uris: string[]): string[] => {

  const gateways = [
    'https://w3s.link',
    'https://nftstorage.link'
  ]

  const arr = []
  for (let uri of uris) {
    if (uri.startsWith('ipfs://')) {
      const pathname = uri.replace('ipfs://', '')
      const urls = gateways.map((g: string) => {
        return `${g}/ipfs/${pathname}`
      })
      arr.push(...urls)
      continue
    }

    arr.push(uri)
  }
  return arr
}

const addSchemeToUris = (uris: string[]): string[] => {
  return uris.map((uri: string) => {
    if (isURI.test(uri) && !URL.canParse(uri) && !uri.startsWith('http')) {
      return 'https://' + uri
    }
    return uri
  })
}

const addDefaultBcmrPathToUris = (uris: string[]): string[] => {
  return uris.map((uri: string) => {
    if (isURI.test(uri) && URL.canParse(uri)) {
      const url = new URL(uri)
      if (url.pathname == '/') {
        url.pathname = '/.well-known/bitcoin-cash-metadata-registry.json'
      }
      return url.toString()
    }
    return uri
  })
}


/**
 * Collect URIs, add schemes to URIs if missing and use ipfs gateway for ipfs.
 */
const publishedUrisToBcmrDownloadSourceURLs = (uris: string[]) => {
  let cleanUrls = uris
  cleanUrls = ipfsToGatewayUrls(cleanUrls)
  cleanUrls = addSchemeToUris(cleanUrls)
  cleanUrls = addDefaultBcmrPathToUris(cleanUrls)

  const problematicPublicIpfsGateway = uris.find((url) => {
    if (URL.canParse(url)) {
      const u = new URL(url)
      return u.host.includes('dweb.link')
    }
    return false
  })

  if (problematicPublicIpfsGateway) {
    // add w3s.link gateway when one of the urls uses dweb.link public ipfs gateway
    let additionalUrl = problematicPublicIpfsGateway.replace('dweb.link', 'w3s.link')
    cleanUrls.push(additionalUrl)
  }

  cleanUrls = Array.from(new Set(cleanUrls))
  return cleanUrls
}


/**
 * Download registry from available URIs
 */
const downloadRegistryFromPublishedUris = async (publishedUris: string[]) => {
  const downloadSourceUrls = publishedUrisToBcmrDownloadSourceURLs(publishedUris)
  const downloadPromises = downloadSourceUrls.map(url => {
    return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch from ${url}`);
      }
      return response.json();
    })
  });

  const downloadResponse = await Promise.any(downloadPromises)
  return downloadResponse
}

const displayAuthheadAuthFailureDialog = async (authhead: string) => {
  await new Promise((resolve, reject) => {
    $q.dialog({
      title: 'Authhead Authentication Failed!',
      // message: 'This UTXO that you are using is not authorized to publish metadata for the provided authbase/Token ID',
      message: `It looks like Cashtokens Studio is trying to use the wrong authhead (${authhead}) for your token. 
        Don't worry it's either you entered the wrong tokenId/authbase or there's just a delay in the server and 
        CashStokens Studio is still using the old authhead. You may try again later or contact admin in telegram.`,
      class: 'q-pa-md text-justify'
    }).onDismiss(() => {
      router.back()
      resolve(null)
    })
  })
}

onBeforeMount(async () => {
  try {

    let tokenId = route.params.identifier || tokenStore.token?.token?.tokenId || tokenStore.token?.identitySnapshot?.token?.category
    // if (!tokenStore.token?.token?.tokenId && !tokenStore.token?.identitySnapshot?.token?.category) {
    //   return console.log('🚀 ~ onBeforeMount ~ is returning')
    // }
    if (!tokenId) return router.back()
    progress.value = 'Loading registry, please wait...'
    let r
    try {
      r = await localForage.registryTempStore.getItem(`registry:${tokenId}`)
    } catch (error) {
      console.log("🚀 ~ locateRegistry ~ error:", error)
    }

    if (!r || r == 'undefined') {
      r = await (new BcmrIndexer()).fetchRegistry(tokenId, true)
    }
    if (r) {
      initBcmr(r)
    } else {
      progress.value = `Unable to find registry from Paytaca's BCMR indexer.`
      await delay(1000)
      if (tokenStore.token.token?.tokenId) {
        progress.value = `Trying other methods please wait...`
        await delay(1000)
        progress.value = `Retrieving last registry publication, using the authhead UTXO's Token ID as authbase...`
        const pubInfo = await (new ChainGraph()).retrieveLastRegistryPublication(tokenId)
        if (pubInfo && pubInfo[0]) {
          if (pubInfo[0].httpsUrl || pubInfo[0].uris) {
            try {
              const downloadedRegistry = await downloadRegistryFromPublishedUris([...pubInfo[0].uris, pubInfo[0].httpsUrl])
              if (downloadedRegistry) {
                initBcmr(downloadedRegistry)
              }
            } catch (error) {
              console.log("🚀 ~ onBeforeMount ~ error:", error)
              // $q.dialog({
              //   message: `Found registry publication but unable to load from the published URL (${pubInfo[0].httpsUrl}). Verify that the URL exist or try again later`
              // })
            }
          }
        } else {
          bcmrNotFound.value = true

        }

        if (!bcmrSelectedAuthbase.value) {
          bcmrSelectedAuthbase.value = tokenId
          newRevision()
        }
      }
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
    console.log('Error removing registry cash from browser\'s storage')
  }

})

onMounted(async () => {

  ui.routeBack = `registries`

  if (!tokenStore.token.token?.tokenId) {
    $q.dialog({
      component: AuthbasePromptDialog
    }).onOk(async (authbase) => {
      try {
        // TODO: USE WATCHTOWER AS PRIMARY SOURCE
        progress.value = 'Authenticating authhead, please wait...'
        const cg = new ChainGraph()
        const authhead = await cg.fetchAuthheadTxid(authbase)
        if (tokenStore.token.txid != authhead) {
          progress.value = false
          return await displayAuthheadAuthFailureDialog(tokenStore.token.txid)
        }
        progress.value = 'Retrieving last published registry, please wait...'
        const pubInfo = await (new ChainGraph()).retrieveLastRegistryPublication(authbase)
        if (pubInfo && pubInfo[0]) {
          if (pubInfo[0].httpsUrl || pubInfo[0].uris) {
            try {
              const downloadedRegistry = await downloadRegistryFromPublishedUris([...pubInfo[0].uris, pubInfo[0].httpsUrl])
              if (downloadedRegistry) {
                initBcmr(downloadedRegistry)
              }
            } catch (error) {
              console.log("🚀 ~ onMounted ~ error:", error)
              $q.dialog({
                message: `Found registry publication but unable to load from the published URL (${pubInfo[0].httpsUrl}). Verify that the URL exist or try again later`
              })
            }
          }
        } else {
          bcmrNotFound.value = true
          bcmrSelectedAuthbase.value = authbase
          newRevision()
        }

      } catch (error) {
        console.log(error)
      } finally {
        progress.value = false
        expansionItemTwo.value = true
      }
    }).onCancel(() => {
      router.back()
    })
  }
  nftTypesUnpublished.value = await getUnpublishedNftTypesFromStorage()
})



</script>

<style scoped>
.disabled,
[disabled] {
  opacity: 0.8 !important;
}

/* Ensure form takes full width of container */
#bcmr-form {
  width: 100%;
  display: block;
}

#bcmr-form>div {
  width: 100%;
}
</style>