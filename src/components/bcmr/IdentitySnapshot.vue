<template>
  <fieldset :disabled="mode === 'read'" class="flat">
    <slot name="header">
      <div class="flex justify-between items-center">
        <div class="flex items-center">
          <!-- <h5 class="q-my-sm text-bold q-gutter-x-sm">
            <q-icon name="mdi-book-clock-outline"></q-icon>
            <span>
              {{ t('label.registry.identitySnapshot') }}
            </span>
          </h5> -->
          <label v-if="identitySnapshotModified" class="form-label text-caption text-warning">[{{ t('label.modified')
            }}]</label>
        </div>
        <!-- <q-toggle :false-value="true" :true-value="false" color="red" v-model="identitySnapshotHidden" /> -->
      </div>
    </slot>
    <template v-if="!identitySnapshotHidden">

      <FormField>
        <label>{{ t('label.registry.name') }}</label>
        <q-input v-model="identitySnapshot.name" class="full-width" filled></q-input>
      </FormField>
      <FormField>
        <label>{{ t('label.registry.description') }}</label>
        <q-input v-model="identitySnapshot.description" class="full-width" filled></q-input>
      </FormField>
      <!-- <FormField>
        <label>{{ t('label.registry.status') }}</label>
        <div class="flex">
          <q-radio :model-value="identitySnapshot.status || 'active'" checked-icon="task_alt"
            unchecked-icon="panorama_fish_eye" val="active" label="Active" color="green" />
          <q-radio v-model="identitySnapshot.status" checked-icon="task_alt" unchecked-icon="panorama_fish_eye"
            val="inactive" label="Inactive" color="grey" disable />
          <q-radio v-model="identitySnapshot.status" checked-icon="local_fire_department"
            unchecked-icon="panorama_fish_eye" val="burned" label="Burned" color="orange" disable />
        </div>
      </FormField> -->
      <Uris v-model:uris="uris" :hideable="false" enable-icon-upload />
      <slot name="token-category">
        <!-- <TokenCategory v-if="identitySnapshot?.token" v-model:token="identitySnapshot.token" :authbase="authbase"
          :content-hash="contentHash" :timestamp="timestamp" /> -->
        <template v-if="identitySnapshot?.token">
          <FormField>
            <label>Category</label>
            <q-input v-model="identitySnapshot.token.category" class="full-width" filled></q-input>
          </FormField>
          <FormField>
            <label>Symbol</label>
            <q-input v-model="identitySnapshot.token.symbol" class="full-width" filled></q-input>
          </FormField>
          <FormField>
            <label>Decimals</label>
            <q-input v-model.number="identitySnapshot.token.decimals" type="number" class="full-width" filled></q-input>
          </FormField>
          <FormField v-if="identitySnapshot.token.nfts && Object.keys(identitySnapshot.token.nfts).length > 0">
            <label>NFT Category</label>
            <a v-if="authbase && contentHash && timestamp"
              class="nft-category-link cursor-pointer row items-center q-gutter-x-xs" @click="openNftCategory">
              <q-icon name="token" size="16px" color="primary" />
              <span>View and edit NFT category metadata</span>
              <q-icon name="open_in_new" size="14px" class="q-ml-xs" />
            </a>
            <label v-else class="text-grey-5 text-caption">Available</label>
          </FormField>
        </template>

      </slot>
    </template>
  </fieldset>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { IdentitySnapshot, URIs } from 'src/core/bcmr/bcmr-v2.schema'
import { sha256, utf8ToBin, binToHex } from '@bitauth/libauth'
import TokenCategory from './TokenCategory.vue'
import FormField from 'components/FormField.vue'
import Uris from './Uris.vue'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const emit = defineEmits<{
  (e: 'changed', value: boolean): void,
}>()
const props = withDefaults(defineProps<{
  mode?: 'read' | 'write'
  authbase?: string
  contentHash?: string
  timestamp?: string
}>(), {
  mode: 'write'
})

const identitySnapshot = defineModel<IdentitySnapshot>('identitySnapshot', { required: true })
const identitySnapshotHidden = ref<boolean>(false)
const identitySnapshotModified = ref<boolean>(false)
const uris = ref<URIs>({
  icon: '',
  web: ''
})

let initialSnapshotHash = ''

const calculateSnapshotHash = (snapshot: IdentitySnapshot | null): string => {
  if (!snapshot) return ''
  const serialized = JSON.stringify(snapshot)
  const binaryData = utf8ToBin(serialized)
  const hashedBytes = sha256.hash(binaryData)
  return binToHex(hashedBytes)
}

const openNftCategory = () => {
  router.push({
    path: '/token/metadata-registry',
    query: {
      authbase: props.authbase,
      contentHash: props.contentHash,
      tab: 'nfts'
    }
  })
}


watch(
  () => identitySnapshot.value,
  (currentSnapshot) => {
    if (!currentSnapshot) return
    if (!initialSnapshotHash) {
      initialSnapshotHash = calculateSnapshotHash(currentSnapshot)
      identitySnapshotModified.value = false
      emit('changed', false)
      console.log('Not Changed', currentSnapshot)
    } else if (props.mode === 'write' && initialSnapshotHash) {
      console.log('INITIAL', initialSnapshotHash, currentSnapshot)
      const currentHash = calculateSnapshotHash(currentSnapshot)
      const isDifferent = currentHash !== initialSnapshotHash
      identitySnapshotModified.value = isDifferent
      emit('changed', isDifferent)
      console.log('Changed')
    }


  },
  { immediate: true, deep: true }
)

onMounted(() => {
  if (identitySnapshot.value?.uris) {
    uris.value = identitySnapshot.value.uris
  }
})
</script>


<style scoped lang="scss">
.flat {
  border: none;
  padding: 0;
  margin: 0;
  min-width: 0;
}
</style>