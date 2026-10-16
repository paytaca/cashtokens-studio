<template>
  <q-page class="bg-dark-page text-grey-1 q-pb-xl page-root">
    <div class="q-px-md q-px-md-xl content-container q-mt-xl q-gutter-y-lg">
      <ExplainerBanner class="q-my-md" icon="brush" :title="$t('dashboard.pageTitle.managedTokens')"
        :description="$t('dashboard.managed.caption')">
        <template v-if="firstLoadPending">
          <!-- Reserve the button's space while the first load is pending, so the banner neither
               hides the action nor pops it in on token-holding wallets. -->
          <q-skeleton type="QBtn" style="width: 8.5rem" />
        </template>
        <template v-else-if="authheads.length > 0">
          <q-btn icon="mdi-creation" :label="$t('dashboard.managed.createNew')" color="secondary" no-caps
            @click="router.push({ name: 'create-token' })" rounded />
        </template>
      </ExplainerBanner>

      <!-- Transient: the authhead(s) an import just delivered. A copy of the table below so that the
           filtered table keeps its own behaviour untouched. Emptied when the user navigates away. -->
      <q-card v-if="receivedRows.length > 0" class="q-pa-lg rounded-borders received-card q-gutter-y-md">
        <div class="row items-center no-wrap q-gutter-x-sm">
          <q-avatar rounded color="warning" text-color="dark" size="36px">
            <q-icon name="move_to_inbox" size="20px" />
          </q-avatar>
          <div class="col">
            <div class="text-h6 text-weight-bold text-white">
              {{ $t('dashboard.managed.receivedTitle', receivedRows.length) }}
            </div>
            <div class="text-body2 text-grey-4">{{ $t('dashboard.managed.receivedDescription') }}</div>
          </div>
          <q-btn icon="close" flat round dense color="grey-6" @click="clearReceivedAuthheads" />
        </div>

        <q-table :rows="receivedRows" :columns="columns" :row-key="rowId" flat
          class="border-radius-12 token-reserves-table" @row-click.stop="onReceivedRowClick">
          <template v-slot:body-cell-token="props">
            <q-td :props="props">
              <div class="flex items-center no-wrap q-gutter-x-md">
                <div class="flex column items-center">
                  <q-avatar size="36px" class="bg-grey-9 border-radius-8 shadow-1">
                    <q-img v-if="props.row.identitySnapshot?.uris?.icon"
                      :src="ipfsToGatewayUrl(props.row.identitySnapshot?.uris?.icon)!" fit="cover"></q-img>
                    <q-img v-else
                      :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${props.row.token?.commitment}`"
                      fit="cover">
                      <q-tooltip class="bg-grey-9 text-caption text-grey-4">{{ $t('dashboard.managed.noIconTooltip') }}
                      </q-tooltip>
                    </q-img>
                  </q-avatar>
                  <span v-if="!props.row.identitySnapshot?.uris?.icon" class="text-grey-6 font-8 q-mt-xs"
                    style="line-height: 1">{{ $t('dashboard.managed.noIcon') }}</span>
                </div>
                <div>
                  <div class="flex items-center q-gutter-x-xs">
                    <span class="text-caption token-symbol">
                      {{
                        props.row.identitySnapshot?.token?.symbol ||
                        $t('dashboard.managed.symbolUnknown')
                      }}
                    </span>
                    <template v-if="props.row.token?.category">
                      <span class="text-grey-7">-</span>
                      <span class="flex items-center text-caption text-grey-5 text-mono">
                        {{ shortenTokenId(props.row.token.category) }}
                        <CopyText :text="props.row.token.category" />
                      </span>
                    </template>
                    <!-- A non-token authhead has no category, so identify it by the UTXO itself. -->
                    <span v-else class="flex items-center text-caption text-grey-5 text-mono">
                      {{ shortenTokenId(rowId(props.row)) }}
                      <CopyText :text="rowId(props.row)" />
                    </span>
                  </div>
                  <div class="flex items-center q-gutter-x-xs q-mt-xs">
                    <q-badge v-if="getTokenType(props.row) === 'mixed'" color="dark" text-color="orange-4"
                      class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                      <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                      {{ $t('dashboard.managed.badgeMixed') }}
                    </q-badge>
                    <q-badge v-else-if="getTokenType(props.row) === 'nft'" color="dark" text-color="blue-6"
                      class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                      <q-icon name="token" size="10px" class="q-mr-xs" />
                      {{ $t('dashboard.managed.badgeNft') }}
                    </q-badge>
                    <q-badge v-else color="dark" text-color="green-4"
                      class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                      <q-icon name="money" size="10px" class="q-mr-xs" />
                      {{ $t('dashboard.managed.badgeFungible') }}
                    </q-badge>

                    <q-badge v-if="props.row.token?.nft?.capability === 'minting'" color="dark" text-color="purple-4"
                      class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                      <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                      {{ $t('dashboard.managed.badgeMinting') }}
                    </q-badge>
                    <q-badge v-else-if="props.row.token?.nft?.capability === 'mutable'" color="dark"
                      text-color="teal-10"
                      class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                      <q-icon name="published_with_changes" size="10px" class="q-mr-xs" />
                      {{ $t('dashboard.managed.badgeMutable') }}
                    </q-badge>
                    <q-badge v-else-if="props.row.token?.nft?.capability === 'none'" color="dark" text-color="grey-6"
                      class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge border-grey-8"
                      dense>
                      <q-icon name="lock_outline" size="10px" class="q-mr-xs" />
                      {{ $t('dashboard.managed.badgeImmutable') }}
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
                {{
                  formatTokenAmount(
                    props.value,
                    props.row.identitySnapshot?.token?.symbol || '',
                    props.row.identitySnapshot?.token?.decimals,
                    'none'
                  )
                }}
              </div>
              <div v-else class="text-grey-6 text-caption text-mono">
                {{ $t('dashboard.managed.unavailable') }}
              </div>
              <div v-if="['fungible', 'mixed'].includes(getTokenType(props.row))"
                class="text-caption text-grey-5 flex justify-end items-center q-gutter-x-xs">
                <span>{{ $t('dashboard.managed.decimals') }}</span>
                <q-badge outline color="grey-7" class="text-weight-bold text-mono font-10 text-grey-4">
                  {{
                    props.row.identitySnapshot?.token?.decimals === undefined
                      ? $t('dashboard.managed.decimalsUnknown')
                      : props.row.identitySnapshot?.token?.decimals
                  }}
                </q-badge>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="value">
            <q-td :props="value">
              <q-btn round icon="more_vert" @click.stop>
                <q-menu dark auto-close class="bg-dark-2 shadow-2">
                  <q-list dark class="bg-dark" style="min-width: 180px">
                    <!-- <q-item v-if="value.row.token" clickable @click="viewRegistry(value.row)">
                      <q-item-section avatar>
                        <q-icon name="description" color="secondary" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.managed.actionViewRegistry') }}
                      </q-item-section>
                    </q-item> -->

                    <q-item clickable @click="navigateToAuthguard(value.row)">
                      <q-item-section avatar>
                        <q-icon name="mdi-safe-square-outline" color="secondary" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.managed.actionTokenVault') }}
                      </q-item-section>
                    </q-item>

                    <q-separator dark inset />

                    <q-item v-if="
                      ['fungible', 'mixed'].includes(getTokenType(value.row))
                    " clickable @click="openTransferDialog(value.row, 'issuance')">
                      <q-item-section avatar>
                        <q-icon name="mdi-send-circle-outline" color="primary" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.managed.actionReleaseReserves') }}
                      </q-item-section>
                    </q-item>

                    <q-item v-if="
                      ['fungible', 'mixed'].includes(getTokenType(value.row))
                    " clickable @click="openTransferDialog(value.row, 'burn')">
                      <q-item-section avatar>
                        <q-icon name="mdi-fire" color="orange" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.managed.actionBurnReserves') }}
                      </q-item-section>
                    </q-item>

                    <q-item v-if="
                      getTokenType(value.row) !== 'fungible' &&
                      value.row.token?.nft?.capability === 'minting'
                    " clickable @click="navigateToMint(value.row)">
                      <q-item-section avatar>
                        <q-icon name="add_circle" color="primary" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.managed.actionMintChildNft') }}
                      </q-item-section>
                    </q-item>

                    <q-separator dark inset />
                    <q-separator dark inset />
                    <q-item v-if="value.row.token" clickable @click="refreshCache(value.row.token!.category as string)">
                      <q-item-section avatar>
                        <q-icon name="refresh" color="grey-5" size="xs" />
                      </q-item-section>
                      <q-item-section class="text-caption text-grey-3">
                        {{ $t('dashboard.managed.actionRefreshCache') }}
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card>

      <q-card class="q-pa-lg rounded-borders">
        <template v-if="firstLoadPending">
          <q-banner rounded class="bg-grey-10 text-grey-4 q-mb-md">
            <template v-slot:avatar>
              <q-spinner-dots color="grey-5" />
            </template>
            {{ $t('dashboard.managed.scanningAuthguard') }}
          </q-banner>
          <div v-for="i in 3" :key="i" class="row items-center q-gutter-x-md q-pa-md bg-dark q-mb-sm rounded-borders">
            <q-skeleton type="rect" size="36px" class="rounded-borders" />
            <div class="column q-gutter-y-xs" style="flex: 1">
              <q-skeleton type="rect" height="14px" width="40%" class="rounded-borders" />
              <q-skeleton type="rect" height="12px" width="25%" class="rounded-borders" />
            </div>
            <q-skeleton type="rect" height="14px" width="80px" class="rounded-borders" />
          </div>
        </template>
        <template v-else-if="authheads.length > 0">
          <div class="row q-gutter-sm q-mb-md">
            <q-btn outline no-caps :color="tokenTypeFilter === 'all' ? 'white' : 'grey-6'"
              :class="{ 'text-weight-bold': tokenTypeFilter === 'all' }" :label="$t('dashboard.managed.filterAll', { count: authheads.length })
                " @click="tokenTypeFilter = 'all'" class="q-px-sm" />
            <q-btn outline no-caps :color="tokenTypeFilter === 'fungible' ? 'white' : 'grey-6'"
              :class="{ 'text-weight-bold': tokenTypeFilter === 'fungible' }" :label="$t('dashboard.managed.filterFungible', { count: fungibleCount })
                " @click="tokenTypeFilter = 'fungible'" class="q-px-sm" />
            <q-btn outline no-caps :color="tokenTypeFilter === 'nft' ? 'white' : 'grey-6'"
              :class="{ 'text-weight-bold': tokenTypeFilter === 'nft' }"
              :label="$t('dashboard.managed.filterNft', { count: nftCount })" @click="tokenTypeFilter = 'nft'"
              class="q-px-sm" />
            <q-btn outline no-caps :color="tokenTypeFilter === 'mixed' ? 'white' : 'grey-6'"
              :class="{ 'text-weight-bold': tokenTypeFilter === 'mixed' }"
              :label="$t('dashboard.managed.filterMixed', { count: mixedCount })" @click="tokenTypeFilter = 'mixed'"
              class="q-px-sm" />
            <q-input v-model="createdSearchQuery" dark dense outlined
              :placeholder="$t('dashboard.managed.searchPlaceholder')" class="bg-grey-10"
              style="border-radius: 0.75rem; min-width: 200px; margin-left: auto">
              <template v-slot:prepend>
                <q-icon name="search" color="grey-6" size="xs" />
              </template>
              <template v-slot:append v-if="createdSearchQuery">
                <q-icon name="close" color="grey-6" size="xs" class="cursor-pointer" @click="createdSearchQuery = ''" />
              </template>
            </q-input>
          </div>
          <q-table :rows="filteredAuthheads" :columns="columns" :row-key="(row: any) => `${row.txid}:${row.vout}`" flat
            class="border-radius-12 token-reserves-table" @row-click.stop="onAuthheadsRowClick">
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
                        <q-tooltip class="bg-grey-9 text-caption text-grey-4">{{ $t('dashboard.managed.noIconTooltip')
                          }}
                        </q-tooltip>
                      </q-img>
                    </q-avatar>
                    <span v-if="!props.row.identitySnapshot?.uris?.icon" class="text-grey-6 font-8 q-mt-xs"
                      style="line-height: 1">{{ $t('dashboard.managed.noIcon') }}</span>
                  </div>
                  <div>
                    <div class="flex items-center q-gutter-x-xs">
                      <span class="text-caption token-symbol">
                        {{
                          props.row.identitySnapshot?.token?.symbol ||
                          $t('dashboard.managed.symbolUnknown')
                        }}
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
                        {{ $t('dashboard.managed.badgeMixed') }}
                      </q-badge>
                      <q-badge v-else-if="getTokenType(props.row) === 'nft'" color="dark" text-color="blue-6"
                        class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                        <q-icon name="token" size="10px" class="q-mr-xs" />
                        {{ $t('dashboard.managed.badgeNft') }}
                      </q-badge>
                      <q-badge v-else color="dark" text-color="green-4"
                        class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                        <q-icon name="money" size="10px" class="q-mr-xs" />
                        {{ $t('dashboard.managed.badgeFungible') }}
                      </q-badge>

                      <q-badge v-if="props.row.token?.nft?.capability === 'minting'" color="dark" text-color="purple-4"
                        class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                        <q-icon name="auto_awesome" size="10px" class="q-mr-xs" />
                        {{ $t('dashboard.managed.badgeMinting') }}
                      </q-badge>
                      <q-badge v-else-if="props.row.token?.nft?.capability === 'mutable'" color="dark"
                        text-color="teal-10"
                        class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge">
                        <q-icon name="published_with_changes" size="10px" class="q-mr-xs" />
                        {{ $t('dashboard.managed.badgeMutable') }}
                      </q-badge>
                      <q-badge v-else-if="props.row.token?.nft?.capability === 'none'" color="dark" text-color="grey-6"
                        class="text-uppercase text-caption font-8 q-px-xs border-radius-4 styled-capability-badge border-grey-8"
                        dense>
                        <q-icon name="lock_outline" size="10px" class="q-mr-xs" />
                        {{ $t('dashboard.managed.badgeImmutable') }}
                      </q-badge>
                    </div>
                  </div>
                </div>
              </q-td>
            </template>

            <template v-slot:body-cell-fungibleReserves="props">
              <q-td :props="props" class="text-right">
                <!-- The reserves are read back from a different electrum server than the wallet's own
                     UTXOs, so a release lands a moment before this row can show the new amount. A
                     skeleton beats a number that is already wrong. -->
                <div v-if="isRefreshing(props.row)" class="flex column items-end q-gutter-y-xs">
                  <q-skeleton type="rect" height="20px" width="90px" class="rounded-borders" />
                  <q-skeleton type="rect" height="12px" width="60px" class="rounded-borders" />
                </div>
                <template v-else>
                  <div v-if="['fungible', 'mixed'].includes(getTokenType(props.row))"
                    class="text-subtitle1 text-weight-bold text-mono text-white">
                    {{
                      formatTokenAmount(
                        props.value,
                        props.row.identitySnapshot?.token?.symbol || '',
                        props.row.identitySnapshot?.token?.decimals,
                        'none'
                      )
                    }}
                  </div>
                  <div v-else class="text-grey-6 text-caption text-mono">
                    {{ $t('dashboard.managed.unavailable') }}
                  </div>
                  <div v-if="['fungible', 'mixed'].includes(getTokenType(props.row))"
                    class="text-caption text-grey-5 flex justify-end items-center q-gutter-x-xs">
                    <span>{{ $t('dashboard.managed.decimals') }}</span>
                    <q-badge outline color="grey-7" class="text-weight-bold text-mono font-10 text-grey-4">
                      {{
                        props.row.identitySnapshot?.token?.decimals === undefined
                          ? $t('dashboard.managed.decimalsUnknown')
                          : props.row.identitySnapshot?.token?.decimals
                      }}
                    </q-badge>
                  </div>
                </template>
              </q-td>
            </template>

            <template v-slot:body-cell-actions="value">
              <q-td :props="value">
                <q-btn round icon="more_vert" size="sm" @click.stop>
                  <q-menu dark auto-close class="bg-dark-2 shadow-2">
                    <q-list dark class="bg-dark" style="min-width: 180px">
                      <q-item clickable @click="viewRegistry(value.row)">
                        <q-item-section avatar>
                          <q-icon name="description" color="secondary" size="xs" />
                        </q-item-section>
                        <q-item-section class="text-caption text-grey-3">
                          {{ $t('dashboard.managed.actionViewRegistry') }}
                        </q-item-section>
                      </q-item>

                      <q-item clickable @click="navigateToAuthguard(value.row)">
                        <q-item-section avatar>
                          <q-icon name="mdi-safe-square-outline" color="secondary" size="xs" />
                        </q-item-section>
                        <q-item-section class="text-caption text-grey-3">
                          {{ $t('dashboard.managed.actionTokenVault') }}
                        </q-item-section>
                      </q-item>

                      <q-separator dark inset />

                      <q-item v-if="
                        ['fungible', 'mixed'].includes(getTokenType(value.row))
                      " clickable @click="openTransferDialog(value.row, 'issuance')">
                        <q-item-section avatar>
                          <q-icon name="mdi-send-circle-outline" color="primary" size="xs" />
                        </q-item-section>
                        <q-item-section class="text-caption text-grey-3">
                          {{ $t('dashboard.managed.actionReleaseReserves') }}
                        </q-item-section>
                      </q-item>

                      <q-item v-if="
                        ['fungible', 'mixed'].includes(getTokenType(value.row))
                      " clickable @click="openTransferDialog(value.row, 'burn')">
                        <q-item-section avatar>
                          <q-icon name="mdi-fire" color="orange" size="xs" />
                        </q-item-section>
                        <q-item-section class="text-caption text-grey-3">
                          {{ $t('dashboard.managed.actionBurnReserves') }}
                        </q-item-section>
                      </q-item>

                      <q-item v-if="
                        getTokenType(value.row) !== 'fungible' &&
                        value.row.token?.nft?.capability === 'minting'
                      " clickable @click="navigateToMint(value.row)">
                        <q-item-section avatar>
                          <q-icon name="add_circle" color="primary" size="xs" />
                        </q-item-section>
                        <q-item-section class="text-caption text-grey-3">
                          {{ $t('dashboard.managed.actionMintChildNft') }}
                        </q-item-section>
                      </q-item>

                      <q-separator dark inset />
                      <q-separator dark inset />
                      <q-item clickable @click="refreshCache(value.row.token!.category as string)">
                        <q-item-section avatar>
                          <q-icon name="refresh" color="grey-5" size="xs" />
                        </q-item-section>
                        <q-item-section class="text-caption text-grey-3">
                          {{ $t('dashboard.managed.actionRefreshCache') }}
                        </q-item-section>
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
              <div class="flex flex-center q-mb-lg" style="height: 120px; width: 260px">
                <div class="playing-card" style="
                  z-index: 1;
                  transform: rotate(-12deg) translateX(22px);
                  margin-right: -30px;
                ">
                  <q-icon name="brush" size="32px" color="grey-5" />
                </div>
                <div class="playing-card" style="z-index: 2; transform: rotate(-2deg)">
                  <q-icon name="token" size="32px" color="grey-5" />
                </div>
                <div class="playing-card" style="
                  z-index: 3;
                  transform: rotate(8deg) translateX(-22px);
                  margin-left: -30px;
                ">
                  <q-icon name="auto_awesome" size="32px" color="grey-5" />
                </div>
              </div>
              <div class="text-grey-5 text-h6 q-mb-lg">
                {{ $t('dashboard.managed.noCreatedTokens') }}
              </div>
              <q-btn color="primary" icon="add" :label="$t('dashboard.managed.createToken')" unelevated size="lg"
                @click="router.push({ name: 'create-token' })" />
            </div>
          </div>
        </template>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useWalletSigner } from 'src/composables/useWalletSigner';
import { ref, computed, onMounted, onUnmounted, watch, triggerRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthguardStore } from 'src/stores/authguard';
import { useRegistryStore } from 'src/stores/registry';
import { useAppStore } from 'src/stores/app';
import { storeToRefs } from 'pinia';
import { QTableColumn, useQuasar } from 'quasar';
import type {
  DecoratedUtxoFormSafe,
  UtxoWithPath,
  UtxoWithAuthKey,
  DecoratedUtxo,
} from 'src/core/types';
import {
  getTokenType,
  formatTokenAmount,
  shortenTokenId,
  debounce,
} from 'src/core/utils';
import type { Debounced } from 'src/core/utils';
import { ipfsToGatewayUrl } from 'src/core/ipfs';
import {
  transferFungibleReserves,
  jsonFormSafeUtxoReviver,
  jsonReplacer,
} from 'src/core/transaction';
import { useRouter } from 'vue-router';
import CopyText from 'components/CopyText.vue';
import ExplainerBanner from 'src/components/ExplainerBanner.vue';
import FungibleTransferDialog from 'src/components/dialogs/FungibleTransferDialog.vue';
import TransactionStatusDialog from 'src/components/dialogs/TransactionStatusDialog.vue';
import { Network } from 'cashscript';
import { decodeCashAddress } from 'bitauth-libauth-v3';
import { BaseWallet, NetworkType } from 'mainnet-js';
import { db } from 'src/core/client-db';
import { broadcastTransaction } from 'src/services/transaction';
import { useCancelableLoadingDialog } from 'src/composables/useCancelableLoadingDialog';
import { TASK_BROADCASTING, TASK_INPUTS_CHECK, TASK_PREPARE_TX, TASK_REFRESH_UTXOS, TASK_WAIT_FOR_SIG, TASK_WAITING_PROPAGATION, txTaskList, updateTxTaskLabel } from 'src/utils';
const { startLoader, updateStep, stopLoader, getSignal } = useCancelableLoadingDialog()

const { t } = useI18n();
const $q = useQuasar();
const router = useRouter();

const { wallet, walletIsReady, signTransaction } = useWalletSigner();

const authguardStore = useAuthguardStore();
const { loadAuthkeys, clearReceivedAuthheads } = authguardStore;
const {
  authheads,
  authheadsLastSync,
  authkeysLoading,
  authheadsLoading,
  receivedAuthheads,
} = storeToRefs(authguardStore);

const appStore = useAppStore();
const registryStore = useRegistryStore();
const { loadRegistry, setActiveIdentitySnapshot } = useRegistryStore();

const walletWatchers = ref<{
  stopWatchingReceiveWallet?: () => void;
  stopWatchingChangeWallet?: () => void;
  stopWatchingDefiWallet?: () => void;
}>({});

let debouncedChainRefresh: Debounced<[]>;
const cancelChainRefresh = () => debouncedChainRefresh?.cancel();

const tokenTypeFilter = ref<'all' | 'fungible' | 'nft' | 'mixed'>('all');
const createdSearchQuery = ref('');

const fungibleCount = computed(
  () => authheads.value.filter((r) => getTokenType(r) === 'fungible').length
);
const nftCount = computed(
  () => authheads.value.filter((r) => getTokenType(r) === 'nft').length
);
const mixedCount = computed(
  () => authheads.value.filter((r) => getTokenType(r) === 'mixed').length
);

/**
 * True while the first authhead load has not landed yet: an empty `authheads` list then means
 * "not known yet", never "the user has no tokens". Drops as soon as rows exist or a completed
 * load came back empty. Wallet-initializing signals keep it pending for the connecting window;
 * a never-connecting wallet falls back to the plain empty state, as before.
 */
const firstLoadPending = computed(
  () =>
    (authheads.value.length === 0 &&
      (Boolean(authkeysLoading.value) || Boolean(authheadsLoading.value))) ||
    (!authheadsLastSync.value &&
      (walletIsReady.value || Boolean(wallet.value?.initializing)))
);

const columns: QTableColumn[] = [
  {
    name: 'token',
    label: t('dashboard.managed.columnToken'),
    field: (row) =>
      row.identitySnapshot?.token?.symbol || row.identitySnapshot?.name,
    align: 'left',
    sortable: true,
  },
  {
    name: 'fungibleReserves',
    label: t('dashboard.managed.columnFungibleReserves'),
    field: (row) => row.token?.amount,
    align: 'right',
    sortable: true,
  },
  {
    name: 'actions',
    label: '',
    field: 'actions',
    align: 'right',
  },
];

function matchesSearch(row: any, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const symbol = row.identitySnapshot?.token?.symbol?.toLowerCase() || '';
  const category = row.token?.category?.toLowerCase() || '';
  return symbol.includes(q) || category.includes(q);
}

const filteredAuthheads = computed(() => {
  let rows = authheads.value;
  if (tokenTypeFilter.value !== 'all') {
    rows = rows.filter((r) => getTokenType(r) === tokenTypeFilter.value);
  }
  if (createdSearchQuery.value) {
    rows = rows.filter((r) => matchesSearch(r, createdSearchQuery.value));
  }
  return rows;
});

const rowId = (row: any) => `${row.txid}:${row.vout}`;

/**
 * The authhead row whose reserves are being re-read after a transaction.
 *
 * A release spends the vaulted output and creates a new one, so the row the user acted on keeps
 * showing its pre-transaction amount until the refresh replaces it — and that refresh is a chain
 * round-trip against a different electrum server than the wallet's own UTXOs. Marking the row lets
 * its reserves cell show a skeleton instead of a number that is already wrong.
 *
 * Identity is the pre-transaction `txid:vout`, which is exactly what disappears once the refresh
 * lands, so the flag clears itself rather than needing to be timed.
 */
const refreshingRowId = ref<string>();
let refreshingRowTimer: ReturnType<typeof setTimeout> | undefined;

const isRefreshing = (row: any) => refreshingRowId.value === rowId(row);

const endRowRefresh = () => {
  if (refreshingRowTimer) clearTimeout(refreshingRowTimer);
  refreshingRowTimer = undefined;
  refreshingRowId.value = undefined;
};

const beginRowRefresh = (id: string) => {
  refreshingRowId.value = id;
  if (refreshingRowTimer) clearTimeout(refreshingRowTimer);
  // Safety net: if the refreshed row never arrives (a re-read that fails outright), the skeleton
  // must not outlive the refresh attempt.
  refreshingRowTimer = setTimeout(endRowRefresh, 20_000);
};

watch(authheads, (rows) => {
  if (refreshingRowId.value && !rows.some((row) => rowId(row) === refreshingRowId.value)) {
    endRowRefresh();
  }
});

/**
 * The authheads an import just delivered. Rendered from the rows the import handed over — the chain
 * knows them before the registry does — and swapped for their decorated counterpart (icon, symbol,
 * ...) as soon as a reload brings metadata in. Cleared when the user leaves this page.
 */
const receivedRows = computed(() =>
  receivedAuthheads.value.map(
    (row) => authheads.value.find((a) => rowId(a) === rowId(row)) ?? row
  )
);

const viewRegistry = (authhead: DecoratedUtxo) => {
  authguardStore.setActiveAuthhead(authhead);
  const query: Record<string, string> = {
    authbase: authhead.token?.category || '',
  };
  // The registry pages resolve their record from IndexedDB by `registryIdentity`, so the row's
  // identity travels with the navigation — the same way the authhead-view row handler passes it.
  const registryIdentity = authhead.identitySnapshotIdentifier?.registryIdentity;
  if (typeof registryIdentity === 'string') {
    query.registryIdentity = registryIdentity;
  }
  if (authhead.identitySnapshotIdentifier?.contentHash) {
    query.contentHash = authhead.identitySnapshotIdentifier.contentHash;
  }
  router.push({ name: 'edit-registry', query });
};

const navigateToAuthguard = (row: UtxoWithAuthKey) => {
  const authkeyCategory = row.authkey?.token?.category;
  if (!authkeyCategory) return;
  authguardStore.setActiveAuthhead(row);
  router.push(`/authguard/${authkeyCategory}?authhead=${row.txid}:${row.vout}`);
};

const onAuthheadsRowClick = (_evt: Event, row: any, index: number) => {
  _evt.preventDefault();
  authguardStore.setActiveAuthhead(row);
  setActiveIdentitySnapshot(row.identitySnapshot);
  router.push({
    name: 'view-authhead',
    query: {
      authkey: `${row.authkey.txid}:${row.authkey.vout}`,
      authhead: `${row.txid}:${row.vout}`,
      authbase:
        row.identitySnapshotIdentifier?.identity?.authbase ||
        row.token!.category,
      registryIdentity: row.identitySnapshotIdentifier?.registryIdentity,
      contentHash: row.identitySnapshotIdentifier?.contentHash,
      timestamp: row.identitySnapshotIdentifier?.identity?.timestamp,
    },
  });
};

/**
 * The import flow can hand over a non-token authhead, which the store's loader skips and the shared
 * row handler cannot key a registry query on. Fall back to the authguard vault that holds it.
 */
const onReceivedRowClick = (evt: Event, row: any, index: number) => {
  if (!row.token?.category) {
    authguardStore.setActiveAuthhead(row);
    router.push({ name: 'view-authguard', params: { authkeyCategory: row.authkey?.token?.category } });
    return;
  }
  onAuthheadsRowClick(evt, row, index);
};

const navigateToMint = (row: UtxoWithAuthKey) => {
  authguardStore.setActiveAuthhead(row);
  appStore.setActiveMinter(row as any);
  router.push({
    name: 'nft-collection-mint',
    params: {
      category: row.token!.category
    }
  })
};

const refreshCache = async (category: string) => {
  await loadRegistry(category);
};

const openTransferDialog = (
  v: DecoratedUtxoFormSafe,
  action: 'issuance' | 'burn'
) => {
  if (!wallet.value?.utxos || wallet.value.utxos.length === 0) {
    return $q.notify({
      type: 'Error',
      message: t('dashboard.notify.insufficientBch'),
    });
  }

  const componentProps: Record<string, any> = {
    transferType: action,
    tokenCategory: v.token!.category,
    balance: BigInt(v.token!.amount),
    decimals: v.identitySnapshot?.token?.decimals ?? 0,
    identitySnapshot: v.identitySnapshot,
  };


  if (action === 'issuance') {
    componentProps.selfAddress = wallet.value.getTokenDepositAddress(0);
  } else if (action === 'burn') {
    const sampleAddress = wallet.value.getTokenDepositAddress(0);
    const sampleDecodedAddress = decodeCashAddress(sampleAddress);
    if (typeof sampleDecodedAddress === 'string') {
      throw new Error(sampleDecodedAddress);
    }
    componentProps.burnAddress = import.meta.env.VITE_BURN_ADDRESS
  }

  $q.dialog({
    component: FungibleTransferDialog,
    componentProps,
    focus: 'none',
  }).onOk(async (userInputs: { tokenAmount: bigint; recipient: string }) => {

    startLoader(txTaskList, () => {
      $q.notify({ type: 'warning', message: 'Cancelled by user' })
    })

    updateStep(TASK_INPUTS_CHECK, 'done')

    updateStep(TASK_PREPARE_TX, 'running')

    const issuerTokenUtxo = JSON.parse(
      JSON.stringify(v, jsonReplacer),
      jsonFormSafeUtxoReviver
    );

    try {
      let recipientAddress = userInputs.recipient;
      if (action === 'burn') {
        recipientAddress = componentProps.burnAddress;
      }

      const signRequest = transferFungibleReserves({
        issuerTokenUtxo,
        authkeyUtxo: issuerTokenUtxo.authkey,
        recipientAddress: recipientAddress,
        transferTokenAmount: userInputs.tokenAmount,
        network: import.meta.env.VITE_BCH_NETWORK as Network,
        funderUtxos: (wallet.value?.utxos || []) as UtxoWithPath[],
        transferType: action,
      });

      const tokenChange = issuerTokenUtxo.token.amount - userInputs.tokenAmount

      updateStep(TASK_PREPARE_TX, 'done')
      updateStep(TASK_WAIT_FOR_SIG, 'running')

      const response = await signTransaction(signRequest, { signal: getSignal() });

      updateStep(TASK_WAIT_FOR_SIG, 'done')

      updateStep(TASK_BROADCASTING, 'running')

      const [broadcastError, txid] = await broadcastTransaction({
        transactionHex: response.signedTransaction,
        network: import.meta.env.VITE_BCH_NETWORK,
        onProgress: (progress: string) => {
          // loadingGroup({ message: progress });
          const newLabel = updateTxTaskLabel({ txTaskList: txTaskList, taskId: TASK_BROADCASTING, newTaskLabel: progress })
          updateStep(TASK_BROADCASTING, 'running', newLabel)
        },
      });

      if (broadcastError) {
        updateStep(TASK_BROADCASTING, 'failed')
        throw broadcastError;
      }


      updateStep(TASK_BROADCASTING, 'done')
      // The row the user acted on is stale from here on: mark it before the wait so its reserves
      // cell shows the refresh instead of the previous amount.
      beginRowRefresh(rowId(v))
      updateStep(TASK_WAITING_PROPAGATION, 'running')

      const networkType =
        import.meta.env.VITE_BCH_NETWORK === 'chipnet'
          ? NetworkType.Testnet
          : NetworkType.Mainnet;

      // Two providers, two views of the same chain. `waitForTransaction` resolves on mainnet-js's
      // electrum server, but the authhead's reserves are read back through cashscript's — a
      // different host entirely. Waiting only on the former let a landed release leave the reserves
      // column showing its previous amount, so also wait on the AuthGuard contract's own address,
      // the client the refresh actually uses.
      await Promise.all([
        new BaseWallet(networkType).waitForTransaction({
          txHash: txid,
        }),
        // waitForAuthheadSpent({
        //   address: v.address,
        //   authheadId: `${v.txid}:${v.vout}`,
        //   network: import.meta.env.VITE_BCH_NETWORK as Network,
        // }),
      ]);

      const spentAuthhead = authheads.value.find((authhead) => {
        return authhead.txid === issuerTokenUtxo.txid && authhead.vout === 0
      })

      let authheadUpdated = false

      if (spentAuthhead) {
        spentAuthhead.txid = txid
        spentAuthhead.vout = 0
        spentAuthhead.token!.amount = tokenChange
        spentAuthhead.authkey!.txid = txid
        spentAuthhead.authkey!.vout = 1
        authheadUpdated = true
      }

      updateStep(TASK_WAITING_PROPAGATION, 'done')
      updateStep(TASK_REFRESH_UTXOS, 'running')
      if (!authheadUpdated) {
        await loadAuthkeys(wallet.value, true, true);
      }

      updateStep(TASK_REFRESH_UTXOS, 'done')
      stopLoader(1000)

      triggerRef(wallet);
      await db.saveActivity({
        event:
          action === 'issuance'
            ? t('dashboard.notify.activityEventReleaseReserves')
            : t('dashboard.notify.activityEventBurnReserves'),
        txid: txid,
        status: 'success',
      });
      $q.dialog({
        component: TransactionStatusDialog,
        componentProps: {
          statusType: 'success',
          statusText: t('dashboard.notify.reservesIssued', {
            action:
              action === 'issuance'
                ? t('dashboard.notify.reservesActionIssued')
                : t('dashboard.notify.reservesActionBurned'),
          }),
          txid: txid,
        },
      });
    } catch (error: any) {
      stopLoader(3000)
      endRowRefresh()
      if (error?.name === 'AbortError') return
      $q.notify({
        type: 'Error',
        message: error.message,
      });
    }
  });
};

watch(
  () => walletIsReady.value,
  async (isReady, prevValue) => {
    if (isReady && !prevValue) {
      loadAuthkeys(wallet.value);

      triggerRef(wallet);

      debouncedChainRefresh = debounce(async () => {
        await wallet.value?.sync();
        await loadAuthkeys(wallet.value, undefined, true);
        triggerRef(wallet);
      }, 300);

      walletWatchers.value.stopWatchingReceiveWallet =
        await wallet.value?.receive?.watchStatus(
          async (status: any, address: any) => {
            debouncedChainRefresh();
          }
        );
    }
  },
  { immediate: true }
);

onMounted(async () => {
  if (receivedAuthheads.value.length === 0 || !walletIsReady.value) return;
  // Reach the chain directly: the deposit landed in the vault contract, so the wallet's own
  // watchers never see it, and this page has no other load on arrival.
  await loadAuthkeys(wallet.value, true, true);
  triggerRef(wallet);
});

onUnmounted(() => {
  clearReceivedAuthheads();
  cancelChainRefresh();
  endRowRefresh();
  walletWatchers.value?.stopWatchingReceiveWallet?.();
  walletWatchers.value?.stopWatchingChangeWallet?.();
  walletWatchers.value?.stopWatchingDefiWallet?.();
});
</script>

<style scoped>
.page-root {
  max-width: 100vw;
  overflow-x: hidden;
}

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

.received-card {
  border: 1px solid rgba(255, 193, 7, 0.35);
  background: linear-gradient(135deg,
      rgba(255, 193, 7, 0.07) 0%,
      rgba(30, 34, 43, 0.98) 55%);
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
</style>
