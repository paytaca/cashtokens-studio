<template>
  <div>
    <JsonEditor v-if="viewType == 'json'" v-model="registry" mode="text" class="jse-theme-dark" />
    <div v-else>
      <q-section>
        <slot name="header"></slot>
      </q-section>
      <q-section>
        <slot name="identities">
          <div v-if="Object.keys(registry.identities || {}).length > 0">
            <q-select v-model="authbase" :options="Object.keys(registry.identities || {})"></q-select>
          </div>
          <div v-if="registry.identities && authbase && Object.keys(registry.identities[authbase]).length > 0">
            <q-input :model-value="timestamp" label="Identity Snapshot Timestamp"></q-input>
            <q-select v-model="timestamp" :options="Object.keys(registry.identities[authbase] || {})"></q-select>
          </div>
        </slot>
        <slot name="identity-snapshot">
          <IdentitySnapshotComponent
            v-if="registry.identities && authbase && timestamp && registry.identities[authbase][timestamp]"
            v-model:identity-snapshot="registry.identities[authbase][timestamp]" />
        </slot>
      </q-section>
      <q-section>
        <slot name="footer">
          <!-- other advanced optional fields -->
        </slot>
      </q-section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, defineModel, ref } from 'vue'
import type { Registry } from 'mainnet-js'
import JsonEditor from 'json-editor-vue'
import IdentitySnapshotComponent from './IdentitySnapshot.vue'

defineComponent({ name: 'RegistryComponent' })
export type RegistryProps = {
  viewType: 'json' | 'form'
}
const props = defineProps<RegistryProps>()
const authbase = ref<string>()
const timestamp = ref<string>()
const registry = defineModel<Registry>('registry', { required: true })

</script>