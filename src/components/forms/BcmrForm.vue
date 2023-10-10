<template>
  <q-form disable>
    <div v-if="bcmr" class="row q-mb-md rounded-borders" :class="!$q.dark.isActive ? 'bg-grey-4' : 'bg-grey-10'">
      <div class="col-12 q-gutter-sm q-py-sm row items-center justify-end">
        <q-btn type="a" dense no-caps @click="readOnly = !readOnly" flat :color="readOnly ? 'negative' : 'secondary'">
          <template v-slot:default>
            <span v-if="!readOnly"><q-icon name="edit"></q-icon>
              <q-tooltip anchor="top middle" self="top middle" :offset="[10, 10]">Click to disable edit</q-tooltip>
            </span>
            <span v-else><q-icon name="edit_off"> </q-icon>
              (Read only)
              <q-tooltip anchor="top middle" self="top middle" :offset="[10, 10]">Click to edit</q-tooltip>
            </span>

          </template>
        </q-btn>
        <q-btn type="a" dense no-caps color="secondary" icon="cloud_download" @click="downloadBcmr" flat>
          <template v-slot:default>
            <span v-if="$q.screen.gt.xs" class="q-ml-xs">Download Registry</span>
          </template>
        </q-btn>
        <q-btn v-if="bcmr?.isModified" color="negative" size="md" icon="replay"
          @click="bcmr = new Bcmr(registry as Registry)" dense no-caps flat :disable="Boolean(bcmr?.processing)">
          <template v-slot:default>
            <span v-if="$q.screen.gt.xs" class="q-ml-xs">Undo Changes</span>
          </template>
        </q-btn>
        <q-btn v-if="bcmr?.isModified" color="primary" size="md" @click="storeRegistryInIpfs" dense no-caps
          :icon="!saved ? 'save_as' : 'done_all'" :loading="Boolean(bcmr?.processing)" class="overflow-hidden"
          :disable="Boolean(bcmr?.processing)" flat>
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
          @click="() => openBcmrPublisherDialog(AuthchainRegistryPublisherDialog.__name, bcmr?.authchainIdentity)" dense
          no-caps icon="publish" :disable="Boolean(bcmr?.processing)" flat>
          <template v-slot:default>
            <span v-if="$q.screen.gt.xs" class="q-ml-xs">Publish Update</span>
          </template>
        </q-btn>
      </div>

    </div>
    <q-banner class="border-rounded" :class="!$q.dark.isActive ? 'bg-grey-3' : 'bg-grey-10'" rounded>
      <q-expansion-item label="Registry" class="q-px-md q-pt-sm q-my-sm" icon="menu_book">
        <div class="q-mx-md q-gutter-sm q-my-md">
          <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setSchema(v)"
            :model-value="bcmr?.$schema" label="Schema" filled dense disable></q-input>
          <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setVersion(v)"
            :model-value="bcmr?.versionString" label="Registry Version" filled dense></q-input>
          <q-input class="registry-field" :model-value="bcmr?.latestRevision" label="Latest Revision" disable filled
            dense></q-input>
          <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setLicense(v)"
            :model-value="bcmr?.license" label="License" placeholder="Example: CC0-1.0"
            aria-placeholder="Example: CC0-1.0" filled dense></q-input>
        </div>
      </q-expansion-item>
      <q-expansion-item label="Token Identity" class="q-px-md q-pt-sm q-my-sm" icon="token">
        <div class="q-mx-md q-gutter-sm q-my-md">
          <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setTokenIdentityName(v)"
            :model-value="bcmr?.identitySnapshot?.name" label="Token identity name" filled dense></q-input>
          <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setTokenIdentityDescription(v)"
            :model-value="bcmr?.identitySnapshot?.description" label="Token identity description" filled dense></q-input>
        </div>
      </q-expansion-item>
      <!-- <q-expansion-item label="Token Identity URIs (Links)" class="q-px-md q-pt-sm q-my-sm" icon="public">
        <div class="q-mx-md q-gutter-sm q-my-md">
          <div v-for=" uriName, i  in  Object.keys(bcmr?.identitySnapshot?.uris || {}) " :key="i">
            <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setUri(uriName, v)"
              :model-value="bcmr?.identitySnapshot?.uris?.[uriName]" :label="uriName" filled dense />
          </div>
        </div>
      </q-expansion-item> -->
      <q-expansion-item label="Token Identity URIs (Links)" class="q-px-md q-pt-sm q-my-sm" icon="public">
        <div class="q-mx-md q-gutter-sm q-my-md">
          <div v-for=" uriName, i  in  Object.keys(bcmr?.identitySnapshot?.uris || {}) " :key="i">
            <q-input input-class="registry-field" @update:model-value="(v: any) => bcmr?.setUri(uriName, v)"
              :model-value="bcmr?.identitySnapshot?.uris?.[uriName]" :label="uriName" filled dense />
          </div>
        </div>
        <div class="text-right">
          <q-btn @click="openAddLinkDialog(AddBcmrLinkDialog.__name, {})"
            :label="!bcmr?.identitySnapshot?.uris ? 'Add Links' : 'Edit Links'" color="secondary" dense flat
            :icon="!bcmr?.identitySnapshot?.uris ? 'add' : undefined">
          </q-btn>
        </div>
        <AddBcmrLinkDialog v-if="Boolean(bcmrLinkAdderDialog)"
          :model-value="bcmrLinkAdderDialog == AddBcmrLinkDialog.__name" @close="hideBcmrLinkAdderDialog"
          :links="bcmr?.identitySnapshot?.uris" @confirm="onConfirmAddLink" persistent />
      </q-expansion-item>
      <q-expansion-item label="Token Category Details" class="q-px-md q-pt-sm q-my-sm" icon="token">
        <div class="q-mx-md q-gutter-sm q-my-md">
          <q-input class="registry-field" @update:model-value="(v: any) => bcmr?.setTokenSymbol(v)"
            :model-value="bcmr?.identitySnapshot?.token?.symbol" label="Token category symbol" filled dense></q-input>
          <q-input class="registry-field" v-if="Number(bcmr?.authchainIdentity?.token?.amount) > 0"
            @update:model-value="(v: any) => bcmr?.setTokenDecimals(v)"
            :model-value="bcmr?.identitySnapshot?.token?.decimals" label="Token category decimals" filled dense></q-input>
        </div>
      </q-expansion-item>

      <q-expansion-item v-if="bcmr?.nfts && bcmr?.nfts.length > 0" label="Token Category NFTs"
        class="q-px-md q-pt-sm q-my-sm scroll overflow-auto" icon="token" style="max-width: 100%;">
        <div class="col-xs-12 scroll overflow-auto">
          <div class="q-pa-lg flex flex-center">
            <q-pagination v-model="nftsPagination.currentPage" :max="nftsPagination.numberOfPages"
              :max-pages="nftsPagination.maxRowsPerPage" :boundary-numbers="false" />
          </div>
          <q-markup-table style="max-width: 100%;" class="overflow-auto text-wrap text-center">
            <thead>
              <th>#</th>
              <th>Image</th>
              <th>Commitment</th>
              <th>Name</th>
              <th>Description</th>
              <th>Uris</th>
              <th>Extensions</th>
            </thead>
            <tbody>
              <tr v-for="nft, i in nftPage" :key="Object.keys(nft)[0] + i">
                <td>{{ i + 1 }}</td>
                <td>
                  <q-avatar v-if="parsedNft(nft)?.nft?.uris?.icon">
                    <img :src="parsedNft(nft)?.nft?.uris?.icon" alt="">
                  </q-avatar>
                  <q-icon v-else name="broken_image"></q-icon>
                </td>
                <td>{{ parsedNft(nft)?.commitment }}</td>
                <td>{{ parsedNft(nft)?.nft?.name }}</td>
                <td style="max-width:10em;text-wrap: wrap;">{{ parsedNft(nft)?.nft?.description }}</td>
                <td style="max-width:10em;text-wrap: wrap;">
                  <q-btn icon="handyman" disable>
                    Uris
                    <q-tooltip>Feature under construction</q-tooltip>
                  </q-btn>
                </td>
                <td style="max-width:10em;text-wrap: wrap;">
                  <q-btn icon="handyman" disable>
                    Extensions
                    <q-tooltip>Feature under construction</q-tooltip>
                  </q-btn>
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </div>
      </q-expansion-item>
    </q-banner>
    <AuthchainRegistryPublisherDialog v-if="dialog" :model-value="dialog === AuthchainRegistryPublisherDialog.__name"
      :authchain-identity="(dialogData as AuthchainIdentity)" :url="savedArtifact?.artifact?.uris?.https"
      :content-hash="savedArtifact?.contentHash" @hide="onHide" />
  </q-form>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { AuthchainIdentity, Bcmr } from 'src/app';
import { NftType, Registry, URIs } from 'src/app/bcmr/bcmr-v2.schema';
import { useDialogs } from 'src/composables';
import { onMounted, ref, computed, onBeforeUnmount, watch, readonly } from 'vue';
import AuthchainRegistryPublisherDialog from 'src/components/dialogs/AuthchainRegistryPublisherDialog.vue'
import AddBcmrLinkDialog from 'src/components/dialogs/AddBcmrLinkDialog.vue'
const $q = useQuasar()
const { dialog, dialogData, openDialog: openBcmrPublisherDialog, onHide } = useDialogs()
const props = defineProps<{ registry?: Bcmr, readOnly?: boolean }>()
const bcmr = ref<Bcmr>()
const registryStorageArtifacts = ref<{ contentHash: string, artifact: any }[] | null>()
const { dialog: bcmrLinkAdderDialog, openDialog: openAddLinkDialog, hideDialog: hideBcmrLinkAdderDialog } = useDialogs()

const readOnly = ref<boolean>(props.readOnly !== undefined ? props.readOnly : true)

const saved = computed(() => {
  if (bcmr.value && registryStorageArtifacts.value) {
    return Boolean(registryStorageArtifacts.value?.find(a => a.contentHash === bcmr.value!.getContentHash()))
  }
  return false
})

const parsedNft = computed(() => {
  return (type: { [commitmentHex: string]: NftType }) => {
    const commitment = Object.keys(type)[0]
    const nft = type[commitment]
    return {
      commitment,
      nft
    }
  }
})

const nftPage = ref<[{ [commitmentHex: string]: NftType }] | []>()

const nftsPagination = ref<{
  currentPage: number,
  maxRowsPerPage: number,
  numberOfPages: number
}>({
  currentPage: 1,
  maxRowsPerPage: 10,
  numberOfPages: 0
})

/**
 * If user saved the BCMR in ipfs, this'll return the artifact of 
 * the save operation. This is so the UI is aware if the current
 * modification of the BCMR is already available in IPFS.
 * 
 * This is done by saving the content hash of the BCMR in 
 * local storage.
 * 
 */
const savedArtifact = computed(() => {
  if (bcmr.value && registryStorageArtifacts.value) {
    return registryStorageArtifacts.value?.find(a => a.contentHash === bcmr.value!.getContentHash())
  }
  return null
})

const initNftsPagination = () => {
  if (bcmr.value?.nfts && bcmr.value.nfts.length > 0) {
    if (bcmr.value.nfts.length > 10) {
      nftsPagination.value.numberOfPages = Math.ceil(bcmr.value.nfts.length / nftsPagination.value.maxRowsPerPage)
    } else {
      nftsPagination.value.numberOfPages = 1
    }
  }
}

const updateNftPage = () => {
  if (nftsPagination.value.numberOfPages <= 1) {
    nftPage.value = bcmr.value?.nfts || []
  } else {
    nftPage.value = bcmr.value!.nfts!.slice(
      nftsPagination.value.currentPage * nftsPagination.value.maxRowsPerPage,
      (nftsPagination.value.currentPage * nftsPagination.value.maxRowsPerPage) + nftsPagination.value.maxRowsPerPage
    ) as [{ [commitmentHex: string]: NftType }]

  }
}

const setFormToWritableOrReadOnly = () => {
  const inputs: any = document.getElementsByClassName("registry-field")
  if (readOnly.value) {
    for (let i of inputs) {
      i.setAttribute("disabled", "true")
    }
  } else {
    for (let i of inputs) {
      i.removeAttribute("disabled")
    }
  }
}

const onConfirmAddLink = (uris: URIs) => {
  if (Object.keys(uris).length > 0) {
    Object.keys(uris).forEach((uriName, i) => {
      if (uris[uriName].length) {
        bcmr.value?.addUri({ [uriName]: uris[uriName] })
      }
    })

  }
  hideBcmrLinkAdderDialog()
}

watch(() => nftsPagination.value.currentPage, (v) => {
  console.log(v)
  updateNftPage()
})

watch(() => readOnly.value, () => {
  setFormToWritableOrReadOnly()
})

onMounted(() => {
  if (props.registry) {
    bcmr.value = new Bcmr(props.registry)
    bcmr.value.authchainIdentity = props.registry.authchainIdentity
  }
  const s = localStorage.getItem('registryStorageArtifacts')
  if (s !== 'undefined' && s !== undefined && s !== null) {
    registryStorageArtifacts.value = JSON.parse(s)

  } else {
    registryStorageArtifacts.value = []
  }
  updateNftPage()
  initNftsPagination()
  setFormToWritableOrReadOnly()
})



onBeforeUnmount(() => {
  if (registryStorageArtifacts.value && registryStorageArtifacts.value.length > 0) {
    localStorage.setItem('registryStorageArtifacts', JSON.stringify(registryStorageArtifacts.value))
  }
})

const storeRegistryInIpfs = async () => {
  try {
    bcmr.value!.setLatestRevision(new Date().toISOString())
    if (bcmr.value?.authchainIdentity?.authKey?.token?.tokenId) {
      bcmr.value!.appendAuthGuardTokenStandardExtension(bcmr.value?.authchainIdentity?.authKey?.token?.tokenId)
    }
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