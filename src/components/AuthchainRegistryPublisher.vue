<template>
  <q-dialog>
    <q-card>
      <q-toolbar>
        <q-toolbar-title>Publish Registry On-Chain</q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <TokenCategory :token-id="identityOutput.tokenId!" />
        <q-form>
          {{ newIdentityOutput.registry?.url }}
          <q-input v-model="registry.url"></q-input>
          {{ newIdentityOutput.registry?.contentHash }}
          <q-input v-model="registry.contentHash"></q-input>
        </q-form>
      </q-card-section>
      <q-card-action>
        <q-btn @click="publish">{{ newIdentityOutput.processing || 'Publish' }}</q-btn>
      </q-card-action>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import { ref, watch } from 'vue';
import TokenCategory from './TokenCategory.vue';

type UrlContent = { url: string, contentHash: string }

defineOptions({ name: 'AuthchainRegistryPublisher' })
const props = defineProps<{ identityOutput: AuthchainIdentity }>()
const registry = ref<UrlContent>({ url: props.identityOutput?.registry?.url || '', contentHash: props.identityOutput?.registry?.contentHash || '' })
const newIdentityOutput = ref<AuthchainIdentity>(
  new AuthchainIdentity({ ...props.identityOutput })
)

watch(() => registry.value, (newValue) => {
  console.log(newValue)
  newIdentityOutput.value.registry = newValue
  // console.log(newIdentityOutput.value.registry)
})
const publish = () => {
  console.log(newIdentityOutput)
  newIdentityOutput.value.publish()
}
</script>
