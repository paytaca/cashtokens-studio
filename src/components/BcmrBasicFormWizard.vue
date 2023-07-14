<template>
  <template>
    <div class="q-pa-md">
      <q-stepper v-model="step" vertical color="primary" animated>
        <q-step :name="1" title="Registry" icon="settings" :done="step > 1">
          Registry primary details
          <div class="row">
            <q-select color="lime" :filled="true" standout bottom-slots v-model="registry!.$schema" label="Schema Version"
              clearable>
              <q-option>https://cashtokens.org/bcmr-v2.schema.json</q-option>
            </q-select>
            <q-input color="lime" :filled="true" standout bottom-slots v-model="version" label="Version" clearable>
              <template v-slot:prepend>
                <q-icon name="abc" />
              </template>
              <template v-slot:hint>
                The name of the token
              </template>
            </q-input>
          </div>
          <q-stepper-navigation>
            <q-btn @click="step = 2" color="primary" label="Continue" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="2" title="Create an ad group" caption="Optional" icon="create_new_folder" :done="step > 2">
          An ad group contains one or more ads which target a shared set of keywords.

          <q-stepper-navigation>
            <q-btn @click="step = 4" color="primary" label="Continue" />
            <q-btn flat @click="step = 1" color="primary" label="Back" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="3" title="Ad template" icon="assignment" disable>
          This step won't show up because it is disabled.
        </q-step>

        <q-step :name="4" title="Create an ad" icon="add_comment">
          Try out different ad text to see what brings in the most customers, and learn how to
          enhance your ads using features like ad extensions. If you run into any problems with
          your ads, find out how to tell if they're running and how to resolve approval issues.

          <q-stepper-navigation>
            <q-btn color="primary" label="Finish" />
            <q-btn flat @click="step = 2" color="primary" label="Back" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-step>
      </q-stepper>
    </div>
  </template>
</template>

<script setup lang="ts">

import { ref, onMounted } from 'vue';
import { Registry as BcmrRegistry } from 'src/interfaces/bcmr-v2.schema';
import { watch } from 'fs';
defineOptions({ name: 'TokenBcmrBasicForm' })

const props = defineProps<{
  tokenIdOptions?: Array<string>,
  default: BcmrRegistry,
}>()

const step = ref(1)

const emit = defineEmits<{
  confirm: [token: BcmrBasic],
  cancel: []
}>()

const version = ref('1.0.0')

const registry = ref<BcmrRegistry>({
  version: { 'major': 1, 'minor': 0, 'patch': 0 },
  latestRevision: new Date().toISOString(),
  registryIdentity: {
    name: 'Example Metadata Registry Name',
    description: 'Example metadata description',
    uris: {
      icon: 'https://example.com/icons/example.png',
      web: 'https://example.com',
      registry: 'https://example.com/.well-known/bitcoin-cash-metadata-registry.json'
    }
  }
})

watch('version', (newVersion) => {
  let v = newVersion.split('.').map(vv => Number(vv))
  registry.value.version = { major: v[0], minor: v[1], patch: v[2] }
})

onMounted(() => {
  if (props.default) {
    registry.value = props.default
    version.value = registry.value.version ? Object.values(registry.value.version).join('.') : '1.1.0'
  }
})
</script>
