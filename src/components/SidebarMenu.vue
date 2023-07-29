<template>
  <div class="q-pa-md q-gutter-sm">
    <q-tree :nodes="menu" node-key="href" no-connectors v-model:expanded="expanded" v-model:selected="selected"
      default-expand-all />
  </div>
</template>

<script setup lang="ts">

import { useRouter } from 'vue-router'
import { ref, computed, watch } from 'vue'
import useStore from 'src/composables/useStore'

defineOptions({ name: 'SidebarMenu' })
const router = useRouter()
const { user } = useStore()
const lastSelectedBeforeUnselect = ref<string | null>(null)
const selected = ref<string | null>(null)
const expanded = ref<any[]>([])

const menu = computed<any[]>(() => {
  return [
    {
      label: 'Issuer',
      href: '#Issuer',
      icon: 'domain_add',
      disabled: Boolean(user.connectedPaytacaAddress) === false,
      children: [
        {
          label: 'Create Fungible Token',
          href: '/token/create/fungible',
          icon: 'add',
        },
        {
          label: 'Create Non-Fungible Token',
          href: '/token/create/nonfungible',
          icon: 'add',
        },
        {
          label: 'Create FNFT hybrid',
          href: '/token/create/hybrid',
          icon: 'add',
        },
        {
          label: 'Manage Tokens',
          href: '#',
          icon: 'token',
          children: [
            {
              label: 'View Owned Identities',
              href: '/token/identities',
              icon: 'token',
            }
          ]
        }
      ]
    },
    {
      label: 'Wallet Balance',
      href: '#Balance',
      icon: 'account_balance_wallet',
      disabled: Boolean(user.connectedPaytacaAddress) === false,
      children: [
        {
          label: 'Fungibles (FTs) ' + `${user.fts?.length || 0}`,
          href: '/balances/fungibles',
          avatar: 'https://cdn-icons-png.flaticon.com/128/5171/5171287.png',
        },
        {
          label: 'Collectibles (NFTs)',
          icon: 'token'
        },
        {
          label: 'Hybrids (FNFTs',
          href: '/balances/nonfungibles',
          avatar: 'https://cdn-icons-png.flaticon.com/128/5171/5171287.png',
        },
        {
          label: Number(user.connectedPaytacaWalletBchBalance) / 1e8,
          avatar: 'https://chipnet.imaginary.cash/img/logo/bch.svg',
        },
      ]
    }
  ]
})

watch(selected, (currentlySelected, previouslySelected) => {
  /**
   * Toggle Expand / Collapse of menu with children on select
   */
  if (currentlySelected !== null) {
    lastSelectedBeforeUnselect.value = currentlySelected
  }

  if (currentlySelected && !currentlySelected.startsWith('#')) {
    router.push(currentlySelected)
    return
  }

  if (currentlySelected === null) {
    if (previouslySelected === lastSelectedBeforeUnselect.value) {
      let menuIndex = expanded.value.findIndex((e: string) => e == lastSelectedBeforeUnselect.value)
      expanded.value.splice(menuIndex, 1)
    }
  } else {
    let indexOfCurrentlySelected = expanded.value.findIndex((e: any) => e == currentlySelected)
    if (indexOfCurrentlySelected === -1) {
      expanded.value.push(currentlySelected)
    } else {
      expanded.value.splice(indexOfCurrentlySelected, 1)
    }
  }
})


</script>
