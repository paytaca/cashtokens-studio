
<template>
  <div class="row">
    <div class="col q-gutter-sm row">
      <div class="col-xs-12 row justify-between">
        <div>{ BCMR }</div>
        <div>
          <q-btn @click="changeEditorMode('readonly')" round flat dense size="xs" icon="format_clear">
            <q-tooltip>Read Only</q-tooltip>
          </q-btn>
          <q-btn @click="changeEditorMode('write')" round flat dense size="xs" icon="edit">
            <q-tooltip>Edit</q-tooltip>
          </q-btn>
          <q-btn @click="initRegistry" round flat dense size="xs" icon="restart_alt">
            <q-tooltip>Clear Changes</q-tooltip>
          </q-btn>
          <q-btn @click="changeEditorMode('readonly')" round flat dense size="xs" hint="Advance">
            {}
            <q-tooltip>Advance</q-tooltip>
          </q-btn>
        </div>

      </div>
      <q-markup-table class="col-xs-12" flat bordered>
        <thead>
          <tr>
            <th class="text-left" colspan="2">Registry</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Schema
            </td>
            <td>
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <span v-if="mode === 'readonly'">{{ r.$schema }}</span>
              <q-input v-else v-model="r.$schema" filled dense></q-input>
            </td>
          </tr>
          <tr>
            <td>
              Version
            </td>
            <td>
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <span v-if="mode === 'readonly'">{{ Object.values(r.version).join('.') }}</span>
              <div v-else class="row q-gutter-sm">
                <q-input class="col registry-version" v-model="r.version.major" label="Major" filled dense></q-input>
                <q-input class="col registry-version" v-model="r.version.minor" label="Minor" filled dense></q-input>
                <q-input class="col registry-version" v-model="r.version.patch" label="Patch" filled dense></q-input>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              Latest Revision
            </td>
            <td>
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <span v-if="mode === 'readonly'">{{ r.latestRevision }}</span>
              <div v-else class="row q-gutter-sm">
                <q-input class="col" v-model="r.latestRevision" filled dense></q-input>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              License
            </td>
            <td>
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <span v-if="mode === 'readonly'">{{ r.license }}</span>
              <div v-else class="row q-gutter-sm">
                <q-input class="col" v-model="r.license" filled dense></q-input>
              </div>
            </td>
          </tr>
        </tbody>
      </q-markup-table>
      <q-markup-table v-if="typeof (r.registryIdentity) === 'string'" class="col-xs-12" flat bordered>
        <thead>
          <tr>
            <th class="text-left" colspan="2">Registry.RegistryIdentity</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-left" colspan="2">
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <span v-if="mode === 'readonly'">{{ registryIdentity + 'x' }}</span>
              <q-input v-else :model-value="(registryIdentity as string)"
                @update:model-value="(v) => registryIdentity = (v as string)" filled dense></q-input>
            </td>
          </tr>
        </tbody>
      </q-markup-table>
      <q-markup-table v-else>
        TODO: Offchain Registry Identity
      </q-markup-table>
      <q-markup-table class="col-xs-12" flat bordered>
        <thead>
          <tr>
            <th class="text-left" aria-colspan="2" colspan="2">Registry.Identities.Identity Snapshot</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Timestamp</td>
            <td>
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <span v-if="mode === 'readonly'">{{ identitySnapshotHistoryTimestamp }}</span>
              <q-input v-else :model-value="(identitySnapshotHistoryTimestamp as string)"
                @update:model-value="(v) => identitySnapshotHistoryTimestamp = (v as string)" filled dense></q-input>
            </td>

          </tr>
          <tr>
            <td>Name</td>
            <td>
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <span v-if="mode === 'readonly'">{{ identitySnapshot?.name }}</span>
              <q-input v-else v-model="identitySnapshot.name" filled dense></q-input>
            </td>
          </tr>
          <tr>
            <td>Description</td>
            <td>
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <span v-if="mode === 'readonly'">{{ identitySnapshot?.description }}</span>
              <q-input v-else v-model="identitySnapshot.description" filled dense></q-input>
            </td>
          </tr>
          <tr v-if="identitySnapshot?.uris">
            <td>URIs</td>
            <td>
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <div v-if="mode === 'readonly'">
                <a v-for="uriName, i in Object.keys(identitySnapshotUris || {})" :href="identitySnapshot?.uris[uriName]"
                  target="_blank" :key="'uri-name-' + i" class="q-mr-sm">
                  {{ uriName }}
                </a>
              </div>
              <div v-else>
                <q-input v-for="uriName in [...Object.keys(identitySnapshotUris)]"
                  :model-value="identitySnapshotUris[uriName]" :key="'bcmr-editor-' + uriName" :label="uriName"
                  @update:model-value="(v) => identitySnapshotUris[uriName] = (v as string)">
                </q-input>
              </div>
            </td>
          </tr>
          <tr>
            <td>Status</td>
            <td>
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <span v-if="mode === 'readonly'">{{ identitySnapshot?.status || 'active' }}</span>
              <q-input v-else v-model="identitySnapshot.status" filled dense></q-input>
            </td>
          </tr>
        </tbody>
      </q-markup-table>
      <q-markup-table class="col-xs-12" flat bordered>
        <thead>
          <tr>
            <th class="text-left" aria-colspan="2" colspan="2">Registry.Identities.Identity Snapshot.Token Category</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Category</td>
            <td>
              {{ mode }}
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <span v-if="mode === 'readonly'">{{ identitySnapshotToken.category }}</span>
              <q-input v-else v-model="identitySnapshotToken.category" filled dense></q-input>
            </td>

          </tr>
          <tr>
            <td>Symbol</td>
            <td>
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <span v-if="mode === 'readonly'">{{ identitySnapshotToken.symbol }}</span>
              <q-input v-else v-model="identitySnapshotToken.symbol" filled dense></q-input>
            </td>
          </tr>
          <tr>
            <td>Decimals</td>
            <td>
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <span v-if="mode === 'readonly'">{{ identitySnapshotToken.decimals || 0 }}</span>
              <q-input v-else v-model="identitySnapshotToken.decimals" filled dense></q-input>
            </td>
          </tr>
        </tbody>
      </q-markup-table>
      <!-- nfts -->
      <q-markup-table class="col-xs-12" flat bordered>
        <thead>
          <tr>
            <th class="text-left" aria-colspan="2" colspan="2">Registry.Identities.Identity Snapshot.Token Category.Nfts
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Description</td>
            <td>
              <q-skeleton v-if="loading" type="text" width="100%"></q-skeleton>
              <span v-if="mode === 'readonly'">{{ identitySnapshotTokenNfts.description }}</span>
              <q-input v-else v-model="identitySnapshotTokenNfts.description" filled dense></q-input>
            </td>
          </tr>
        </tbody>
      </q-markup-table>
    </div>

  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Registry, OffChainRegistryIdentity, IdentitySnapshot, URIs } from 'src/bcmr/bcmr-v2.schema'
import RegistrySample from 'src/bcmr/bcmr-v2.sample'
import { NftCategory, TokenCategory } from 'src/interfaces';
defineOptions({ name: 'BcmrEditor' })
const props = defineProps<{ bcmr?: Registry }>()
const editorMode = ref<'readonly' | 'write'>()
const mode = computed(() => editorMode.value)
const loading = ref<boolean>(false)
const r = ref<Registry>(Object.assign({}, props.bcmr || RegistrySample as Registry))
/**
 * Butcher registry so it's easier to work with
 */
const registryIdentity = ref<OffChainRegistryIdentity | string>()
const identities = ref<Registry['identities']>({} as Registry['identities'])
const identitySnapshotHistoryTimestamp = ref<string | null>()
const identitySnapshot = ref<IdentitySnapshot>({} as IdentitySnapshot)
const identitySnapshotUris = ref<URIs>({
  ...{
    icon: '', web: '', blog: '', chat: '', forum: '', 'icon-intro': '', registry: '', support: ''
  }, ...identitySnapshot?.value?.uris
})
const identitySnapshotToken = ref<TokenCategory>({} as TokenCategory)
const identitySnapshotTokenNfts = ref<NftCategory>({ description: '' } as NftCategory)

onMounted(() => {
  initRegistry()
})

const changeEditorMode = (m: 'readonly' | 'write') => {
  editorMode.value = m
}

const initRegistry = () => {
  r.value = Object.assign({}, props.bcmr || RegistrySample)
  console.log(props.bcmr)
  // init registryIdentity
  registryIdentity.value = r.value.registryIdentity
  initIdentities()
  initIdentitySnapshotHistoryTimestamp()
  initIdentitySnapshot()
}

const initIdentities = () => {
  if (r.value && registryIdentity.value && typeof (registryIdentity.value) === 'string') {
    identities.value = r.value.identities
  }
}

const initIdentitySnapshotHistoryTimestamp = () => {
  if (identities.value && typeof (registryIdentity.value) === 'string') {
    identitySnapshotHistoryTimestamp.value = Object.keys(identities.value[registryIdentity.value])[0]
  } else {
    identitySnapshotHistoryTimestamp.value = null
  }
}

const initIdentitySnapshot = () => {
  if (identities.value && typeof (registryIdentity.value) === 'string' && identitySnapshotHistoryTimestamp.value) {
    identitySnapshot.value = identities.value[registryIdentity.value][identitySnapshotHistoryTimestamp.value]
    identitySnapshotUris.value = { ...identitySnapshotUris.value, ...identities.value[registryIdentity.value][identitySnapshotHistoryTimestamp.value].uris }
    identitySnapshotToken.value = identities.value[registryIdentity.value][identitySnapshotHistoryTimestamp.value].token || {} as TokenCategory
    identitySnapshotTokenNfts.value = identities.value[registryIdentity.value][identitySnapshotHistoryTimestamp.value].token?.nfts || {} as NftCategory
  }
}

</script>

<!-- <style lang="scss" scoped>
.q-field--dense .q-field__control,
.q-field--dense .q-field__marginal {
  height: 25px;
}


.q-field__label {
  left: unset;
}
</style> -->
