<template>
  <fieldset :disabled="mode === 'read'" class="flat">
    <slot name="header">
      <div class="flex justify-between items-center">
        <div class="flex items-center">
          <h5 class="q-my-sm text-bold q-gutter-x-sm">
            <q-icon name="mdi-book-clock-outline"></q-icon>
            <span>
              {{ t('label.registry.identitySnapshot') }}
            </span>
          </h5>
          <q-label v-if="identitySnapshotModified" class="text-caption text-warning">[{{ t('label.modified')
          }}]</q-label>
        </div>
        <q-toggle :false-value="true" :true-value="false" color="red" v-model="identitySnapshotHidden" />
      </div>
    </slot>
    <template v-if="!identitySnapshotHidden">
      <FormField>
        <q-label>{{ t('label.registry.name') }}</q-label>
        <q-input v-model="identitySnapshot.name" class="full-width" filled></q-input>
      </FormField>
      <FormField>
        <q-label>{{ t('label.registry.description') }}</q-label>
        <q-input v-model="identitySnapshot.description" class="full-width" filled></q-input>
      </FormField>
      <FormField>
        <q-label>{{ t('label.registry.status') }}</q-label>
        <div class="flex">
          <q-radio :model-value="identitySnapshot.status || 'active'" checked-icon="task_alt"
            unchecked-icon="panorama_fish_eye" val="active" label="Active" color="green" />
          <q-radio v-model="identitySnapshot.status" checked-icon="task_alt" unchecked-icon="panorama_fish_eye"
            val="inactive" label="Inactive" color="grey" disable />
          <q-radio v-model="identitySnapshot.status" checked-icon="local_fire_department"
            unchecked-icon="panorama_fish_eye" val="burned" label="Burned" color="orange" disable />
        </div>
      </FormField>
      <Uris v-model:uris="uris" :hideable="false" enable-icon-upload />
      <slot name="token-category">
        <TokenCategory v-if="identitySnapshot?.token" v-model:token="identitySnapshot.token" />
      </slot>
    </template>
  </fieldset>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { IdentitySnapshot, URIs } from 'src/core/bcmr/bcmr-v2.schema'
import TokenCategory from './TokenCategory.vue'
import FormField from 'components/FormField.vue'
import Uris from './Uris.vue'
const { t } = useI18n()
const emit = defineEmits<{
  (e: 'changed', value: boolean): void,
}>()
const props = withDefaults(defineProps<{
  mode?: 'read' | 'write'
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

const unwatchIdentitySnapshot = watch(
  () => JSON.parse(JSON.stringify(identitySnapshot.value || {})),
  () => {
    unwatchIdentitySnapshot()
    identitySnapshotModified.value = true
    emit('changed', true)
  },
  { deep: true }
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