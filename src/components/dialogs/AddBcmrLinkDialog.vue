<template>
  <q-dialog v-close-popup>
    <q-card class="q-px-sm q-py-lg full-width">
      <q-toolbar>
        <q-toolbar-title class="text-h5 text-bold">Add Links</q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <q-input v-model="form.support" dense flat label="Support" clearable>
          <template v-slot:prepend>
            <q-icon name="support"></q-icon>
          </template>
        </q-input>
        <q-input v-model="form.chat" dense flat label="Chat" clearable>
          <template v-slot:prepend>
            <q-icon name="chat"></q-icon>
          </template>
        </q-input>
        <q-input v-model="form.forum" dense flat label="Forum" clearable>
          <template v-slot:prepend>
            <q-icon name="forum"></q-icon>
          </template>
        </q-input>
        <q-input v-model="form.blog" dense flat label="Blog" clearable>
          <template v-slot:prepend>
            <q-icon name="book"></q-icon>
          </template>
        </q-input>
        <q-input v-model="form.telegram" dense flat label="Telegram" clearable>
          <template v-slot:prepend>
            <q-icon name="telegram"></q-icon>
          </template>
        </q-input>
        <q-input v-model="form.twitter" dense flat label="X (formerly Twitter)" clearable>
          <template v-slot:prepend>
            <q-icon name="clear"></q-icon>
          </template>
        </q-input>
        <q-input v-model="form.youtube" dense flat label="Youtube" clearable>
          <template v-slot:prepend>
            <q-icon name="smart_display"></q-icon>
          </template>
        </q-input>
        <q-input v-model="form.reddit" dense flat label="Reddit" clearable>
          <template v-slot:prepend>
            <q-icon name="reddit"></q-icon>
          </template>
        </q-input>
      </q-card-section>
      <q-card-actions class="row justify-end">
        <q-btn size="lg" label="Cancel" @click="$emit('close')" color="negative"></q-btn>
        <q-btn size="lg" label="Ok"
          @click="$emit('confirm', Object.values(form).some((v) => Boolean(v)) ? form : undefined)"
          color="primary"></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps<{
  links?: {
    telegram?: string,
    youtube?: string,
    twitter?: string,
    reddit?: string,
    discord?: string,
    blog?: string,
    forum?: string,
    chat?: string,
    support?: string,
  }
}>()

const form = ref<{
  telegram: string,
  youtube: string,
  twitter: string,
  reddit: string,
  discord: string,
  blog: string,
  forum: string,
  chat: string,
  support: string,
}>({
  telegram: '',
  youtube: '',
  twitter: '',
  reddit: '',
  discord: '',
  blog: '',
  forum: '',
  chat: '',
  support: '',
})

onMounted(() => {
  if (props.links) {
    form.value = {
      telegram: '',
      youtube: '',
      twitter: '',
      reddit: '',
      discord: '',
      blog: '',
      forum: '',
      chat: '',
      support: '',
      ...props.links,
    }
  }


})
</script>
