<template>
    <q-dialog ref="dialogRef" @hide="onDialogHide">
        <q-card class="bg-dark q-pa-sm viewer-card">
            <div class="flex justify-end">
                <q-btn icon="close" flat round color="negative" no-caps @click="onDialogCancel" />
            </div>
            <NftCard :nft-type="resolvedNftType" :commitment="commitment" :bytecode="bytecode" :symbol="symbol"
                :capability="capability" :fallback-icon="tokenIcon" />
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import type { NftType } from 'src/core/bcmr/bcmr-v2.schema'
import NftCard from 'src/components/NftCard.vue'

defineOptions({ name: 'NftCardViewerDialog' })

defineEmits([
    ...useDialogPluginComponent.emits,
])

const { dialogRef, onDialogHide, onDialogCancel } = useDialogPluginComponent()

const props = defineProps<{
    nftType?: NftType
    /**
     * Deferred metadata lookup. The dialog opens instantly with whatever was available locally and
     * fills in the registry record when this resolves.
     */
    nftTypeLoader?: () => Promise<NftType | undefined>
    commitment: string
    bytecode?: string
    symbol?: string
    capability?: 'none' | 'minting' | 'mutable'
    tokenIcon?: string
}>()

const resolvedNftType = ref(props.nftType)

onMounted(async () => {
    if (resolvedNftType.value || !props.nftTypeLoader) return
    resolvedNftType.value = await props.nftTypeLoader()
})
</script>

<style scoped>
.viewer-card {
    width: 100%;
    max-width: 720px;
}
</style>
