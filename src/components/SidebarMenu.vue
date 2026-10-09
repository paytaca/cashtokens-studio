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
  dashboard: '/dashboard',
  managedTokens: '/dashboard/managed-tokens',
  collectedTokens: '/dashboard/collected-tokens',
  activities: '/dashboard/activities',
  createNewToken: '/token/create',
  createAuthKey: '/authguard/authkeys/create',
  authguards: '/authguard/authguards',
  authguardKeys: '/authguard/authkeys',
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
      href: hrefs.createNewToken,
      icon: 'add',
    },
    {
      label: 'Create New AuthKey',
      href: hrefs.createAuthKey,
      icon: 'add',
    },

    {
      label: 'Managed Tokens',
      href: hrefs.managedTokens,
      icon: 'brush',
    },
    {
      label: 'Collected Tokens',
      href: hrefs.collectedTokens,
      icon: 'grid_view',
    },

    {
      label: 'Authguards',
      href: hrefs.authguards,
      icon: 'lock',
    },
    {
      label: 'Authguard Keys',
      href: hrefs.authguardKeys,
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
  background: linear-gradient(90deg, rgba(39, 48, 68, 0.978) 0%, rgba(24, 27, 36, 0.98), 42%, rgb(26, 41, 62) 77%, rgb(22, 39, 52) 100%);
  border-radius: 25px
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