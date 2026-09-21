<template>
  <div class="q-pa-md q-gutter-sm">
    <q-tree :nodes="menu" node-key="href" no-connectors v-model:selected="selected">
      <template v-slot:default-header="prop">
        <div class="row items-center sidebar-link" :class="{ 'sidebar-selected': selected === prop.node.href }">
          <q-icon :name="prop.node.icon || 'share'"
            :color="prop.node.label == 'Authguards' || prop.node.label == 'Authguard Keys' ? 'orange' : undefined"
            size="28px" class="q-mr-sm" />
          <div>{{ prop.node.label }}</div>
        </div>
      </template>
    </q-tree>
  </div>
</template>

<script setup lang="ts">

import { useRouter, useRoute } from 'vue-router'
import { ref, computed, watch } from 'vue'
import { useUser } from 'src/stores/user'

defineOptions({ name: 'SidebarMenu' })
const route = useRoute()
const router = useRouter()
const user = useUser()
const hrefs = {
  createAuthKey: '/issuer/tokens/create/authkey',
  manageFTReserves: '/issuer/manage/ft-reserves',
  manageNFTReserves: '/issuer/manage/nft-reserves',
  manageRegistries: '/issuer/manage/registries',
  manageAuthchains: '/issuer/manage/authchains',
  manageAuthKeys: '/issuer/manage/authkeys',
  manageAuthGuards: '/issuer/manage/authguards',
  accountFungibles: '/account/balance/fungibletokens',
  accountCollectibles: '/account/balance/collectibles',
  recentTransactions: '/account/recent-transactions',
  createNewToken: '/issuer/tokens/create',
  importAuthUtxo: '/issuer/tokens/import-auth-utxo',
  dashboard: '/dashboard',
  managedTokens: '/dashboard/managed-tokens',
  collectedTokens: '/dashboard/collected-tokens',
  activities: '/dashboard/activities',
}

const selected = ref<string | null>(hrefs.dashboard)

const menu = computed<any[]>(() => {
  return [
    {
      label: 'Dashboard',
      href: hrefs.dashboard,
      icon: 'dashboard',
    },
    {
      label: 'Create New Token',
      href: '/token/create',
      icon: 'add',
    },
    {
      label: 'Create New AuthKey',
      href: '/authguard/authkeys/create',
      icon: 'add',
    },

    {
      label: 'Created Tokens',
      href: hrefs.managedTokens,
      icon: 'brush',
    },
    {
      label: 'Collected Tokens',
      href: hrefs.collectedTokens,
      icon: 'grid_view',
    },

    // {
    //   label: 'Import Auth Utxo',
    //   href: hrefs.importAuthUtxo,
    //   icon: 'add',
    //   disabled: Boolean(user.walletAddress) === false,
    // },
    {
      label: 'FT Reserves',
      href: '/issuer/fungible-reserves',
      icon: 'money',
    },
    {
      label: 'NFT Collections',
      href: '/issuer/nft-collections',
      icon: 'art_track',
    },
    {
      label: 'Metadata',
      href: hrefs.manageRegistries,
      icon: 'data_object',
    },
    {
      label: 'Authguards',
      href: '/authguard/authguards',
      icon: 'lock',
    },
    {
      label: 'Authguard Keys',
      href: '/authguard/authkeys',
      icon: 'key',
    },
    {
      label: 'My Activity',
      href: hrefs.activities,
      icon: 'history',
    },

  ]
})

const menuHrefs = computed(() => menu.value.map((node) => node.href))

watch(() => selected.value, (currentlySelected) => {
  if (currentlySelected) {
    router.replace(currentlySelected)
  }
})

watch(() => route.path, (currentPath) => {
  selected.value = menuHrefs.value.includes(currentPath) ? currentPath : null
}, { immediate: true })

</script>

<style lang="scss">
/* q-tree__node-header relative-position row no-wrap items-center q-tree__node--link q-hoverable q-focusable q-tree__node--selected {} */
.q-tree__node--selected {
  color: rgb(254, 254, 254);
  background: linear-gradient(90deg, rgba(4, 30, 90, 0.9779411764705882) 0%, rgba(7, 41, 102, 1) 42%, rgba(9, 56, 121, 1) 77%, rgba(1, 114, 205, 1) 100%);
}

.sidebar-link {
  letter-spacing: 2px;
}

.sidebar-link:not(.sidebar-selected) {
  color: rgba(255, 255, 255, 0.55);
  transition: color 0.2s ease, background-color 0.2s ease;
}

.sidebar-link:not(.sidebar-selected):hover {
  color: rgba(255, 255, 255, 0.85);
}

.sidebar-selected {
  color: #fff;
}
</style>