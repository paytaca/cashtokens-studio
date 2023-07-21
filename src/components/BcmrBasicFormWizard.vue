<template>
  <div>
    <q-stepper v-model="step" vertical color="secondary" animated>
      <q-toolbar>
        <q-icon name="token" size="md"></q-icon>
        <q-toolbar-title><span class="text-weight-bold">BCMR</span></q-toolbar-title>
        <q-btn flat round dense icon="close" @click="emit('cancel')" />
      </q-toolbar>
      <div class="text-weight-thin q-ml-lg">{BCMR}</div>
      <q-step :name="1" title="Registry Primary Details" icon="settings" :done="step > 1">
        <q-select color="lime" :filled="true" standout bottom-slots v-model="registry!.$schema" label="Schema Version"
          :options="registrySchemaOptions" dense>
        </q-select>
        <q-input color="lime" :filled="true" standout bottom-slots v-model="version" label="Version" dense>
          <template v-slot:prepend>
            <q-icon name="abc" />
          </template>
        </q-input>
        <q-input color="lime" :filled="true" standout bottom-slots v-model="registry.latestRevision"
          label="Latest Revision" dense>
        </q-input>
        <q-stepper-navigation>
          <q-btn @click="step = 2" color="primary" label="Continue" />
        </q-stepper-navigation>
      </q-step>
      <q-step :name="2" title="Registry Identity" icon="create_new_folder" :done="step > 2">
        The identity information of this particular registry, provided as either an
        <code>authbase</code> (recommended) or an <code>IdentitySnapshot</code>.
        <div class="q-pa-lg">
          <q-option-group v-model="registryIdentitySelector" :options="registryIdentitySelections" color="primary" inline
            dense />
        </div>
        <div>
          <!-- authbase -->
          <q-input v-if="registryIdentitySelector == 'authbase'" :filled="true" standout bottom-slots v-model="authbase"
            label="Enter Authchain Authbase (TX id)" dense>
          </q-input>
          <!-- offchain registry -->
          <div v-else>
            <q-input :filled="true" standout bottom-slots v-model="offchainRegistryIdentity.name" label="Name" dense>
            </q-input>
            <q-input :filled="true" standout bottom-slots v-model="offchainRegistryIdentity.description"
              label="Description" dense>
            </q-input>
            <q-input :filled="true" standout bottom-slots v-model="offchainRegistryIdentity.uris!.icon" label="Icon URI"
              dense>
            </q-input>
            <q-input :filled="true" standout bottom-slots v-model="offchainRegistryIdentity.uris!.web" label="Web URI"
              dense>
            </q-input>
          </div>
        </div>
        <q-stepper-navigation>
          <q-btn @click="step = 3" color="primary" label="Continue" />
          <q-btn flat @click="step = 1" color="primary" label="Back" class="q-ml-sm" />
        </q-stepper-navigation>
      </q-step>

      <!-- <q-step :name="3" title="Ad template" icon="assignment" disable>
        This step won't show up because it is disabled.
      </q-step> -->

      <q-step :name="3" title="Identities" icon="add_comment">
        The given <code>authbase</code>'s identity
        <q-input :filled="true" standout bottom-slots v-model="identitySnapshot.name" label="Name" dense>
        </q-input>
        <q-input :filled="true" standout bottom-slots v-model="identitySnapshot.description" label="Description" dense>
        </q-input>
        <q-input :filled="true" standout bottom-slots v-model="identitySnapshot.uris!.icon" label="Icon URI" dense>
        </q-input>
        <q-input :filled="true" standout bottom-slots v-model="identitySnapshot.uris!.web" label="Web URI" dense>
        </q-input>

        <q-stepper-navigation>
          <q-btn color="primary" @click="step = 4" label="Continue" />
          <q-btn flat @click="step = 2" color="primary" label="Back" class="q-ml-sm" />
        </q-stepper-navigation>
      </q-step>
      <q-step :name="4" title="Token Details" icon="add_comment">
        The Token's details
        <q-input :filled="true" standout bottom-slots v-model="identitySnapshot.token.category"
          label="Category (Token Id)" :rules="[v => v.length == 64 || 'Required 64 characters long']" dense
          class="q-mb-md">
          <template v-slot:hint>
            <div><i>Often, this will be equal to the identity's authbase</i> </div>
          </template>
        </q-input>
        <q-input :filled="true" standout bottom-slots v-model="identitySnapshot.token.symbol"
          :rules="[v => v.length > 0 || 'Required']" label="Token Symbol" required dense>
        </q-input>
        <q-input :filled="true" type="number" standout bottom-slots v-model="identitySnapshot.token.decimals"
          :rules="[v => (v > 0 && v < 19) || 'Value Must be 0 - 18']" label="Decimals" dense>
        </q-input>
        <q-stepper-navigation>
          <q-btn color="primary" label="Finish" @click="finish" />
          <q-btn flat @click="step = 3" color="primary" label="Back" class="q-ml-sm" />
        </q-stepper-navigation>
      </q-step>
    </q-stepper>
  </div>
</template>

<script setup lang="ts">

import { ref, onMounted, watch, computed } from 'vue';
import { Registry as BcmrRegistry, OffChainRegistryIdentity, IdentitySnapshot, TokenCategory } from 'src/interfaces/bcmr-v2.schema';
import { RequireOptional } from 'src/types'

defineOptions({ name: 'BcmrBasicFormWizard' })

const props = defineProps<{
  type: 'fungible' | 'nonfungible' | 'hybrid',
  bcmr?: BcmrRegistry | undefined | null,
  authbase?: string | undefined// Can just pass the authbase, ignored if bcmr has value
}>()

const step = ref(1)

const emit = defineEmits<{
  finish: [registry: any],
  cancel: []
}>()

const version = ref('1.0.0')

/**
 * registryIdentity can be an authbase(string) or OffchainRegistryIdentity(object)
 */
const authbase = ref<string>(typeof (props.bcmr?.registryIdentity) == 'string' ? props.bcmr.registryIdentity : '')
const offchainRegistryIdentity = ref<OffChainRegistryIdentity>(typeof (props.bcmr?.registryIdentity) == 'object' ? props.bcmr.registryIdentity : {
  name: 'Example Metadata Registry Name',
  description: 'Example metadata description',
  uris: {
    icon: 'https://example.com/icons/example.png',
    web: 'https://example.com',
  }
})

const token = ref<TokenCategory>({
  category: '',
  symbol: '',
  decimals: 8
})

const identitySnapshot = ref<RequireOptional<IdentitySnapshot, 'token'>>({
  name: '',
  description: '',
  uris: {
    icon: 'https://example.com/icons/example.png',
    web: 'https://example.com',
  },
  token: token.value,
})

// Flat model of identities so it's easier to work with
// const identity = ref<{
//   authbase: string,
//   identityHistoryTimestamp: string,
//   // IdentitySnapshot
//   identitySnapshot?: IdentitySnapshot,
// }>({
//   authbase: authbase.value,
//   identityHistoryTimestamp: '',
//   identitySnapshot: identitySnapshot.value
// })

const registryIdentity = computed(() => authbase.value ? authbase.value : offchainRegistryIdentity.value)

// const identities = computed(() => {
//   let identityHistory = {
//     [identity.value.identityHistoryTimestamp]: identity.value.identitySnapshot
//   } as IdentityHistory
//   return {
//     [identity.value.authbase]: identityHistory
//   }
// })

const registry = ref<BcmrRegistry>({
  version: { 'major': 1, 'minor': 0, 'patch': 0 },
  latestRevision: new Date().toISOString(),
  registryIdentity: registryIdentity.value,
})

const registryIdentitySelector = ref<'authbase' | 'offchain'>('authbase')
const registryIdentitySelections = ref<{ label: string, value: string }[]>([
  { label: 'Offchain Registry Identity', value: 'offchain' },
  { label: 'Authbase (recommended)', value: 'authbase' }
])

const registrySchemaOptions = ref<string[]>([
  'https://cashtokens.org/bcmr-v2.schema.json'
])

watch(version, (newVersion) => {
  let v = newVersion.split('.').map(vv => Number(vv))
  registry.value.version = { major: v[0], minor: v[1], patch: v[2] }
})

onMounted(() => {
  if (props.bcmr) {
    registry.value = props.bcmr
    version.value = registry.value.version ? Object.values(registry.value.version).join('.') : '1.1.0'
  }
  if (props.authbase) {
    authbase.value = props.authbase
    identitySnapshot.value.token.category = props.authbase
  }

})

const finish = () => {
  registry.value.identities = {
    [authbase.value]: {
      [registry.value.latestRevision]: identitySnapshot.value
    }
  }
  registry.value.registryIdentity = authbase.value ? authbase.value : offchainRegistryIdentity.value
  emit('finish', registry.value)
}
</script>
