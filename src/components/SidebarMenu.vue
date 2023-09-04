<template>
  <div class="q-pa-md q-gutter-sm">
    <q-tree :nodes="menu" node-key="href" no-connectors v-model:expanded="expanded" v-model:selected="selected"
      default-expand-all ref="qtree" />
  </div>
</template>

<script setup lang="ts">

import { useRouter } from 'vue-router'
import { ref, computed, watch, onMounted } from 'vue'
import { useUser } from 'src/stores/user'
import shortenAddress from 'src/app/utils/shortenAddress';

defineOptions({ name: 'SidebarMenu' })
const qtree = ref()
const router = useRouter()
const user = useUser()
const lastSelectedBeforeUnselect = ref<string | null>(null)
const selected = ref<string | null>(null)
const expanded = ref<any[]>([])

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
          href: '/issuer/tokens/create/authkey',
          icon: 'add',
        },
        {
          label: 'Create FT',
          href: '/issuer/tokens/create/ft',
          icon: 'add',
        },
        {
          label: 'Create NFT',
          href: '/issuer/tokens/create/nft',
          icon: 'add',
        },
        {
          label: 'Create BCMR',
          href: '/issuer/create/bcmr',
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
      disabled: Boolean(user.walletAddress) === false,
      children: [
        {
          label: shortenAddress(user.wallet?.getDepositAddress()),
          icon: 'account_balance_wallet',
          href: '#Cashaddr',
          children: [
            {
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
              href: '/account/balance/fungibletokens',
              icon: 'token'
              // avatar: 'https://cdn-icons-png.flaticon.com/128/5171/5171287.png',
            },
            {
              label: 'Collectibles (NFTs)',
              href: '/account/balance/collectibles',
              icon: 'token'
            },
            // {
            //   label: 'Hybrids (FNFTs)',
            //   href: '/account/balance/fungibletokens',
            //   avatar: 'https://cdn-icons-png.flaticon.com/128/5171/5171287.png',
            // }
          ]
        }

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
