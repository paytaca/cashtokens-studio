<template>
  <q-dialog>
    <q-card>
      <q-toolbar>
        <q-toolbar-title>Burn Authchain</q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <q-form>
        </q-form>
      </q-card-section>
      <q-card-action>
        <q-btn>{{ newIdentityOutput.processing || 'Publish' }}</q-btn>
      </q-card-action>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import { ref } from 'vue';

defineOptions({ name: 'AuthchainBurner' })
const props = defineProps<{ identityOutput: AuthchainIdentity }>()
const newIdentityOutput = ref<AuthchainIdentity>(props.identityOutput)
</script>
