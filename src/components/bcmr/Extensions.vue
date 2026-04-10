<template>
  <div>
    <div class="text-h5 q-my-md">Extensions</div>
    <div class="flex">
      <div
        v-for="(key1, i) in Object.keys(extensions || {})"
        :key="'extensions' + i"
        class="flex items-center"
      >
        <q-chip
          v-if="typeof extensions[key1] == 'string'"
          removable
          @remove="removeExtension(extensions, key1)"
          size="lg"
        >
          {{ key1 }}: {{ extensions[key1] }}
        </q-chip>
        <template v-else-if="typeof extensions[key1] == 'object'">
          <div
            v-for="(key2, ii) in Object.keys(extensions[key1])"
            :key="'extensions' + ii"
            class="flex items-center"
          >
            <q-chip
              removable
              @remove="removeExtension(extensions, key1, key2)"
              size="lg"
            >
              {{ key1 }}.{{ key2 }}: {{ extensions[key1][key2] }}
            </q-chip>
          </div>
        </template>
      </div>
      <q-btn
        @click="dialog = true"
        text-color="primary"
        icon="add"
        size="md"
        round
      ></q-btn>
    </div>

    <q-dialog
      v-model="dialog"
      @before-show="onBeforeDialogShow"
      @before-hide="onBeforeDialogHide"
      class="q-pa-lg"
      full-width
    >
      <q-card>
        <q-card-section>
          <div class="text-h6">Add Extension</div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-lg">
          <q-banner
            style="background-color: #55454512; color: orange"
            class="rounded-borders"
          >
            {{ extensionOnDialog }}
          </q-banner>
          <q-select
            v-model="extensionValueType"
            :options="['Text', 'Key Value Pair']"
            label="Value Format"
            stack-label
            class="text-capitalize"
            outlined
          />
          <q-input
            v-model="extensionOnDialogLabel"
            label="Label"
            :placeholder="
              extensionValueType == 'Text'
                ? 'Example: info'
                : 'Example: attributes'
            "
            outlined
            autofocus
          />
          <fieldset
            v-if="extensionValueType == 'Key Value Pair'"
            class="q-pa-lg"
          >
            <legend>Value</legend>
            <div class="q-gutter-lg">
              <q-input
                v-model="extensionOnDialogChildLabel"
                label="Label"
                placeholder="Example: color"
                outlined
              />
              <q-input
                v-model="extensionOnDialogValue"
                label="Value"
                placeholder="Example: blue"
                outlined
              />
            </div>
          </fieldset>
          <div v-else>
            <q-input
              v-model="extensionOnDialogValue"
              label="Value"
              placeholder="Examp  le: additional info"
              outlined
            />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="text-primary q-my-lg">
          <q-btn label="Add" @click="addExtension" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import type { Extensions } from 'mainnet-js';
import { defineComponent, ref, watch, computed } from 'vue';

defineComponent({ name: 'ExtensionsComponent' });

const dialog = ref(false);

const extensions = defineModel<Extensions>('extensions', { required: true });

const extensionValueType = ref<'Text' | 'Key Value Pair'>('Text');

const extensionOnDialogLabel = ref<string>();
const extensionOnDialogChildLabel = ref<string>();
const extensionOnDialogValue = ref<string>();

const extensionOnDialog = computed(() => {
  let value: any = {};
  if (extensionOnDialogLabel.value) {
    value[extensionOnDialogLabel.value!] = extensionOnDialogValue.value;
    if (extensionOnDialogChildLabel.value) {
      value[extensionOnDialogLabel.value] = {
        [extensionOnDialogChildLabel.value]: extensionOnDialogValue.value,
      };
    }
  }
  return value;
});

const addExtension = () => {
  const key = Object.keys(extensionOnDialog.value || {})[0];

  if (key.length > 0) {
    if (typeof extensionOnDialog.value[key] == 'object') {
      extensions.value[key] = {
        ...(extensions.value[key] as object),
        ...extensionOnDialog.value[key],
      };
    } else if (typeof extensionOnDialog.value[key] == 'string') {
      // console.log('string', extensionOnDialog.value)
      extensions.value[key] = extensionOnDialog.value[key];
    }
  }
};

const removeExtension = (
  extensions: Extensions,
  key: string,
  key2?: string,
) => {
  if (!key2) {
    return delete extensions[key];
  }
  const parent = extensions[key] as { [key: string]: string };
  delete parent[key2];
};

const onBeforeDialogShow = () => {
  extensionOnDialogLabel.value = '';
  extensionOnDialogValue.value = '';
  extensionOnDialogChildLabel.value = '';
};

const onBeforeDialogHide = () => {
  delete extensionOnDialogChildLabel.value;
};

watch(
  () => extensionValueType.value,
  (v) => {
    extensionOnDialogLabel.value = '';
    if (v == 'Key Value Pair') {
      extensionOnDialogChildLabel.value = '';
    } else {
      delete extensionOnDialogChildLabel.value;
    }
  },
);
</script>
