<template>
  <q-form>
    <div v-if="bcmr" class="row justify-end q-px-md q-mb-lg q-gutter-sm">
      <q-btn type="a" dense no-caps color="secondary" icon="cloud_download" @click="downloadBcmr">
        <template v-slot:default>
          <span v-if="$q.screen.gt.xs" class="q-ml-xs">Download Registry</span>
        </template>
      </q-btn>
      <q-btn v-if="bcmr?.isModified" color="negative" size="md" icon="replay"
        @click="bcmr = new Bcmr(registry as Registry)" dense no-caps>
        <template v-slot:default>
          <span v-if="$q.screen.gt.xs" class="q-ml-xs">Undo Changes</span>
        </template>
      </q-btn>
      <q-btn v-if="bcmr?.isModified" color="primary" size="md" icon="cloud_upload"
        @click="() => $q.notify({ message: 'Feature under construction', color: 'negative', icon: 'handyman' })" dense
        no-caps>
        <template v-slot:default>
          <span v-if="$q.screen.gt.xs" class="q-ml-xs">Publish Update</span>
        </template>
      </q-btn>
    </div>

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
  </q-form>
</template>

<script setup lang="ts">

import { Bcmr } from 'src/app';
import { Registry } from 'src/app/bcmr/bcmr-v2.schema';
import { onMounted, ref } from 'vue';
const props = defineProps<{ registry?: Bcmr }>()
const bcmr = ref<Bcmr>()
onMounted(() => {
  if (props.registry) {
    bcmr.value = new Bcmr(props.registry)
  }
})

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