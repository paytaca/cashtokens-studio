<template>
  <q-dialog>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title>Publish Registry On-Chain</q-toolbar-title>
        <TokenCategory :token-id="identityOutput.tokenId!" />
      </q-toolbar>
      <q-card-section class="q-gutter-sm">
        <q-form class="q-gutter-sm">
          <q-input v-model="registry.url" label="Registry URL" filled dense></q-input>
          <q-input v-model="registry.contentHash" label="Content Hash" filled dense></q-input>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn @click="publish">{{ newIdentityOutput.processing || 'Publish' }}</q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import { ref, watch } from 'vue';
import TokenCategory from './TokenCategory.vue';
import { useQuasar } from 'quasar';

type UrlContent = { url: string, contentHash: string }

defineOptions({ name: 'AuthchainRegistryPublisher' })
const $q = useQuasar()

const props = defineProps<{ identityOutput: AuthchainIdentity }>()
const registry = ref<UrlContent>({ url: props.identityOutput?.registry?.url || '', contentHash: props.identityOutput?.registry?.contentHash || '' })
const newIdentityOutput = ref<AuthchainIdentity>(
  new AuthchainIdentity({ ...props.identityOutput })
)

const publish = async () => {
  newIdentityOutput.value.registry = registry.value
  const tx = await newIdentityOutput.value.publish()
  if (tx) {
    $q.notify({ type: 'positive', message: 'Registry published' })
  }
}
</script>
