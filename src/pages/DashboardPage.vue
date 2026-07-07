<template>
  <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">

    <div class="q-px-md q-px-md-xl content-container">
      <div class="q-pa-md bg-dark text-white q-gutter-y-md">
        <div class="row q-col-gutter-md justify-center" style="max-width: 75rem; margin: 0 0;">

          <!-- 1. TOP HEADER BANNER CARD (DARK STYLE) -->
          <div class="col-12">
            <q-card flat class="bg-grey-10 relative-position overflow-visible" style=" min-height: 12rem; ">
              <!-- Subtle Dark Gradient Banner Background -->
              <div style="
                height: 12rem; 
                width: 100%; 
                background: linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #111827 100%);
              ">
              </div>

              <!-- Floating Avatar Container (Overlapping bottom edge) -->
              <div class="absolute-bottom row justify-center"
                style="margin-bottom: -2.25rem; left: 0; right: 0; z-index: 10;">
                <q-avatar size="7rem" class="shadow-2 bg-dark">
                  <img :src="`https://api.dicebear.com/10.x/miniavs/svg?seed=${primaryXPub}`" alt="Avatar">
                </q-avatar>
              </div>
            </q-card>
          </div>

          <div class="col-12 text-center q-mt-lg">
            <div class="text-h5 text-weight-bold text-white">{{ primaryXPub?.replace(primaryXPub.substring(8, 105),
              '...') }}
            </div>
            <div class="flex items-center justify-center">
              <q-btn icon="img:/images/bitcoin-cash-circle.svg" flat no-caps>
                <div class="q-px-sm">{{ formatBch(bchBalance) }}</div>
              </q-btn>
            </div>
          </div>
        </div>
        <q-scroll-area style="height: 3rem" :visible="false">
          <q-tabs v-model="activeTab" dense no-caps align="left" active-color="white" indicator-color="blue-5"
            class="text-grey-7 text-weight-bold" style="min-width: max-content;" shrink>
            <q-tab name="created">
              <div class="row items-center q-gutter-xs no-wrap">
                <q-icon name="brush" size="sm" />
                <span>Created Tokens</span>
                <q-badge color="grey-6" text-color="grey-3" class="q-ml-xs" rounded>
                  {{ authheads.length }}
                </q-badge>
              </div>
            </q-tab>
            <q-tab name="collected">
              <div class="row items-center q-gutter-xs no-wrap">
                <q-icon name="grid_view" size="sm" />
                <span>Collected Tokens</span>
                <q-badge color="grey-6" text-color="grey-4" class="q-ml-xs" rounded>
                  {{ allCollectedRows.length }}
                </q-badge>
              </div>
            </q-tab>
            <q-tab name="activity">
              <div class="row items-center q-gutter-xs no-wrap">
                <q-icon name="history" size="sm" />
                <span>Activity</span>
                <q-badge color="grey-6" text-color="grey-3" class="q-ml-xs" rounded>
                  {{ activities.length }}
                </q-badge>
              </div>
            </q-tab>
          </q-tabs>
        </q-scroll-area>
        <q-scroll-area style="max-width: 100vw; height: 100vh;" :visible="false">

          <q-tab-panels v-model="activeTab" animated class="bg-transparent text-grey-2">

            <!-- Created: Authheads Table -->
            <q-tab-panel name="created" class="q-pa-none">

              <div class="q-mb-sm text-grey-5 text-caption flex items-center">
                <div>Tokens you have authority and control over, including their metadata. </div><q-btn
                  v-if="authheads.length > 0" text-color="secondary" icon="mdi-creation" dense no-caps
                  @click="router.push({ name: 'create-token' })">Create New</q-btn>
              </div>

              <template v-if="authkeysLoading || authheadsLoading">
                <div v-for="i in 3" :key="i"
                  class="row items-center q-gutter-x-md q-pa-md bg-dark q-mb-sm rounded-borders">
                  <q-skeleton type="rect" size="36px" class="rounded-borders" />
                  <div class="column q-gutter-y-xs" style="flex: 1;">
                    <q-skeleton type="rect" height="14px" width="40%" class="rounded-borders" />
                    <q-skeleton type="rect" height="12px" width="25%" class="rounded-borders" />
                  </div>
                  <q-skeleton type="rect" height="14px" width="80px" class="rounded-borders" />
                </div>
              </template>
              <template v-else-if="authheads.length > 0">
                <div class="row q-gutter-sm q-mb-md">
                  <q-btn flat unelevated :color="tokenTypeFilter === 'all' ? 'grey-8' : 'transparent'"
                    :text-color="tokenTypeFilter === 'all' ? 'white' : 'grey-5'" :label="`All (${authheads.length})`"
                    @click="tokenTypeFilter = 'all'" class="q-px-sm" />
                  <q-btn flat unelevated :color="tokenTypeFilter === 'fungible' ? 'green-4' : 'transparent'"
                    :text-color="tokenTypeFilter === 'fungible' ? 'white' : 'grey-5'"
                    :label="`Fungible (${fungibleCount})`" @click="tokenTypeFilter = 'fungible'" class="q-px-sm" />
                  <q-btn flat unelevated :color="tokenTypeFilter === 'nft' ? 'blue-6' : 'transparent'"
                    :text-color="tokenTypeFilter === 'nft' ? 'white' : 'grey-5'" :label="`NFT (${nftCount})`"
                    @click="tokenTypeFilter = 'nft'" class="q-px-sm" />
                  <q-btn flat unelevated :color="tokenTypeFilter === 'mixed' ? 'purple-4' : 'transparent'"
                    :text-color="tokenTypeFilter === 'mixed' ? 'white' : 'grey-5'" :label="`Mixed (${mixedCount})`"
                    @click="tokenTypeFilter = 'mixed'" class="q-px-sm" />
                  <q-input v-model="createdSearchQuery" dark dense outlined placeholder="Search..." class="bg-grey-10"
                    style="border-radius: 0.75rem; min-width: 200px; margin-left: auto;">
                    <template v-slot:prepend>
                      <q-icon name="search" color="grey-6" size="xs" />
                    </template>
                    <template v-slot:append v-if="createdSearchQuery">
                      <q-icon name="close" color="grey-6" size="xs" class="cursor-pointer"
                        @click="createdSearchQuery = ''" />
                    </template>
                  </q-input>
                </div>
                <q-table :rows="filteredAuthheads" :columns="columns" :row-key="(row: any) => `${row.txid}:${row.vout}`"
                  flat class="border-radius-12 token-reserves-table" @row-click="onAuthheadsRowClick">
                  <template v-slot:body-cell-token="props">
                    <q-td :props="props">
                      <div class="flex items-center no-wrap q-gutter-x-md">
                        <div class="flex column items-center">
                          <q-avatar size="36px" class="bg-grey-9 border-radius-8 shadow-1">
                            <q-img v-if="props.row.identitySnapshot?.uris?.icon"
                              :src="ipfsToGatewayUrl(props.row.identitySnapshot?.uris?.icon)!" fit="cover"></q-img>
                            <q-img v-else
                              :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${props.row.token.commitment}`"
                              fit="cover">
                              <q-tooltip class="bg-grey-9 text-caption text-grey-4">No Icon — generated
                                placeholder</q-tooltip>
                            </q-img>
                          </q-avatar>
                          <span v-if="!props.row.identitySnapshot?.uris?.icon" class="text-grey-6 font-8 q-mt-xs"
                            style="line-height: 1;">No Icon</span>
                        </div>
                        <div>
                          <div class="flex items-center q-gutter-x-xs">
                            <span class="text-caption token-symbol">
                              {{ props.row.identitySnapshot?.token?.symbol || '?' }}
                            </span>
                            <span class="text-grey-7">-</span>
                            <span class="flex items-center text-caption text-grey-5 text-mono">
                              {{ shortenTokenId(props.row.token!.category) }}
                              <CopyText :text="props.row.token!.category" />
                            </span>
                          </div>
                          <div class="flex items-center q-gutter-x-xs q-mt-xs">
                            <q-badge v-if="getTokenType(props.row) === 'mixed'" color="dark" text-color="orange-4"
                              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                              <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                              Mixed
                            </q-badge>
                            <q-badge v-else-if="getTokenType(props.row) === 'nft'" color="dark" text-color="blue-6"
                              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                              <q-icon name="token" size="10px" class="q-mr-xs" />
                              NFT
                            </q-badge>
                            <q-badge v-else color="dark" text-color="green-4"
                              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                              <q-icon name="money" size="10px" class="q-mr-xs" />
                              Fungible
                            </q-badge>

                            <q-badge v-if="props.row.token?.nft?.capability === 'minting'" color="dark"
                              text-color="purple-4"
                              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                              <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                              Minting
                            </q-badge>
                            <q-badge v-else-if="props.row.token?.nft?.capability === 'mutable'" color="dark"
                              text-color="teal-10"
                              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                              <q-icon name="published_with_changes" size="10px" class="q-mr-xs" />
                              Mutable
                            </q-badge>
                            <q-badge v-else-if="props.row.token?.nft?.capability === 'none'" color="dark"
                              text-color="grey-6"
                              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge border-grey-8"
                              dense>
                              <q-icon name="lock_outline" size="10px" class="q-mr-xs" />
                              Immutable
                            </q-badge>
                          </div>
                        </div>
                      </div>
                    </q-td>
                  </template>

                  <template v-slot:body-cell-fungibleReserves="props">
                    <q-td :props="props" class="text-right">
                      <div v-if="['fungible', 'mixed'].includes(getTokenType(props.row))"
                        class="text-subtitle1 text-weight-bold text-mono text-white">
                        {{ formatTokenAmount(props.value, props.row.identitySnapshot?.token?.symbol || '',
                          props.row.identitySnapshot?.token?.decimals, 'none') }}
                      </div>
                      <div v-else class="text-grey-6 text-caption text-mono">N/A</div>
                      <div v-if="['fungible', 'mixed'].includes(getTokenType(props.row))"
                        class="text-caption text-grey-5 flex justify-end items-center q-gutter-x-xs">
                        <span>Decimals:</span>
                        <q-badge outline color="grey-7" class="text-weight-bold text-mono font-10 text-grey-4">
                          {{ props.row.identitySnapshot?.token?.decimals === undefined ? '?' :
                            props.row.identitySnapshot?.token?.decimals }}
                        </q-badge>
                      </div>
                    </q-td>
                  </template>

                  <template v-slot:body-cell-actions="value">
                    <q-td :props="value">
                      <q-btn round icon="more_vert" size=" sm">
                        <q-menu dark auto-close class="bg-dark-2 shadow-2">
                          <q-list dark class="bg-dark" dense style="min-width: 180px">
                            <q-item clickable @click="viewRegistry(value.row)">
                              <q-item-section avatar>
                                <q-icon name="description" color="secondary" size="xs" />
                              </q-item-section>
                              <q-item-section class="text-caption text-grey-3">View Registry</q-item-section>
                            </q-item>

                            <q-item clickable @click="navigateToAuthguard(value.row)">
                              <q-item-section avatar>
                                <q-icon name="lock" color="secondary" size="xs" />
                              </q-item-section>
                              <q-item-section class="text-caption text-grey-3">Token Vault</q-item-section>
                            </q-item>

                            <q-separator dark inset />

                            <q-item v-if="['fungible', 'mixed'].includes(getTokenType(value.row))" clickable
                              @click="openTransferDialog(value.row, 'issuance')">
                              <q-item-section avatar>
                                <q-icon name="mdi-send-circle-outline" color="primary" size="xs" />
                              </q-item-section>
                              <q-item-section class="text-caption text-grey-3">Release Reserves</q-item-section>
                            </q-item>

                            <q-item v-if="['fungible', 'mixed'].includes(getTokenType(value.row))" clickable
                              @click="openTransferDialog(value.row, 'burn')">
                              <q-item-section avatar>
                                <q-icon name="mdi-fire" color="orange" size="xs" />
                              </q-item-section>
                              <q-item-section class="text-caption text-grey-3">Burn Reserves</q-item-section>
                            </q-item>

                            <q-item
                              v-if="getTokenType(value.row) !== 'fungible' && value.row.token?.nft?.capability === 'minting'"
                              clickable @click="navigateToMint(value.row)">
                              <q-item-section avatar>
                                <q-icon name="add_circle" color="primary" size="xs" />
                              </q-item-section>
                              <q-item-section class="text-caption text-grey-3">Mint Child NFT</q-item-section>
                            </q-item>

                            <q-item v-if="getTokenType(value.row) !== 'fungible'" clickable
                              @click="openTransferDialog(value.row, 'burn')">
                              <q-item-section avatar>
                                <q-icon name="mdi-fire" color="orange" size="xs" />
                              </q-item-section>
                              <q-item-section class="text-caption text-grey-3">Burn</q-item-section>
                            </q-item>
                            <q-separator dark inset />
                            <q-item clickable @click="refreshCache(value.row.token!.category as string)">
                              <q-item-section avatar>
                                <q-icon name="refresh" color="grey-5" size="xs" />
                              </q-item-section>
                              <q-item-section class="text-caption text-grey-3">Refresh Cache</q-item-section>
                            </q-item>
                          </q-list>
                        </q-menu>
                      </q-btn>
                    </q-td>
                  </template>
                </q-table>
              </template>
              <template v-else>
                <div class="bg-dark q-pa-lg rounded-borders">
                  <div class="flex flex-center column q-py-lg">
                    <div class="flex flex-center q-mb-lg" style="height: 120px; width: 260px;">
                      <div class="playing-card"
                        style="z-index: 1; transform: rotate(-12deg) translateX(22px); margin-right: -30px;">
                        <q-icon name="brush" size="32px" color="grey-5" />
                      </div>
                      <div class="playing-card" style="z-index: 2; transform: rotate(-2deg);">
                        <q-icon name="token" size="32px" color="grey-5" />
                      </div>
                      <div class="playing-card"
                        style="z-index: 3; transform: rotate(8deg) translateX(-22px); margin-left: -30px;">
                        <q-icon name="auto_awesome" size="32px" color="grey-5" />
                      </div>
                    </div>
                    <div class="text-grey-5 text-h6 q-mb-lg">No created tokens yet</div>
                    <q-btn color="primary" icon="add" label="Create Token" unelevated size="lg"
                      @click="router.push({ name: 'create-token' })" />
                  </div>
                </div>
              </template>
            </q-tab-panel>

            <!-- Collected: Wallet Token UTXOs Table -->
            <q-tab-panel name="collected" class="q-pa-none">
              <div class="q-mb-sm text-grey-5 text-caption">
                Tokens you have received or collected in your wallet.
              </div>
              <div class="row q-gutter-sm q-mb-md">
                <q-btn flat unelevated :color="collectedTokenTypeFilter === 'all' ? 'grey-8' : 'transparent'"
                  :text-color="collectedTokenTypeFilter === 'all' ? 'white' : 'grey-5'"
                  :label="`All (${allCollectedRows.length})`" @click="collectedTokenTypeFilter = 'all'"
                  class="q-px-sm" />
                <q-btn flat unelevated :color="collectedTokenTypeFilter === 'fungible' ? 'green-4' : 'transparent'"
                  :text-color="collectedTokenTypeFilter === 'fungible' ? 'white' : 'grey-5'"
                  :label="`Fungible (${collectedFungibleCount})`" @click="collectedTokenTypeFilter = 'fungible'"
                  class="q-px-sm" />
                <q-btn flat unelevated :color="collectedTokenTypeFilter === 'nft' ? 'blue-6' : 'transparent'"
                  :text-color="collectedTokenTypeFilter === 'nft' ? 'white' : 'grey-5'"
                  :label="`NFT (${collectedNftCount})`" @click="collectedTokenTypeFilter = 'nft'" class="q-px-sm" />
                <q-btn flat unelevated :color="collectedTokenTypeFilter === 'mixed' ? 'purple-4' : 'transparent'"
                  :text-color="collectedTokenTypeFilter === 'mixed' ? 'white' : 'grey-5'"
                  :label="`Mixed (${collectedMixedCount})`" @click="collectedTokenTypeFilter = 'mixed'"
                  class="q-px-sm" />
                <q-input v-model="collectedSearchQuery" dark dense outlined placeholder="Search..." class="bg-grey-10"
                  style="border-radius: 0.75rem; min-width: 200px; margin-left: auto;">
                  <template v-slot:prepend>
                    <q-icon name="search" color="grey-6" size="xs" />
                  </template>
                  <template v-slot:append v-if="collectedSearchQuery">
                    <q-icon name="close" color="grey-6" size="xs" class="cursor-pointer"
                      @click="collectedSearchQuery = ''" />
                  </template>
                </q-input>
              </div>
              <template v-if="authkeysLoading || authheadsLoading">
                <div v-for="i in 3" :key="i"
                  class="row items-center q-gutter-x-md q-pa-md bg-dark q-mb-sm rounded-borders">
                  <q-skeleton type="rect" size="36px" class="rounded-borders" />
                  <div class="column q-gutter-y-xs" style="flex: 1;">
                    <q-skeleton type="rect" height="14px" width="40%" class="rounded-borders" />
                    <q-skeleton type="rect" height="12px" width="25%" class="rounded-borders" />
                  </div>
                  <q-skeleton type="rect" height="14px" width="80px" class="rounded-borders" />
                </div>
              </template>
              <template v-else>
                <q-table :rows="collectedUtxosWithIdentity" :columns="collectedColumns"
                  :row-key="(row: any) => row.isAggregated ? row.token.category : `${row.txid}:${row.vout}`" flat
                  class="border-radius-12 token-reserves-table" @row-click="onCollectedRowClick">
                  <template v-slot:body-cell-collectedToken="props">
                    <q-td :props="props">
                      <div class="flex items-center no-wrap q-gutter-x-md">
                        <div class="flex column items-center">
                          <q-avatar size="md">
                            <q-img v-if="props.row.identitySnapshot?.uris?.icon"
                              :src="ipfsToGatewayUrl(props.row.identitySnapshot?.uris?.icon)!" fit="cover"></q-img>
                            <q-img v-else
                              :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${props.row.token.commitment}`"
                              fit="cover">
                              <q-tooltip class="bg-grey-9 text-caption text-grey-4">No Icon — generated
                                placeholder</q-tooltip>
                            </q-img>
                          </q-avatar>
                          <span v-if="!props.row.identitySnapshot?.uris?.icon" class="text-grey-6 font-8 q-mt-xs"
                            style="line-height: 1;">No Icon</span>
                        </div>
                        <div>
                          <div class="flex items-center q-gutter-x-xs">
                            <span class="text-caption  token-symbol">
                              {{ props.row.identitySnapshot?.token?.symbol || '?' }} {{ props.row.token?.nft?.commitment
                                ?
                                `- ${props.row.token?.nft?.commitment}` : ''
                              }}
                            </span>
                          </div>
                          <div class="flex items-center q-gutter-x-xs q-mt-xs">
                            <span class="text-caption text-grey-5 text-mono">
                              {{ shortenTokenId(props.row.token!.category) }}
                              <CopyText :text="props.row.token!.category" />
                            </span>
                          </div>
                          <div class="flex items-center q-gutter-x-xs q-mt-xs">
                            <q-badge v-if="getTokenType(props.row) === 'mixed'" color="dark" text-color="purple-4"
                              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                              <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                              Mixed
                            </q-badge>
                            <q-badge v-else-if="getTokenType(props.row) === 'nft'" color="dark" text-color="blue-6"
                              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                              <q-icon name="token" size="10px" class="q-mr-xs" />
                              NFT
                            </q-badge>
                            <q-badge v-else color="dark" text-color="green-4"
                              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                              <q-icon name="money" size="10px" class="q-mr-xs" />
                              Fungible
                            </q-badge>

                            <q-badge v-if="props.row.token?.nft?.capability === 'minting'" color="dark"
                              text-color="purple-4"
                              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                              <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                              Minting
                            </q-badge>
                            <q-badge v-else-if="props.row.token?.nft?.capability === 'mutable'" color="dark"
                              text-color="teal-10"
                              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                              <q-icon name="published_with_changes" size="10px" class="q-mr-xs" />
                              Mutable
                            </q-badge>
                            <q-badge v-else-if="props.row.token?.nft?.capability === 'none'" color="dark"
                              text-color="grey-6"
                              class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge border-grey-8">
                              <q-icon name="lock_outline" size="10px" class="q-mr-xs" />
                              Immutable
                            </q-badge>
                          </div>
                        </div>
                      </div>
                    </q-td>
                  </template>

                  <template v-slot:body-cell-collectedAmount="props">
                    <q-td :props="props" class="text-right">
                      <div v-if="['fungible', 'mixed'].includes(getTokenType(props.row))"
                        class="text-subtitle1 text-weight-bold text-mono text-white">
                        {{ formatAmount(props.row.token?.amount, props.row.identitySnapshot?.token?.decimals) }}
                      </div>
                      <div v-else class="text-grey-6 text-caption text-mono">N/A</div>
                      <div v-if="['fungible', 'mixed'].includes(getTokenType(props.row))"
                        class="text-caption text-grey-5 flex justify-end items-center q-gutter-x-xs">
                        <span>Decimals:</span>
                        <q-badge outline color="grey-7" class="text-weight-bold text-mono font-10 text-grey-4">
                          {{ props.row.identitySnapshot?.token?.decimals === undefined ? '?' :
                            props.row.identitySnapshot?.token?.decimals }}
                        </q-badge>
                        <q-badge v-if="props.row.isAggregated" color="blue-grey-8" text-color="grey-3"
                          class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge border-grey-8">
                          {{ props.row.utxoCount }} UTXO{{ props.row.utxoCount !== 1 ? 's' : '' }}
                        </q-badge>
                      </div>
                    </q-td>
                  </template>

                  <template v-slot:body-cell-collectedActions="value">
                    <q-td :props="value">
                      <q-btn round icon="more_vert" size="sm">
                        <q-menu dark auto-close class="bg-dark-2 shadow-2">
                          <q-list dark class="bg-dark" dense style="min-width: 180px">
                            <q-item clickable @click="sendCollectedTokens(value.row)">
                              <q-item-section avatar>
                                <q-icon name="mdi-send-circle-outline" color="primary" size="xs" />
                              </q-item-section>
                              <q-item-section class="text-caption text-grey-3">Send Tokens</q-item-section>
                            </q-item>

                            <q-separator dark inset />

                            <q-item clickable @click="burnCollectedTokens(value.row)">
                              <q-item-section avatar>
                                <q-icon name="mdi-fire" color="orange" size="xs" />
                              </q-item-section>
                              <q-item-section class="text-caption text-grey-3">Burn Tokens</q-item-section>
                            </q-item>
                          </q-list>
                        </q-menu>
                      </q-btn>
                    </q-td>
                  </template>
                </q-table>
              </template>
            </q-tab-panel>

            <!-- Activity Table -->
            <q-tab-panel name="activity" class="q-pa-none">
              <div class="q-mb-sm text-grey-5 text-caption">
                Your recent token transaction history.
              </div>
              <div class="row q-gutter-sm q-mb-md items-center">
                <q-input v-model="activitySearchQuery" dark dense outlined placeholder="Search by event or txid..."
                  class="bg-grey-10" style="border-radius: 0.75rem; min-width: 200px;">
                  <template v-slot:prepend>
                    <q-icon name="search" color="grey-6" size="xs" />
                  </template>
                  <template v-slot:append v-if="activitySearchQuery">
                    <q-icon name="close" color="grey-6" size="xs" class="cursor-pointer"
                      @click="activitySearchQuery = ''" />
                  </template>
                </q-input>
                <q-btn flat color="grey-6" label="Clear Activities" @click="clearActivities" class="q-ml-sm" />
              </div>
              <q-table :rows="filteredActivities" :columns="activityColumns" :row-key="(row: any) => row.id"
                :pagination="{ rowsPerPage: 5 }" :loading="activityLoading" flat
                class="border-radius-12 token-reserves-table">
                <template v-slot:body-cell-activityEvent="props">
                  <q-td :props="props">
                    <span class="text-weight-bold text-white">{{ props.value }}</span>
                  </q-td>
                </template>
                <template v-slot:body-cell-activityTxid="props">
                  <q-td :props="props">
                    <span v-if="props.value" class="text-mono text-caption text-grey-4">{{ shortenTokenId(props.value)
                      }}
                      <CopyText :text="props.value" />
                    </span>
                    <span v-else class="text-grey-6 text-caption">—</span>
                  </q-td>
                </template>
                <template v-slot:body-cell-activityStatus="props">
                  <q-td :props="props">
                    <q-badge v-if="props.value === 'success'" color="green-9" text-color="green-3"
                      class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">{{
                        props.value }}</q-badge>
                    <q-badge v-else-if="props.value === 'failed'" color="red-9" text-color="red-3"
                      class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">{{
                        props.value }}</q-badge>
                    <q-badge v-else color="blue-9" text-color="blue-3"
                      class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">{{
                        props.value }}</q-badge>
                  </q-td>
                </template>
                <template v-slot:body-cell-activityDate="props">
                  <q-td :props="props">
                    <span class="text-grey-6 text-caption">{{ props.value }}</span>
                  </q-td>
                </template>
              </q-table>
            </q-tab-panel>

          </q-tab-panels>
        </q-scroll-area>
      </div>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useWizardConnectWallet } from 'src/composables/useWizardConnectWallet';
import { ref, computed, onMounted, onUnmounted, watch, triggerRef } from 'vue';
import { useAuthguardStore } from 'src/stores/authguard'
import { useRegistryStore } from 'src/stores/registry'
import { useAppStore } from 'src/stores/app'
import { storeToRefs } from 'pinia'
import { QTableColumn, useQuasar } from 'quasar'
import type { DecoratedUtxoFormSafe, UtxoWithPath, UtxoWithAuthKey, DecoratedUtxo } from 'src/core/types'
import { shortenCashAddress, shortenTokenId, getTokenType, isPureFungible, formatTokenAmount } from 'src/core/utils'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import { transferFungibleReserves, transferFts, jsonFormSafeUtxoReviver, jsonReplacer } from 'src/core/transaction'
import { broadcast } from 'src/core/transaction/broadcast'
import { useRouter } from 'vue-router'
import CopyText from 'components/CopyText.vue'
import FungibleTransferDialog from 'src/components/dialogs/FungibleTransferDialog.vue'
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue'
import { Network } from 'cashscript'
import { decodeCashAddress } from '@bitauth/libauth'
import { BaseWallet, NetworkType } from 'mainnet-js-v3'
import { db } from 'src/core/client-db'

const $q = useQuasar()
const router = useRouter()
const { wallet, walletLasySync, manager, walletIsReady } = useWizardConnectWallet()

const authguardStore = useAuthguardStore()
const { loadAuthkeys, loadAuthheads } = authguardStore
const { authheads, authkeysLoading, authheadsLoading } = storeToRefs(authguardStore)

const appStore = useAppStore()

const { loadRegistry, fetchIdentitySnapshot } = useRegistryStore()

const activities = ref<any[]>([])
const activityLoading = ref(false)
const activitySearchQuery = ref('')
const walletWatchers = ref<{
  stopWatchingReceiveWallet?: () => void,
  stopWatchingChangeWallet?: () => void,
  stopWatchingDefiWallet?: () => void,
}>({})

const primaryXPub = computed(() =>
  wallet.value?.session?.paths?.find((p: any) => p.name === 'receive')?.xpub
)

const primaryAddress = computed(() => {
  return wallet.value.getDepositAddress(0)
})


const activityColumns: QTableColumn[] = [
  {
    name: 'activityEvent',
    label: 'Event',
    field: 'event',
    align: 'left',
    sortable: true
  },
  {
    name: 'activityTxid',
    label: 'TXID',
    field: 'txid',
    align: 'left',
    sortable: true
  },
  {
    name: 'activityStatus',
    label: 'Status',
    field: 'status',
    align: 'left',
    sortable: true
  },
  {
    name: 'activityDate',
    label: 'Date',
    field: 'timestamp',
    align: 'left',
    sortable: true,
    format: (val: number) => new Date(val).toLocaleString()
  }
]

const loadActivities = async () => {
  try {
    activityLoading.value = true
    const records = await db.activity.orderBy('timestamp').reverse().toArray()
    activities.value = records
  } catch (error: any) {
    $q.notify({ type: 'Error', message: `Error loading activities: ${error.message}` })
  } finally {
    activityLoading.value = false
  }
}

const filteredActivities = computed(() => {
  let rows = activities.value
  if (activitySearchQuery.value) {
    const q = activitySearchQuery.value.toLowerCase()
    rows = rows.filter((r) => {
      const event = r.event?.toLowerCase() || ''
      const txid = r.txid?.toLowerCase() || ''
      return event.includes(q) || txid.includes(q)
    })
  }
  return rows
})

const clearActivities = async () => {
  try {
    await db.activity.clear()
    activities.value = []
  } catch (error: any) {
    $q.notify({ type: 'Error', message: `Error clearing activities: ${error.message}` })
  }
}

const VALID_TABS = ['created', 'collected', 'activity'] as const
type TabName = typeof VALID_TABS[number]

const getTabFromHash = (): TabName => {
  if (typeof (window) !== 'undefined') {
    const hash = window.location?.hash?.replace('#', '')
    if (VALID_TABS.includes(hash as TabName)) return hash as TabName
  }
  return 'created'
}

const activeTab = ref<TabName>(getTabFromHash())

const handleHashChange = () => {
  activeTab.value = getTabFromHash()
}
const tokenTypeFilter = ref<'all' | 'fungible' | 'nft' | 'mixed'>('all')
const collectedTokenTypeFilter = ref<'all' | 'fungible' | 'nft' | 'mixed'>('all')
const createdSearchQuery = ref('')
const collectedSearchQuery = ref('')

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
function formatAmount(value: any, decimals: number = 0): string {
  if (value == null || value === '') return '—'
  let formattedValue = value
  if (typeof formattedValue === 'bigint' || typeof formattedValue === 'number') {
    if (decimals > 0) {
      formattedValue = Number(formattedValue) / Math.pow(10, decimals)
    }
  } else if (!isNaN(Number(formattedValue)) && decimals > 0) {
    formattedValue = Number(formattedValue) / Math.pow(10, decimals)
  }
  return formattedValue.toLocaleString()
}

function formatBch(satoshis: bigint): string {
  const bch = Number(satoshis) / 100_000_000
  return bch.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })
}

const bchBalance = computed(() => {
  const utxos = wallet.value?.utxos || []
  return utxos.reduce((sum: bigint, u: any) => {
    if (!u.token) {
      return sum + BigInt(u.satoshis)
    }
    return sum
  }, 0n)
})

const walletTokenUtxos = computed(() =>
  (wallet.value?.utxos || []).filter((u: any) => !!u.token)
)

const fungibleCount = computed(() => authheads.value.filter(r => getTokenType(r) === 'fungible').length)
const nftCount = computed(() => authheads.value.filter(r => getTokenType(r) === 'nft').length)
const mixedCount = computed(() => authheads.value.filter(r => getTokenType(r) === 'mixed').length)

const allCollectedRows = computed(() => {
  let rows = walletTokenUtxos.value.map((utxo: any) => {
    const snapshot = registryStore.identitySnapshotCache[utxo.token!.category!]
    return { ...utxo, identitySnapshot: snapshot || undefined }
  })
  const grouped = new Map<string, any[]>()
  for (const row of rows) {
    const cat = row.token!.category!
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(row)
  }
  const result: any[] = []
  for (const [, catRows] of grouped) {
    if (catRows.every((r: any) => isPureFungible(r))) {
      const totalAmount = catRows.reduce((sum: bigint, r: any) => sum + BigInt(r.token.amount), BigInt(0))
      result.push({
        ...catRows[0],
        token: { ...catRows[0].token, amount: totalAmount },
        utxoCount: catRows.length,
        isAggregated: true,
        aggregatedUtxos: catRows,
      })
    } else {
      result.push(...catRows)
    }
  }
  return result
})

const collectedFungibleCount = computed(() => allCollectedRows.value.filter(r => getTokenType(r) === 'fungible').length)
const collectedNftCount = computed(() => allCollectedRows.value.filter(r => getTokenType(r) === 'nft').length)
const collectedMixedCount = computed(() => allCollectedRows.value.filter(r => getTokenType(r) === 'mixed').length)

function matchesSearch(row: any, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const symbol = row.identitySnapshot?.token?.symbol?.toLowerCase() || ''
  const category = row.token?.category?.toLowerCase() || ''
  return symbol.includes(q) || category.includes(q)
}

const filteredAuthheads = computed(() => {
  let rows = authheads.value
  if (tokenTypeFilter.value !== 'all') {
    rows = rows.filter(r => getTokenType(r) === tokenTypeFilter.value)
  }
  if (createdSearchQuery.value) {
    rows = rows.filter(r => matchesSearch(r, createdSearchQuery.value))
  }
  return rows
})

const registryStore = useRegistryStore()

const collectedUtxosWithIdentity = computed(() => {
  let rows = allCollectedRows.value
  if (collectedTokenTypeFilter.value !== 'all') {
    rows = rows.filter(r => getTokenType(r) === collectedTokenTypeFilter.value)
  }
  if (collectedSearchQuery.value) {
    rows = rows.filter(r => matchesSearch(r, collectedSearchQuery.value))
  }
  return rows
})

const loadCollectedIdentitySnapshots = async () => {
  const categories = [...new Set(walletTokenUtxos.value.map((u: any) => u.token?.category).filter(Boolean))]
  const results = await Promise.allSettled(categories.map(async (category) => {
    try {
      return await fetchIdentitySnapshot(category as string)
    } catch (e) {
      console.log('Failed to fetch identity snapshot for', category, e)
      return undefined
    }
  }))
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.log('Identity snapshot rejected for category', categories[index], result.reason)
    } else if (result.value === null || result.value === undefined) {
      console.log('No identity snapshot found for category', categories[index])
    }
  })
}

const columns: QTableColumn[] = [
  {
    name: 'token',
    label: 'Token',
    field: (row) => row.identitySnapshot?.token?.symbol || row.identitySnapshot?.name,
    align: 'left',
    sortable: true
  },
  {
    name: 'fungibleReserves',
    label: 'Fungible Reserves',
    field: (row) => row.token?.amount,
    align: 'right',
    sortable: true
  },
  {
    name: 'actions',
    label: '',
    field: 'actions',
    align: 'right'
  }
]

const collectedColumns = computed<QTableColumn[]>(() => {
  const cols: QTableColumn[] = [
    {
      name: 'collectedToken',
      label: 'Token',
      field: (row) => row.token?.category,
      align: 'left',
      sortable: true
    },
    {
      name: 'collectedAmount',
      label: 'Amount',
      field: (row) => row.token?.amount,
      align: 'right',
      sortable: true
    },
    {
      name: 'collectedActions',
      label: '',
      field: 'actions',
      align: 'right'
    }
  ]
  if (collectedTokenTypeFilter.value === 'nft') {
    return cols.filter(c => c.name !== 'collectedAmount')
  }
  return cols
})

const viewRegistry = (authhead: DecoratedUtxo) => {
  authguardStore.setActiveAuthhead(authhead)
  const query: Record<string, string> = { authbase: authhead.token?.category || '' }
  if (authhead.identitySnapshotIdentifier?.contentHash) {
    query.contentHash = authhead.identitySnapshotIdentifier.contentHash
  }
  router.push({ path: '/token/metadata-registry', query })
}

const navigateToAuthguard = (row: UtxoWithAuthKey) => {
  const authkeyCategory = row.authkey?.token?.category
  if (!authkeyCategory) return
  authguardStore.setActiveAuthhead(row)
  router.push(`/authguard/${authkeyCategory}?authhead=${row.txid}:${row.vout}`)
}

const viewCollectedRegistry = (row: any) => {
  router.push({ path: '/token/metadata-registry', query: { authbase: row.token?.category } })
}

const onCollectedRowClick = (_evt: Event, row: any, index: number) => {
  const type = getTokenType(row)
  if (type !== 'nft') return

  authguardStore.setActiveAuthhead(null as any)

  registryStore.setActiveNft({
    contentHash: '',
    authbase: '',
    timestamp: '',
    category: row.token?.category || '',
    commitmentOrBottomAltStack: row.token?.nft?.commitment || '',
    nftType: undefined,
    utxo: row as any,
    allowEdit: false
  })

  router.push(`/issuer/nft-collections/${row.token?.category}/nft`)
}

const onAuthheadsRowClick = (_evt: Event, row: any, index: number) => {
  authguardStore.setActiveAuthhead(row)
  router.push(`/authhead?authkey=${row.authkey.txid}:${row.authkey.vout}`)
}

const sendCollectedTokens = (row: any) => {
  $q.dialog({
    component: FungibleTransferDialog,
    componentProps: {
      transferType: 'send',
      tokenCategory: row.token!.category,
      balance: BigInt(row.token!.amount),
      decimals: row.identitySnapshot?.token?.decimals ?? 0,
      identitySnapshot: row.identitySnapshot,
      selfAddress: wallet.value?.getTokenDepositAddress(0),
    },
    focus: 'none'
  }).onOk(async (userInputs: { tokenAmount: bigint, recipient: string }) => {
    const loadingGroup = $q.loading.show({
      group: 'send-tokens-loading-group',
      message: 'Preparing. Checking wallet for inputs...'
    })
    try {
      const signRequest = transferFts({
        category: row.token!.category,
        tokenAmount: userInputs.tokenAmount,
        recipientAddress: userInputs.recipient,
        changeAddress: wallet.value!.getTokenDepositAddress(0),
        walletUtxos: (wallet.value!.utxos || []) as UtxoWithPath[],
        network: import.meta.env.VITE_BCH_NETWORK as Network,
        transferType: 'send'
      })
      loadingGroup({ message: 'Preparing transaction. Waiting for signature. Please check your wallet...' })
      const response = await manager.value!.signTransaction(signRequest)
      loadingGroup({ message: 'Broadcasting transaction, please wait...' })
      const broadcastResponse = await broadcast(response.signedTransaction)
      if (broadcastResponse.ok) {
        const broadcastResult = await broadcastResponse.json()
        if (broadcastResult.success) {
          loadingGroup({
            message: 'Broadcast success, awaiting tx propagation...'
          })

          const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet

          await (new BaseWallet(networkType)).waitForTransaction({
            txHash: broadcastResult.txid
          })

          await wallet.value?.sync()
          triggerRef(wallet)
          await db.saveActivity({ event: 'Transfer FTs', txid: broadcastResult.txid, status: 'success' })
          loadingGroup()
          $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
              statusType: 'success',
              statusText: 'Fungible tokens successfully sent',
              txid: broadcastResult.txid
            }
          })
        } else {
          throw new Error(broadcastResult.error)
        }
      }
    } catch (error: any) {
      console.log('error', error)
      $q.notify({ type: 'Error', message: error.message })
    } finally {
      loadingGroup()
    }
  })
}

const burnCollectedTokens = (row: any) => {
  const sampleAddress = wallet.value!.getTokenDepositAddress(0)
  const sampleDecodedAddress = decodeCashAddress(sampleAddress)
  if (typeof (sampleDecodedAddress) === 'string') {
    throw new Error(sampleDecodedAddress)
  }
  const burnAddress = `${sampleDecodedAddress.prefix}:${import.meta.env.VITE_BURN_ADDRESS}`

  $q.dialog({
    component: FungibleTransferDialog,
    componentProps: {
      transferType: 'burn',
      tokenCategory: row.token!.category,
      balance: BigInt(row.token!.amount),
      decimals: row.identitySnapshot?.token?.decimals ?? 0,
      identitySnapshot: row.identitySnapshot,
      burnAddress,
    },
    focus: 'none'
  }).onOk(async (userInputs: { tokenAmount: bigint }) => {
    const loadingGroup = $q.loading.show({
      group: 'burn-tokens-loading-group',
      message: 'Preparing. Checking wallet for inputs...'
    })
    try {
      const signRequest = transferFts({
        category: row.token!.category,
        tokenAmount: userInputs.tokenAmount,
        recipientAddress: burnAddress,
        changeAddress: wallet.value!.getTokenDepositAddress(0),
        walletUtxos: (wallet.value!.utxos || []) as UtxoWithPath[],
        network: import.meta.env.VITE_BCH_NETWORK as Network,
        transferType: 'burn'
      })
      loadingGroup({ message: 'Preparing transaction. Waiting for signature. Please check your wallet...' })
      const response = await manager.value!.signTransaction(signRequest)
      loadingGroup({ message: 'Broadcasting transaction, please wait...' })
      const broadcastResponse = await broadcast(response.signedTransaction)
      if (broadcastResponse.ok) {
        const broadcastResult = await broadcastResponse.json()
        if (broadcastResult.success) {
          loadingGroup({
            message: 'Broadcast success, awaiting tx propagation...'
          })
          const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
          await (new BaseWallet(networkType)).waitForTransaction({
            txHash: broadcastResult.txid
          })

          await wallet.value?.sync()
          triggerRef(wallet)
          await db.saveActivity({ event: 'Burn FTs', txid: broadcastResult.txid, status: 'success' })
          loadingGroup()
          $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
              statusType: 'success',
              statusText: 'Fungible tokens successfully burned',
              txid: broadcastResult.txid
            }
          })
        } else {
          throw new Error(broadcastResult.error)
        }
      }
    } catch (error: any) {
      console.log('error', error)
      $q.notify({ type: 'Error', message: error.message })
    } finally {
      loadingGroup()
    }
  })
}

const navigateToMint = (row: UtxoWithAuthKey) => {
  authguardStore.setActiveAuthhead(row)
  appStore.setActiveMinter(row as any)
  router.push('/issuer/nft-collections/' + row.token?.category + '/mint')
}

const refreshCache = async (category: string) => {
  await loadRegistry(category)
}

const openTransferDialog = (v: DecoratedUtxoFormSafe, action: 'issuance' | 'burn') => {
  if (!wallet.value?.utxos || wallet.value.utxos.length === 0) {
    return $q.notify({
      type: 'Error',
      message: 'Insufficient BCH balance'
    })
  }

  console.log('issuerTokenUtxo', v)
  const componentProps: Record<string, any> = {
    transferType: action,
    tokenCategory: v.token!.category,
    balance: BigInt(v.token!.amount),
    decimals: v.identitySnapshot?.token?.decimals ?? 0,
    identitySnapshot: v.identitySnapshot,
  }

  if (action === 'issuance') {
    componentProps.selfAddress = wallet.value.getTokenDepositAddress(0)
  } else if (action === 'burn') {
    const sampleAddress = wallet.value.getTokenDepositAddress(0)
    const sampleDecodedAddress = decodeCashAddress(sampleAddress)
    if (typeof (sampleDecodedAddress) === 'string') {
      throw new Error(sampleDecodedAddress)
    }
    componentProps.burnAddress = `${sampleDecodedAddress.prefix}:${import.meta.env.VITE_BURN_ADDRESS}`
  }


  $q.dialog({
    component: FungibleTransferDialog,
    componentProps,
    focus: 'none'
  }).onOk(async (userInputs: { tokenAmount: bigint, recipient: string }) => {
    const loadingGroup = $q.loading.show({
      group: 'issue-fungible-reserves-loading-group',
      message: 'Preparing. Checking wallet for inputs...'
    })

    const issuerTokenUtxo = JSON.parse(
      JSON.stringify(v, jsonReplacer),
      jsonFormSafeUtxoReviver,
    )

    try {
      let recipientAddress = userInputs.recipient
      if (action === 'burn') {
        recipientAddress = componentProps.burnAddress
      }


      const signRequest = transferFungibleReserves({
        issuerTokenUtxo,
        authkeyUtxo: issuerTokenUtxo.authkey,
        recipientAddress: recipientAddress,
        transferTokenAmount: userInputs.tokenAmount,
        network: import.meta.env.VITE_BCH_NETWORK as Network,
        funderUtxos: (wallet.value.utxos || []) as UtxoWithPath[],
        transferType: action
      })

      loadingGroup({
        message: 'Preparing transaction. Waiting for signature. Please check your wallet...'
      })
      const response = await manager.value!.signTransaction(signRequest)

      loadingGroup({
        message: 'Broadcasting transaction, please wait...'
      })

      const broadcastResponse = await broadcast(response.signedTransaction)

      if (broadcastResponse.ok) {
        const broadcastResult = await broadcastResponse.json()
        if (broadcastResult.success) {
          // await delay(2000)
          loadingGroup({
            message: 'Broadcast success, awaiting tx propagation...'
          })

          const networkType = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? NetworkType.Testnet : NetworkType.Mainnet
          await (new BaseWallet(networkType)).waitForTransaction({
            txHash: broadcastResult.txid
          })

          loadingGroup()
          await loadAuthkeys(wallet.value, true)
          triggerRef(wallet)
          await db.saveActivity({
            event: action === 'issuance' ? 'Release Reserves' : 'Burn Reserves',
            txid: broadcastResult.txid,
            status: 'success'
          })
          $q.dialog({
            component: TransactionStatusDialog,
            componentProps: {
              statusType: 'success',
              statusText: `Fungible token successfully ${action === 'issuance' ? 'issued' : 'burned'} from FT reserves`,
              txid: broadcastResult.txid
            }
          })
        } else {
          throw new Error(broadcastResult.error)
        }
      }
    } catch (error: any) {
      console.log('error', error)
      $q.notify({
        type: 'Error',
        message: error.message
      })
    } finally {
      loadingGroup()
    }
  })
}

watch(walletLasySync, async () => {
  await loadAuthkeys(wallet.value, true)
  triggerRef(wallet)
  await loadCollectedIdentitySnapshots()
})

watch(activeTab, async (newTab) => {
  if (newTab === 'activity') {
    await loadActivities()
  }
})

watch(activeTab, (newTab) => {
  if (typeof (window) !== 'undefined') {
    window.location.hash = newTab
  }
})

watch(() => walletIsReady.value, async (isReady, prevValue) => {
  console.log('IS READY', isReady)
  if (isReady && Boolean(prevValue) === false) {
    console.log('IS READYx', isReady)
    const authkeys = await loadAuthkeys(wallet.value, true)
    await loadAuthheads(authkeys)
    triggerRef(wallet)
    await loadCollectedIdentitySnapshots()
    await loadActivities()
    walletWatchers.value.stopWatchingReceiveWallet = await wallet.value?.receive?.watchStatus(async (status, address) => {
      await wallet.value?.sync()
      triggerRef(wallet)
    })
  }
})

onMounted(async () => {
  if (typeof (window) !== 'undefined') {
    window.addEventListener('hashchange', handleHashChange)
  }

})

onUnmounted(() => {
  if (typeof (window) !== 'undefined') {
    window.removeEventListener('hashchange', handleHashChange)
  }
  walletWatchers.value?.stopWatchingReceiveWallet?.()
  walletWatchers.value?.stopWatchingChangeWallet?.()
  walletWatchers.value?.stopWatchingDefiWallet?.()
})
</script>

<style scoped>
/* Prevent the page itself from ever growing wider than the viewport */
.page-root {
  max-width: 100vw;
  overflow-x: hidden;
}

/* Max-width container */
.content-container {
  max-width: 80rem;
  margin-left: auto;
  margin-right: auto;
  /* Critical: this must not exceed viewport width */
  width: 100%;
  box-sizing: border-box;
}

/* Dashboard header: translucent gradient from blue-10, fading to dark */
.avatar-banner-wrapper {
  background: linear-gradient(180deg,
      rgba(21, 101, 192, 0.04) 0%,
      /* blue-10 at 4% — subtle top glow */
      rgba(21, 101, 192, 0.015) 50%,
      /* nearly gone by midpoint */
      transparent 75%
      /* fully dark page bg */
    );
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  padding-bottom: 1.5rem;
  margin-bottom: 0.5rem;
}


/* Wallet address truncation */
.wallet-max-width {
  max-width: 25em;
}

/* Tabs: scrollable on small screens, no scrollbar visible */
.tabs-scroll-container {
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.tabs-scroll-container::-webkit-scrollbar {
  display: none;
}

/* NFT card */
.nft-card {
  border-radius: 1rem;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.nft-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
}

.nft-image {
  transition: transform 0.3s ease;
}

.nft-card:hover .nft-image {
  transform: scale(1.05);
}

/*
  Table scroll fix:
  - The wrapper must be a block-level element with a real bounded width.
  - overflow-x: auto only clips if the element has a width shorter than its content.
  - We use min-width: 0 to override any flex/grid stretch that would let it grow
    to match the table's natural width (which defeats overflow clipping).
*/
.table-scroll-wrapper {
  display: block;
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  /* Hide scrollbar but keep it functional */
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

/* The table itself is never allowed to shrink below this */
.table-min-width {
  min-width: 640px;
}

/* Activity table row */
.table-row {
  transition: background-color 0.15s ease;
}

.table-row:hover {
  background-color: rgba(255, 255, 255, 0.04);
}

.table-item-link:hover {
  text-decoration: underline;
}

/* Input border radius override */
:deep(.q-field--outlined .q-field__control) {
  border-radius: 0.75rem;
}

/* Table styles from issuer pages */
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

.action-btn-hover {
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.action-btn-hover:hover {
  transform: translateY(-1px);
  background-color: rgba(255, 255, 255, 0.08);
}

.text-mono {
  font-family: 'Courier New', Courier, monospace;
}

.font-8 {
  font-size: 0.75em;
}

.font-10 {
  font-size: 10px;
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.styled-capability-badge {
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.border-grey-8 {
  border: 1px solid #424242;
}

.playing-card {
  width: 80px;
  height: 110px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #1e1e1e;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}

/* Responsive Flex Rows */
.fluid-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

/* Explicit widths applied only on desktop screens */
@media (min-width: 600px) {
  .fluid-row {
    flex-direction: row;
    align-items: center;
    gap: 16px;
  }

  .fluid-label {
    flex: 0 0 160px;
    /* Perfectly aligns all labels in a straight vertical line */
  }

  .fluid-value {
    flex: 1;
    min-width: 0;
    /* Critical fix to let ellipsis work inside flexbox */
  }
}

/* Mobile-only safety utilities */
@media (max-width: 599px) {
  .full-width-mobile {
    width: 100%;
  }

  .fluid-value {
    width: 100%;
    margin-top: 2px;
  }
}

/* Subtle accent background container for keys/addresses */
.rounded-borders {
  border-radius: 6px;
}

.no-wrap-sm {
  flex-wrap: nowrap !important;
}
</style>
