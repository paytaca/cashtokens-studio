<template>
  <q-page class="q-pa-lg">
    <div class="row justify-center q-gutter-sm">
      <div class="col-xs-12 col-md-10 col-lg-8 row justify-end q-gutter-sm">
        <q-btn color="negative" @click="cancel">Cancel</q-btn>
        <q-btn color="primary" @click="save">Save</q-btn>
      </div>
      <div class="col-xs-12 col-md-10 col-lg-8">
        <JsonEditor v-model="registry" :darkTheme="$q.dark.isActive" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { RouteRecordName, useRoute, useRouter } from 'vue-router';
import JsonEditor from 'vue3-ts-jsoneditor'
import { onMounted, ref, computed, watch } from 'vue'
import { Registry as BcmrRegistry } from 'src/interfaces/bcmr-v2.schema'
import useStore from 'src/composables/useStore'


defineOptions({ name: 'RegistryEdit' })

const { ui, bcmr: bcmrStore } = useStore()
const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const registry = ref<BcmrRegistry | null>(Object.assign({}, bcmrStore.value))
onMounted(() => {
  // registry.value = ui.loadedRegistry
  // console.log(ui.loadedRegistry)
  // console.log(route)
})

const cancel = () => {
  // delete ui.loadedRegistry
  // delete ui.loadedRegistryUpdated
  bcmrStore.value = null
  router.push({ name: route.query.callback as RouteRecordName, query: { tokenId: route.query.tokenId } })
}

const save = () => {
  $q.notify({ message: 'BCMR Updated', color: 'info', timeout: 1000 })
  ui.loadedRegistry = registry.value
  ui.loadedRegistryUpdated = true
  bcmrStore.value = registry.value
  router.push({ name: route.query.callback as RouteRecordName, query: { tokenId: route.query.tokenId } })
}
</script>

