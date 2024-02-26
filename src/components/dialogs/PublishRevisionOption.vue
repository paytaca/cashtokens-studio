<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" title="Publish Registry">
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold q-mb-md" style="text-wrap:wrap">
          Revision Option
        </q-toolbar-title>

      </q-toolbar>
      <q-card-section>
        <q-form class="q-gutter-sm">
          <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
            <q-option-group name="preferred_genre" v-model="revisionOption" :options="[
              { value: 'update', label: 'Update current revision (Recommended)' },
              { value: 'create', label: 'Create new revision' },
            ]
              " color="primary" inline>
              <template v-slot:label="value">
                <div class="q-my-lg">
                  <div>{{ value.label }}</div>
                  <div v-if="value.value == 'update'">
                    <sub>
                      Will only track the latest revision and will maintain a single entry to
                      identity history. Select this if you'd just want to update
                      your token's metadata.
                    </sub>
                  </div>
                  <div v-if="value.value == 'create'">
                    <sub>
                      Will create a new revision and adds a new entry to the identity
                      history.
                      This will cause the metadata file size to bloat, so only select this if you need to keep track
                      of older revisions.
                    </sub>
                  </div>
                </div>
              </template>
            </q-option-group>
          </div>
          <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
            <label> Current Version</label>
            <q-input class="registry-field" :model-value="version" outlined dense disable></q-input>
          </div>
          <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
            <label> New Version</label>
            <q-input class="registry-field" v-model="newVersion" bottom-slots outlined dense autofocus
              :rules="[v => /^\d+\.\d+\.\d+$/.test(v) || 'Invalid value, format should be major.minor.patch']">
              <template v-slot:prepend>
                <q-icon name="priority_high" color="warning"></q-icon>
              </template>
              <template v-slot:hint>
                <span>{{ `<major>.<minor>.<patch>` }}</span>
              </template>
            </q-input>
          </div>
          <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
            <label>Current Revision</label>
            <q-input class="registry-field" :model-value="new Date(latestRevision).toString()" outlined dense
              disable></q-input>
          </div>
          <div class="col-xs-12 col-md-8 q-mb-lg q-gutter-y-sm items-center">
            <label> Updated Revision</label>
            <q-input class="registry-field" :model-value="newRevision" outlined dense disable>
              <template v-slot:prepend>
                <q-icon name="priority_high" color="warning"></q-icon>
              </template>
            </q-input>
          </div>
        </q-form>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn color="primary" size="lg" :label="okLabel || 'ok'"
          @click.stop="() => onDialogOK({ revisionOption, newVersion })" />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { onMounted, ref } from 'vue'

const revisionOption = ref<'update' | 'add'>('update')
const props = defineProps<{ version: string, latestRevision: string, newRevision: string, okLabel: string }>()
const newVersion = ref<string>()
defineEmits([
  ...useDialogPluginComponent.emits,
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

onMounted(() => {
  revisionOption.value = 'update'
  newVersion.value = props.version
})

</script>