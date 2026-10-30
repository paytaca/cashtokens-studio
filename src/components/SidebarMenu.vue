<template>
  <div class="q-pa-md q-gutter-sm">
    <div class="text-center">
      <q-chip v-if="route.name !== 'dashboard'" color="grey-9" text-color="warning" dense icon="lan">
        <span class="text-caption text-italic">{{ network }}</span>
      </q-chip>
    </div>
    {{ airdropBeaconSoon }} {{ isAirdropBeaconConfigured() }}
    <q-tree :nodes="menu" node-key="href" no-connectors v-model:selected="selected">
      <template v-slot:default-header="prop">
        <div class="row items-center sidebar-link" :class="{ 'sidebar-selected': selected === prop.node.href }">
          <img v-if="prop.node.img" :src="prop.node.img" class="sidebar-logo q-mr-sm" alt="" />
          <q-icon
            v-else-if="prop.node.icon && (prop.node.label === 'Authguard Vaults' || prop.node.label === 'Authguard Keys')"
            :name="prop.node.icon || 'share'" color="orange" size="28px" class="q-mr-sm" />
          <q-icon v-else-if="prop.node.icon && prop.node.label === 'Admin'" :name="prop.node.icon || 'share'"
            color="accent" size="28px" class="q-mr-sm" />
          <q-icon v-else-if="prop.node.icon && prop.node.label === 'Opt-In to Airdrops'" :name="prop.node.icon"
            color="accent" size="28px" class="q-mr-sm" />
          <q-icon v-else :name="prop.node.icon || 'share'" size="28px" class="q-mr-sm" />
          <div>{{ prop.node.label }}<q-badge v-if="prop.node.soon" color="warning" text-color="dark" class="q-ml-xs"
              floating>
              {{ t('badge.soon') }}
            </q-badge></div>

        </div>
      </template>
    </q-tree>
  </div>
</template>

<script setup lang="ts">

import { useRouter, useRoute } from 'vue-router'
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { WIZARDCONNECT_LOGO } from 'wizardconnect-vue'
import { useWalletSigner } from 'src/composables/useWalletSigner';
import { isAirdropBeaconConfigured } from 'src/core/airdrop';
const network = computed(() => import.meta.env.VITE_BCH_NETWORK);

const { walletIsReady, wallet } = useWalletSigner();

const linksDisabled = computed(() => !walletIsReady.value);

/** Build-time static: the airdrop beacon entry points are parked while no category is configured. */
const airdropBeaconSoon = !isAirdropBeaconConfigured();

const receiveAddress = computed(() => {
  try {
    return wallet.value?.getDepositAddress?.(0)
  } catch (e) {
    return undefined
  }
})

defineOptions({ name: 'SidebarMenu' })
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const hrefs = {
  dashboard: '/dashboard',
  managedTokens: '/dashboard/managed-tokens',
  collectedTokens: '/dashboard/collected-tokens',
  activities: '/dashboard/activities',
  createNewToken: '/token/create',
  createAuthKey: '/authguard/authkeys/create',
  importAuthhead: '/authguard/authheads/import',
  authguards: '/authguard/authguards',
  authguardKeys: '/authguard/authkeys',
  requests: '/wizard-connect/requests',
  airdropOptIn: '/airdrop/opt-in'
}

const selected = ref<string | null>(hrefs.dashboard)

const menu = computed<any[]>(() => {
  const tree = [
    {
      label: 'Dashboard',
      href: hrefs.dashboard,
      icon: 'dashboard',
    },
    {
      label: t('createToken.title'),
      href: hrefs.createNewToken,
      icon: 'add',
    },
    {
      label: 'Create New AuthKey',
      href: hrefs.createAuthKey,
      icon: 'add',
    },
    {
      label: t('authguard.importAuthhead.menu'),
      href: hrefs.importAuthhead,
      icon: 'move_to_inbox',
    },

    {
      label: 'Managed Tokens',
      href: hrefs.managedTokens,
      icon: 'copyright',
    },
    {
      label: 'Collected Tokens',
      href: hrefs.collectedTokens,
      icon: 'mdi-rhombus-split',
    },

    {
      label: t('dashboard.authguards.menu'),
      href: hrefs.authguards,
      icon: 'mdi-safe-square-outline'
    },
    {
      label: 'Authguard Keys',
      href: hrefs.authguardKeys,
      icon: 'key',
    },
    {
      label: 'Opt-In to Airdrops',
      href: hrefs.airdropOptIn,
      icon: 'mdi-parachute',
      soon: airdropBeaconSoon,
    },
    {
      label: 'Activities',
      href: hrefs.activities,
      icon: 'history',
    },
    {
      label: 'Requests',
      href: hrefs.requests,
      img: WIZARDCONNECT_LOGO,
    },

  ].map((node) => ({ ...node, disabled: linksDisabled.value || Boolean(node.soon) }))

  if (import.meta.env.VITE_CTS_ADMIN_ADDRESS && import.meta.env.VITE_CTS_ADMIN_ADDRESS === receiveAddress.value) {
    tree.push({
      label: 'Admin',
      href: '/admin',
      icon: 'mdi-security',
      disabled: false
    })
  }
  return tree
})

const menuHrefs = computed(() => menu.value.map((node) => node.href))

watch(() => selected.value, (currentlySelected) => {
  // Navigate only on a real selection change. The route watcher below also updates `selected` when
  // the user navigates by other means — e.g. a programmatic redirect that carries a query string —
  // and replacing with the bare path there would silently drop that query.
  if (currentlySelected && currentlySelected !== route.path) {
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
  background: linear-gradient(90deg, rgba(39, 48, 68, 0.978) 0%, rgba(24, 27, 36, 0.98), 42%, rgb(26, 41, 62) 77%, rgb(42, 70, 91) 100%);
  border-radius: 25px
}

.sidebar-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  border-radius: 6px;
  flex-shrink: 0;
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

/* Inert while the wallet is initializing. QTree marks the node disabled, which already blocks its
   pointer events; cancel its extra dimming so the label stays readable, then set the muted colour. */
.q-tree__node--disabled>div {
  opacity: 1 !important;
}

.q-tree__node--disabled .sidebar-link,
.q-tree__node--disabled .sidebar-link:hover {
  color: rgba(255, 255, 255, 0.35);
  cursor: not-allowed;
}
</style>