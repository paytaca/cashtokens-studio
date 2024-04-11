<template>
  <div class="q-pa-md q-gutter-sm">
    <q-tree :nodes="menu" node-key="href" no-connectors v-model:expanded="expanded" v-model:selected="selected"
      default-expand-all ref="qtree">
      <template v-slot:default-header="prop">
        <div v-if="prop.node.label == 'Authguards' || prop.node.label == 'Authguard Keys'" class="row items-center">
          <q-icon :name="prop.node.icon || 'share'" color="orange" size="28px" class="q-mr-sm" />
          <div>{{ prop.node.label }}</div>
        </div>
        <div v-else class="row items-center">
          <q-icon :name="prop.node.icon || 'share'" size="28px" class="q-mr-sm" />
          <div>{{ prop.node.label }}</div>
        </div>
      </template>
    </q-tree>
  </div>
</template>

<script setup lang="ts">

import { useRouter, useRoute } from 'vue-router'
import { ref, computed, watch, onMounted } from 'vue'
import { useUser } from 'src/stores/user'

defineOptions({ name: 'SidebarMenu' })
const qtree = ref()
const route = useRoute()
const router = useRouter()
const user = useUser()
const selected = ref<string | null>(null)
const expanded = ref<any[]>(['#Manage'])
const hrefs = {
  createAuthKey: '/issuer/tokens/create/authkey',
  manageFTReserves: '/issuer/manage/ft-reserves',
  manageNFTReserves: '/issuer/manage/nft-reserves',
  manageNFTCollection: '/issuer/manage/nft-collection',
  manageRegistries: '/issuer/manage/registries',
  manageAuthchains: '/issuer/manage/authchains',
  manageAuthKeys: '/issuer/manage/authkeys',
  manageAuthGuards: '/issuer/manage/authguards',
  accountFungibles: '/account/balance/fungibletokens',
  accountCollectibles: '/account/balance/collectibles',
  recentTransactions: '/account/recent-transactions',
  createNewToken: '/issuer/tokens/create',
  createNftCollection: '/issuer/tokens/create/nft-collection',
  importAuthUtxo: '/issuer/tokens/import-auth-utxo',
}

const menu = computed<any[]>(() => {
  return [
    {
      label: 'Create New Token',
      href: hrefs.createNewToken,
      icon: 'add',
      disabled: Boolean(user.walletAddress) === false,
    },
    // {
    //   label: 'Create NFT Collection',
    //   href: hrefs.createNftCollection,
    //   icon: 'add',
    //   disabled: Boolean(user.walletAddress) === false,
    // },
    {
      label: 'Create New AuthKey',
      href: hrefs.createAuthKey,
      icon: 'add',
      disabled: Boolean(user.walletAddress) === false,
    },
    // {
    //   label: 'Import Auth Utxo',
    //   href: hrefs.importAuthUtxo,
    //   icon: 'add',
    //   disabled: Boolean(user.walletAddress) === false,
    // },
    {
      label: 'Manage',
      href: '#Manage',
      icon: 'token',
      disabled: Boolean(user.walletAddress) === false,
      children: [
        {
          label: 'FT Reserves',
          href: hrefs.manageFTReserves,
          icon: 'money',
        },
        {
          label: 'NFT Reserves',
          href: hrefs.manageNFTReserves,
          icon: 'art_track',
        },
        // {
        //   label: 'NFT Collections',
        //   href: hrefs.manageNFTCollection,
        //   icon: 'art_track',
        // },
        {
          label: 'Metadata',
          href: hrefs.manageRegistries,
          icon: 'data_object',
        },
        {
          label: 'Authguards',
          href: hrefs.manageAuthGuards,
          icon: 'lock',
        },
        {
          label: 'Authguard Keys',
          href: hrefs.manageAuthKeys,
          icon: 'key',
        }

      ]
    }
  ]
})

watch(() => selected.value, (currentlySelected, previouslySelected) => {
  const previouslySelectedIndex = expanded.value?.findIndex((exp) => exp === previouslySelected)
  const currentlySelectedIndex = expanded.value?.findIndex((exp) => exp === currentlySelected)
  if (!currentlySelected && previouslySelected?.startsWith('#') && previouslySelectedIndex !== -1) {
    // toggling, collapse menu
    expanded.value.splice(previouslySelectedIndex, 1)
  } else if (currentlySelected && currentlySelected.startsWith('#') && currentlySelectedIndex === -1) {
    expanded.value.push(currentlySelected)
  } else if (currentlySelected && currentlySelectedIndex !== -1) {
    expanded.value.splice(currentlySelectedIndex, 1)
  } else if (!currentlySelected && previouslySelected?.startsWith('#') && previouslySelectedIndex === -1) {
    // toggling, expand previously selected
    expanded.value.push(previouslySelected)
  }
  if (currentlySelected && !currentlySelected.startsWith('#')) {
    router.replace(currentlySelected)
  }
})

watch(() => route.path, (currentPath) => {
  if (!Object.values(hrefs).includes(currentPath)) {
    selected.value = null
  }
})

onMounted(async () => {
  qtree.value.expandAll()
})

</script>

<style lang="scss">
/* q-tree__node-header relative-position row no-wrap items-center q-tree__node--link q-hoverable q-focusable q-tree__node--selected {} */
.q-tree__node--selected {
  color: rgb(254, 254, 254);
  background: linear-gradient(90deg, rgba(4, 30, 90, 0.9779411764705882) 0%, rgba(7, 41, 102, 1) 42%, rgba(9, 56, 121, 1) 77%, rgba(1, 114, 205, 1) 100%);
}
</style>