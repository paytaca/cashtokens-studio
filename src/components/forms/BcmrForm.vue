<template>
  <q-form>
    <div v-if="bcmr" class="row q-mb-lg  shadow-3 rounded-borders"
      :class="!$q.dark.isActive ? 'bg-grey-5' : 'bg-grey-10'">
      <div class="col-12 q-gutter-sm q-py-sm row items-center justify-end">
        <q-btn type="a" dense no-caps color="secondary" icon="cloud_download" @click="downloadBcmr">
          <template v-slot:default>
            <span v-if="$q.screen.gt.xs" class="q-ml-xs">Download Registry</span>
          </template>
        </q-btn>
        <q-btn v-if="bcmr?.isModified" color="negative" size="md" icon="replay"
          @click="bcmr = new Bcmr(registry as Registry)" dense no-caps :disable="Boolean(bcmr?.processing)">
          <template v-slot:default>
            <span v-if="$q.screen.gt.xs" class="q-ml-xs">Undo Changes</span>
          </template>
        </q-btn>
        <q-btn v-if="bcmr?.isModified" color="primary" size="md" @click="storeRegistryInIpfs" dense no-caps
          :icon="!saved ? 'save_as' : 'done_all'" :loading="Boolean(bcmr?.processing)" class="overflow-hidden"
          :disable="Boolean(bcmr?.processing)">
          <template v-slot:default>
            <span v-if="$q.screen.gt.xs" class="q-ml-xs" style="width:100px;text-overflow: ellipsis;">
              {{ saved ? 'Saved' : 'Save in IPFS' }}
            </span>
          </template>
          <template v-slot:loading>
            <div class="row flex">
              <q-spinner-box></q-spinner-box>Saving
            </div>
          </template>
        </q-btn>
        <q-btn v-if="bcmr?.isModified" color="primary" size="md"
          @click="() => $q.notify({ message: 'Feature under construction', color: 'negative', icon: 'handyman' })" dense
          no-caps icon="handyman" disable>
          <template v-slot:default>
            <span v-if="$q.screen.gt.xs" class="q-ml-xs">Publish Update</span>
            <q-tooltip>Feature under construction</q-tooltip>
          </template>
        </q-btn>
      </div>

    </div>
    <q-banner class="border-rounded" :class="!$q.dark.isActive ? 'bg-grey-3' : 'bg-grey-10'" rounded>
      <q-expansion-item label="Registry" class="q-px-md q-pt-sm q-my-sm" icon="menu_book">
        <div class="q-mx-md q-gutter-sm q-my-md">
          <q-input @update:model-value="(v: any) => bcmr?.setSchema(v)" :model-value="bcmr?.$schema" label="Schema" filled
            dense></q-input>
          <q-input @update:model-value="(v: any) => bcmr?.setVersion(v)" :model-value="bcmr?.versionString"
            label="Registry Version" filled dense></q-input>
          <q-input :model-value="bcmr?.latestRevision" label="Latest Revision" disable filled dense></q-input>
          <q-input @update:model-value="(v: any) => bcmr?.setLicense(v)" :model-value="bcmr?.license" label="License"
            placeholder="Example: CC0-1.0" aria-placeholder="Example: CC0-1.0" filled dense></q-input>
        </div>
      </q-expansion-item>
      <q-expansion-item label="Token Info" class="q-px-md q-pt-sm q-my-sm" icon="token">
        <div class="q-mx-md q-gutter-sm q-my-md">
          <q-input @update:model-value="(v: any) => bcmr?.setRegistryName(v)" :model-value="bcmr?.identitySnapshot?.name"
            label="Name of token identity" filled dense></q-input>
          <q-input @update:model-value="(v: any) => bcmr?.setRegistryDescription(v)"
            :model-value="bcmr?.identitySnapshot?.description" label="Description" filled dense></q-input>
        </div>
      </q-expansion-item>
      <q-expansion-item label="Links" class="q-px-md q-pt-sm q-my-sm" icon="public">
        <div class="q-mx-md q-gutter-sm q-my-md">
          <div v-for=" uriName, i  in  Object.keys(bcmr?.identitySnapshot?.uris || {}) " :key="i">
            <q-input @update:model-value="(v: any) => bcmr?.setUri(uriName, v)"
              :model-value="bcmr?.identitySnapshot?.uris?.[uriName]" :label="uriName" filled dense />
          </div>
        </div>
      </q-expansion-item>
    </q-banner>
  </q-form>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { Bcmr } from 'src/app';
import { Registry } from 'src/app/bcmr/bcmr-v2.schema';
import { onMounted, ref, computed, onBeforeUnmount } from 'vue';
import { onBeforeRouteUpdate } from 'vue-router';
const $q = useQuasar()
const props = defineProps<{ registry?: Bcmr }>()
const bcmr = ref<Bcmr>()
const registryStorageArtifacts = ref<{ contentHash: string, artifact: any }[] | null>()
const saved = computed(() => {
  if (bcmr.value && registryStorageArtifacts.value) {
    return Boolean(registryStorageArtifacts.value?.find(a => a.contentHash === bcmr.value!.getContentHash()))
  }
  return false
})

onMounted(() => {
  if (props.registry) {
    bcmr.value = new Bcmr(props.registry)
  }
  const s = localStorage.getItem('registryStorageArtifacts')
  if (s !== 'undefined' && s !== undefined && s !== null) {
    registryStorageArtifacts.value = JSON.parse(s)

  } else {
    registryStorageArtifacts.value = []
  }
})

onBeforeUnmount(() => {
  if (registryStorageArtifacts.value) {
    localStorage.setItem('registryStorageArtifacts', JSON.stringify(registryStorageArtifacts))
  }
})

const storeRegistryInIpfs = async () => {
  try {
    const artifact = await bcmr.value?.storeRegistry()
    if (artifact) {
      registryStorageArtifacts.value?.push({ contentHash: bcmr.value!.getContentHash(), artifact })
      localStorage.setItem('registryStorageArtifacts', JSON.stringify(registryStorageArtifacts.value))
    }
    console.log(artifact)
  } catch (error: any) {
    $q.notify({ type: 'negative', message: error })
  }
}


const downloadBcmr = async () => {
  if (bcmr.value) {
    const blob = new Blob([bcmr.value.getContent()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bitcoin-cash-metadata-registry.json'; // Specify the desired file name with the appropriate extension
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

</script>