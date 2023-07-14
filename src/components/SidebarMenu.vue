<template>
  <div class="q-pa-md q-gutter-sm">
    <q-tree :nodes="menu" node-key="href" no-connectors v-model:expanded="expanded" v-model:selected="selected"
      default-expand-all />
  </div>
</template>

<script setup lang="ts">

import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import useStore from 'src/composables/useStore'


defineOptions({ name: 'SidebarMenu' })

const router = useRouter()
const { user } = useStore()
const lastSelectedBeforeUnselect = ref(null as any)
const selected = ref(null as any)
const expanded = ref([] as any)

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

const menu = computed<any[]>(() => {
  return [
    {
      label: 'Issuer',
      href: '#Issuer',
      // avatar: 'https://cdn.quasar.dev/img/boy-avatar.png',
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
          label: 'Create FNFT',
          href: '/token/create/fnft',
          icon: 'add',
        },
        {
          label: 'Manage Tokens',
          href: '#',
          icon: 'token',
          children: [
            {
              label: 'View Created FTs',
              href: '/ft/browse',
              icon: 'token',
              // img: 'https://cdn.quasar.dev/img/logo_calendar_128px.png'
            },
            {
              label: 'View Created NFTs',
              href: '/nft/browse',
              icon: 'token',
              // img: 'https://cdn.quasar.dev/img/logo_calendar_128px.png'
            }

          ]
        }
      ]
    },
    {
      label: 'Wallet Balance',
      href: '#Balance',
      // avatar: 'https://cdn.quasar.dev/img/boy-avatar.png',
      icon: 'account_balance_wallet',
      disabled: Boolean(user.connectedPaytacaAddress) === false,
      children: [

        {
          label: 'Coins (FTs)',
          // icon: 'token',
          avatar: 'https://cdn-icons-png.flaticon.com/128/5171/5171287.png',
          // children: [
          //   { label: 'Quality ingredients' },
          //   { label: 'Good recipe' }
          // ]
        },
        {
          label: 'Collectibles (NFTs)',
          avatar: 'https://img.uxwing.com/wp-content/themes/uxwing/download/internet-network-technology/non-fungible-tokens-nft-icon.svg',
          // icon: 'restaurant_menu',
          children: [
            { label: 'Quality ingredients' },
            { label: 'Good recipe' }
          ]
        },
        {
          label: Number(user.connectedPaytacaWalletBchBalance) / 1e8,
          avatar: 'https://chipnet.imaginary.cash/img/logo/bch.svg',
          // icon: 'room_service',
          // disabled: true,
          // children: [
          //   { label: 'Prompt attention' },
          //   { label: 'Professional waiter' }
          // ]
        },
        // {
        //   label: 'Pleasant surroundings (with icon)',
        //   icon: 'photo',
        //   children: [
        //     {
        //       label: 'Happy atmosphere (with image)',
        //       img: 'https://cdn.quasar.dev/img/logo_calendar_128px.png'
        //     },
        //     { label: 'Good table presentation' },
        //     { label: 'Pleasing decor' }
        //   ]
        // }
      ]
    }
  ]
})

// export default {
//   setup () {
//     const user = useUserStore()
//     const selected = ref(null as any)
//     const lastSelectedBeforeUnselect = ref(null as any)
//     const expanded = ref([] as any)
//     const balance = user.connectedPaytacaWalletBchBalance
//     const menu = ref([
//         {
//           label: 'Issuer',
//           href: '#Issuer',
//           // avatar: 'https://cdn.quasar.dev/img/boy-avatar.png',
//           icon: 'domain_add',
//           disabled: Boolean(user.connectedPaytacaAddress) === false,
//           children: [
//             {
//               label: 'New Fungible Token',
//               href: '/ft/new',
//               icon: 'add',
//               // children: [
//               //   { label: 'Quality ingredients' },
//               //   { label: 'Good recipe' }
//               // ],
//             },
//             {
//               label: 'New Non-Fungible Token',
//               href: '/nft/create',
//               icon: 'add',
//             },
//             {
//               label: 'Manage Tokens',
//               href: '#',
//               icon: 'token',
//               children: [
//                 {
//                   label: 'View Issued FTs',
//                   href: '/ft/browse',
//                   icon: 'token',
//                   // img: 'https://cdn.quasar.dev/img/logo_calendar_128px.png'
//                 },
//                 {
//                   label: 'View Issued NFTs',
//                   href: '/nft/browse',
//                   icon: 'token',
//                   // img: 'https://cdn.quasar.dev/img/logo_calendar_128px.png'
//                 }

//               ]
//             }
//           ]
//         },
//         {
//           label: 'Wallet Balance',
//           href: '#Balance',
//           // avatar: 'https://cdn.quasar.dev/img/boy-avatar.png',
//           icon: 'account_balance_wallet',
//           disabled: Boolean(user.connectedPaytacaAddress) === false,
//           children: [

//             {
//               label: 'Coins (FTs)',
//               // icon: 'token',
//               avatar: 'https://cdn-icons-png.flaticon.com/128/5171/5171287.png',
//               // children: [
//               //   { label: 'Quality ingredients' },
//               //   { label: 'Good recipe' }
//               // ]
//             },
//             {
//               label: 'Collectibles (NFTs)',
//               avatar: 'https://img.uxwing.com/wp-content/themes/uxwing/download/internet-network-technology/non-fungible-tokens-nft-icon.svg',
//               // icon: 'restaurant_menu',
//               children: [
//                 { label: 'Quality ingredients' },
//                 { label: 'Good recipe' }
//               ]
//             },
//             {
//               label: balance,
//               avatar: 'https://chipnet.imaginary.cash/img/logo/bch.svg',
//               // icon: 'room_service',
//               // disabled: true,
//               // children: [
//               //   { label: 'Prompt attention' },
//               //   { label: 'Professional waiter' }
//               // ]
//             },
//             // {
//             //   label: 'Pleasant surroundings (with icon)',
//             //   icon: 'photo',
//             //   children: [
//             //     {
//             //       label: 'Happy atmosphere (with image)',
//             //       img: 'https://cdn.quasar.dev/img/logo_calendar_128px.png'
//             //     },
//             //     { label: 'Good table presentation' },
//             //     { label: 'Pleasing decor' }
//             //   ]
//             // }
//           ]
//         }
//       ])
//     return {
//       // expanded: ref([ 'Satisfied customers (with avatar)', 'Good food (with icon)' ]),
//       user,
//       expanded,
//       selected,
//       lastSelectedBeforeUnselect,
//       menu
//     }
//   },
//   watch: {
//     /**
//      * @param currentlySelected The node key (value of href in this case)
//      * @param previouslySelected The node key (value of href in this case)
//      */
//     selected(currentlySelected: string, previouslySelected){
//       /**
//        * Toggle Expand / Collapse of menu with children on select
//        */
//       if (currentlySelected !== null) {
//         this.lastSelectedBeforeUnselect = currentlySelected
//       }

//       if (currentlySelected && !currentlySelected.startsWith('#')) {
//         this.$router.push(currentlySelected)
//         return
//       }

//       if (currentlySelected === null) {
//         if (previouslySelected === this.lastSelectedBeforeUnselect) {
//           let menuIndex = this.expanded.findIndex((e: string) => e == this.lastSelectedBeforeUnselect)
//           this.expanded.splice(menuIndex, 1)
//         }
//       } else {
//         let indexOfCurrentlySelected = this.expanded.findIndex((e: string) => e == currentlySelected)
//         if (indexOfCurrentlySelected === -1) {
//           this.expanded.push(currentlySelected)
//         } else {
//           this.expanded.splice(indexOfCurrentlySelected, 1)
//         }
//       }
//     },
//     expanded(expanded){
//       console.log(expanded)
//     },
//     'user.connectedPaytacaAddress'(value){
//       if (value) {

//       }
//     }
//   }
// }
</script>
