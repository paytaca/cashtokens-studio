<template>
  <div class="q-pa-md q-gutter-sm">
    <q-tree :nodes="menu" node-key="href" no-connectors v-model:expanded="expanded" v-model:selected="selected"
      default-expand-all ref="qtree" />
  </div>
</template>

<script setup lang="ts">

import { useRouter } from 'vue-router'
import { ref, computed, watch, onMounted } from 'vue'
import useStore from 'src/composables/useStore'
import shortenAddress from 'src/utils/shortenAddress';

defineOptions({ name: 'SidebarMenu' })
const qtree = ref()
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
          label: 'Create FT',
          href: '/issuer/create/fungible',
          icon: 'add',
        },
        {
          label: 'Create NFT',
          href: '/issuer/create/nonfungible',
          icon: 'add',
        },
        {
          label: 'Create FNFT hybrid',
          href: '/issuer/create/hybrid',
          icon: 'add',
        },
        {
          label: 'Create AuthKey',
          href: '/issuer/create/authkey',
          icon: 'add',
        },
        {
          label: 'Manage',
          href: '#',
          icon: 'token',
          children: [
            {
              label: 'FT Reserves',
              href: '/issuer/manage/ft-reserves',
              icon: 'token',
            },
            {
              label: 'NFT Reserves',
              href: '/issuer/manage/nft-reserves',
              icon: 'token',
            },
            {
              label: 'AuthChains',
              href: '/issuer/manage/authchains',
              icon: 'token',
            },
            {
              label: 'AuthKeys',
              href: '/issuer/manage/authkeys',
              icon: 'token',
            },

          ]
        }
      ]
    },
    {
      label: 'Account',
      href: '#Balance',
      icon: 'account_balance_wallet',
      disabled: Boolean(user.connectedPaytacaAddress) === false,
      children: [

        {
          label: shortenAddress(user.wallet?.getTokenDepositAddress()),
          href: '#Tokenaddr',
          children: [
            {
              label: 'Fungibles (FTs)',
              href: '/balances/fungibles',
              icon: 'token'
              // avatar: 'https://cdn-icons-png.flaticon.com/128/5171/5171287.png',
            },
            {
              label: 'Collectibles (NFTs)',
              href: '/balances/collectibles',
              icon: 'token'
            },
            {
              label: 'Hybrids (FNFTs)',
              href: '/balances/nonfungibles',
              avatar: 'https://cdn-icons-png.flaticon.com/128/5171/5171287.png',
            }
          ]
        },
        {
          label: shortenAddress(user.wallet?.getDepositAddress()),
          icon: 'content_copy',
          href: '#Cashaddr',
          children: [
            {
              label: user.connectedPaytacaWalletBchBalance ? Number(user.connectedPaytacaWalletBchBalance) / 1e8 : '',
              avatar: 'https://chipnet.imaginary.cash/img/logo/bch.svg',
            }
          ]
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

onMounted(() => {
  console.log(qtree.value.expandAll())
})

</script>
