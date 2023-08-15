<template>
  <q-form class="q-gutter-md">
    <q-input :model-value="registry?.latestRevision" label="Latest Revision" class="col-xs-1" filled square dense />
    <q-input name="version" :model-value="version" label="Version" class="col-xs-1" filled square dense
      @change="(v: string) => registry?.setVersion(v)" />
    <q-input name="registry-name"
      v-if="typeof (registry?.registryIdentity) === 'string' && registry?.identities && registry?.registryIdentity && registry?.latestRevision"
      :model-value="registry?.identities[registry!.registryIdentity!][registry!.latestRevision]?.name"
      label="Registry Name" class="col-xs-1" placeholder="E.g. ACME Registry" filled square dense
      @change="(v: string) => registry!.setRegistryName(v)">
    </q-input>
    <q-input name="registry-description"
      v-if="typeof (registry?.registryIdentity) === 'string' && registry?.identities && registry?.registryIdentity && registry?.latestRevision"
      :model-value="registry?.identities[registry!.registryIdentity!][registry!.latestRevision]?.description"
      label="Registry Description" class="col-xs-1" filled square dense
      @change="(v: string) => registry?.setRegistryDescription(v)">
    </q-input>
    <q-input name="token-symbol"
      v-if="typeof (registry?.registryIdentity) === 'string' && registry?.identities && registry?.registryIdentity && registry?.latestRevision"
      :model-value="registry!.identities[registry!.registryIdentity!][registry!.latestRevision]!.token!.symbol!"
      label="Token Symbol" class="col-xs-1" filled square dense @change="(v: string) => registry!.setTokenSymbol(v)">
    </q-input>
    <q-input name="token-decimals"
      v-if="typeof (registry?.registryIdentity) === 'string' && registry?.identities && registry?.registryIdentity && registry?.latestRevision"
      :model-value="registry!.identities[registry!.registryIdentity!][registry!.latestRevision]!.token!.decimals!"
      label="Token Decimals" class="col-xs-1" filled square dense @change="(v: number) => registry!.setTokenDecimals(v)">
    </q-input>
    <q-list>
      <q-expansion-item label="URIs">
        <q-input
          v-if="typeof (registry?.registryIdentity) === 'string' && registry?.identities && registry?.registryIdentity && registry?.latestRevision"
          :model-value="registry!.getIconUri()" label="Icon URI" filled square dense
          @change="(v: string) => registry!.addIconUri(v)" class="q-my-md">
        </q-input>
        <q-input
          v-if="typeof (registry?.registryIdentity) === 'string' && registry?.identities && registry?.registryIdentity && registry?.latestRevision"
          :model-value="registry!.getRegistryUri()" label="Registry URI" filled square dense
          @change="(v: string) => registry!.addRegistryUri(v)">
        </q-input>
      </q-expansion-item>
    </q-list>
    <BusyButton label="Publish" color="primary" @click="() => registry?.publish()" />
  </q-form>
</template>

<script setup lang="ts">
import AuthchainIdentity from 'src/models/AuthchainIdentity';
import { BitcoinCashMetadataRegistry } from 'src/models/BitcoinCashMetadataRegistry';
import { ref, onMounted, computed } from 'vue';
import BusyButton from 'src/components/BusyButton.vue'

const props = defineProps<{ authchainIdentity?: AuthchainIdentity, instance?: BitcoinCashMetadataRegistry }>()
const registry = ref<BitcoinCashMetadataRegistry>()
const version = computed(() => `${registry.value?.version.major}.${registry.value?.version.minor}.${registry.value?.version.patch}`)

onMounted(() => {
  registry.value = props.instance
  registry.value!.authchainIdentity = props.authchainIdentity

  console.log(registry.value?.getToken())
})

</script>
