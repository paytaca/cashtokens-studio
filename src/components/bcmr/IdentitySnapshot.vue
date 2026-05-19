<template>
  <div>
    <slot name="header">
      <div class="flex justify-between items-center">
        <h5 class="q-my-sm text-bold q-gutter-x-sm">
          <q-icon name="mdi-book-clock-outline"></q-icon><span>{{ t('label.registry.identitySnapshot') }}</span>
        </h5>
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
        <!-- uncomment below if status change is supported -->
        <!-- <div class="flex">
          <q-radio v-model="identitySnapshot.status" checked-icon="task_alt" unchecked-icon="panorama_fish_eye"
            val="active" label="Active" color="green" />
          <q-radio v-model="identitySnapshot.status" checked-icon="task_alt" unchecked-icon="panorama_fish_eye"
            val="inactive" label="Inactive" color="grey" />
          <q-radio v-model="identitySnapshot.status" checked-icon="local_fire_department"
            unchecked-icon="panorama_fish_eye" val="burned" label="Burned" color="orange" />
        </div> -->
      </FormField>
      <Uris v-model:uris="uris" :hideable="false" enable-icon-upload />
    </template>
    <slot name="token-category"></slot>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IdentitySnapshot, URIs } from 'src/core/bcmr/bcmr-v2.schema'
import FormField from 'components/FormField.vue'
import Uris from './Uris.vue'
const { t } = useI18n()
const identitySnapshot = defineModel<IdentitySnapshot>('identitySnapshot', { required: true })
const identitySnapshotHidden = ref<boolean>(false)
const uris = ref<URIs>({
  icon: '',
  web: ''
})
onMounted(() => {
  if (identitySnapshot.value?.uris) {
    uris.value = identitySnapshot.value.uris
  }
})
</script>