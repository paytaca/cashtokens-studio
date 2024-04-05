<template>
  <div>
    <div v-if="title" class="text-h5 q-my-lg">{{ title }}</div>
    <div class="q-col-gutter-y-md">
      <q-input v-for="uriName, i in Object.keys(uris || {})" :key="'uris' + i" :label="uriName"
        :model-value="uris[uriName]" @update:model-value="onUpdateModelValue" @focus="selectedUriName = uriName"
        outlined autogrow>
        <template v-slot:after>
          <q-btn icon="remove" @click="() => deleteUri(uriName)"></q-btn>
        </template>
      </q-input>
      <div class="text-right">
        <q-btn @click="addUri" text-color="primary" icon="add" class="q-mt-md"></q-btn>
      </div>
      <div class="col-xs-12 col-sm-6">
        <q-dialog v-model="dialog" @before-show="onBeforeDialogShow" @before-hide="onBeforeDialogHide" class="q-pa-lg">
          <q-card style="min-width: 400px">
            <q-card-section>
              <div class="text-h6">Add URI</div>
            </q-card-section>
            <q-card-section class="q-pt-none q-gutter-lg">
              <q-select v-model="selectedUriName" :options="options" label="Name" stack-label class="text-capitalize"
                outlined />
              <q-input :model-value="uris[selectedUriName]" @update:model-value="onUpdateModelValue" outlined
                autofocus />
            </q-card-section>
            <q-card-actions align="right" class="text-primary q-my-lg">
              <q-btn label="Add" v-close-popup />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { URIs } from 'mainnet-js'
import { defineComponent, defineModel, ref } from 'vue'

defineComponent({ name: 'UrisComponent' })
const props = defineProps<{ title?: string }>()
const dialog = ref<boolean>()
const options = [
  'web',
  'telegram',
  'youtube',
  'twitter',
  'reddit',
  'discord',
  'blog',
  'forum',
  'chat',
  'support',
]
const selectedUriName = ref<string>('web')
const uris = defineModel<URIs>('uris', { required: true })

const addUri = () => {
  dialog.value = true
  selectedUriName.value = 'temp'
}

const deleteUri = (uriName: string) => {
  delete uris.value[uriName]
}


const onUpdateModelValue = (v: string | number | null) => {
  if (!uris.value) {
    uris.value = {}
  }
  uris.value[selectedUriName.value] = String(v)
}

const onBeforeDialogShow = () => {
  if (!uris.value) {
    uris.value = {}
  }
  for (const o of options) {
    if (!uris.value[o]) {
      selectedUriName.value = o
      break
    }
  }
}

const onBeforeDialogHide = () => {
  if (uris.value && !uris.value[selectedUriName.value]) {
    delete uris.value[selectedUriName.value]
  }
}

</script>