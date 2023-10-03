<template>
  <div class="q-pa-md q-gutter-sm">
    <q-tree :nodes="menu" node-key="href" no-connectors v-model:expanded="expanded" v-model:selected="selected"
      default-expand-all ref="qtree" />
  </div>
</template>

<script setup lang="ts">

import { useRouter, useRoute } from 'vue-router'
import { ref, computed, watch, onMounted } from 'vue'
import { useUser } from 'src/stores/user'
import shortenAddress from 'src/app/utils/shortenAddress';

defineOptions({ name: 'SidebarMenu' })
const qtree = ref()
const route = useRoute()
const router = useRouter()
const user = useUser()
const selected = ref<string | null>(null)
const expanded = ref<any[]>([])
const hrefs = {
  createAuthKey: '/issuer/tokens/create/authkey',
  createFT: '/issuer/tokens/create/ft',
  createNFT: '/issuer/tokens/create/nft',
  manageFTReserves: '/issuer/manage/ft-reserves',
  manageNFTReserves: '/issuer/manage/nft-reserves',
  manageAuthchains: '/issuer/manage/authchains',
  manageAuthKeys: '/issuer/manage/authkeys',
  accountFungibles: '/account/balance/fungibletokens',
  accountCollectibles: '/account/balance/collectibles',
  recentTransactions: '/account/recent-transactions'
}

const menu = computed<any[]>(() => {
  return [
    {
      label: 'Issuer',
      href: '#Issuer',
      icon: 'domain_add',
      disabled: Boolean(user.walletAddress) === false,
      children: [
        {
          label: 'Create AuthKey',
          href: hrefs.createAuthKey,
          icon: 'add',
        },
        {
          label: 'Create FT',
          href: hrefs.createFT,
          icon: 'add',
        },
        {
          label: 'Create NFT',
          href: hrefs.createNFT,
          icon: 'add',
        },
        {
          label: 'Manage',
          href: '#Manage',
          icon: 'token',
          children: [
            {
              label: 'FT Reserves',
              href: hrefs.manageFTReserves,
              icon: 'token',
            },
            {
              label: 'NFT Reserves',
              href: hrefs.manageNFTReserves,
              icon: 'token',
            },
            {
              label: 'AuthChains',
              href: hrefs.manageAuthchains,
              icon: 'token',
            },
            {
              label: 'AuthKeys',
              href: hrefs.manageAuthKeys,
              icon: 'token',
            }

          ]
        }
      ]
    },
    {
      label: 'Account',
      href: '#Account',
      icon: 'account_balance_wallet',
      disabled: Boolean(user.walletAddress) === false,
      children: [
        {
          label: shortenAddress(user.wallet?.getDepositAddress()),
          icon: 'account_balance_wallet',
          href: '#Cashaddr',
          children: [
            {
              href: '#',
              label: user.walletBchBalance ? Number(user.walletBchBalance) / 1e8 : '',
              avatar: 'https://chipnet.imaginary.cash/img/logo/bch.svg',
            }
          ]
        },

        {
          label: shortenAddress(user.wallet?.getTokenDepositAddress()),
          href: '#Tokenaddr',
          icon: 'token',
          children: [
            {
              label: 'Fungibles (FTs)',
              href: hrefs.accountFungibles,
              icon: 'token'
            },
            {
              label: 'Collectibles (NFTs)',
              href: hrefs.accountCollectibles,
              icon: 'token'
            },
          ]
        },
        {
          label: 'Recent Transactions',
          href: hrefs.recentTransactions,
          icon: 'receipt',
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

onMounted(() => {
  console.log(qtree.value.expandAll())
})

</script>

<style lang="scss">
/* q-tree__node-header relative-position row no-wrap items-center q-tree__node--link q-hoverable q-focusable q-tree__node--selected {} */
.q-tree__node--selected {
  color: rgb(212, 210, 210);
  background: linear-gradient(90deg, rgba(4, 30, 90, 0.9779411764705882) 0%, rgba(7, 41, 102, 1) 42%, rgba(9, 56, 121, 1) 77%, rgba(1, 114, 205, 1) 100%);
}
</style>