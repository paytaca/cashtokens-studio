<template>
    <q-table :rows="rows" :columns="columns" row-key="type" flat dark :loading="loading" v-model:pagination="pagination"
        @request="onRequest" @row-click="onRowClick" class="bg-dark border-radius-12">
        <template v-slot:body-cell-type="props">
            <q-td :props="props" class="text-mono">
                <div class="flex items-center no-wrap q-gutter-x-md">
                    <div class="flex column items-center">
                        <q-avatar size="md">
                            <q-img v-if="props.row.nft?.uris?.icon" :src="ipfsToGatewayUrl(props.row.nft?.uris?.icon)!"
                                fit="cover">
                            </q-img>
                            <q-img v-else :src="`https://api.dicebear.com/10.x/identicon/svg?seed=${props.row.type}`"
                                fit="cover">
                                <q-tooltip class="bg-grey-9 text-caption text-grey-4">No
                                    Icon —
                                    generated
                                    placeholder</q-tooltip>
                            </q-img>
                        </q-avatar>
                        <span v-if="!props.row.nft?.uris?.icon" class="text-grey-6 font-8 q-mt-xs"
                            style="line-height: 1;">No Icon</span>
                        <span v-else class="text-grey-6 font-8 q-mt-xs" style="line-height: 1;"></span>
                    </div>
                    <div>
                        <div class="q-gutter-x-sm">
                            <span class="text-bold">{{ props.row.nft.name }}</span>
                            <q-chip :class="['text-capitalize', statusClass(props.row.status)]" dense>
                                {{ status(props.row.status) }}
                            </q-chip>
                        </div>
                        <div class="icon-badge-hex text-grey-8">
                            &lt;{{ props.row.type }}&gt;
                        </div>
                    </div>
                </div>
            </q-td>
        </template>
        <template v-slot:body-cell-name="props">
            <q-td :props="props">{{ props.row.nft.name }} </q-td>
        </template>
        <template v-if="allowDelete" v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-right">
                <q-btn flat dense icon="delete" color="negative" :label="$q.screen.gt.xs ? 'Delete' : ''" no-caps
                    @click.stop="onRowDelete($event, props.row, props.pageIndex)" />
            </q-td>
        </template>
        <template v-slot:no-data>
            <div class="text-grey-5 text-center q-pa-md">No published NFTs</div>
        </template>
    </q-table>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { ipfsToGatewayUrl } from 'src/core/ipfs'
import { QTableColumn } from 'quasar';


const props = defineProps<{
    rows: any[]
    loading: boolean
    total: number,
    allowDelete?: boolean
}>()

const $q = useQuasar()

const columns = computed((): QTableColumn[] => {
    const cols: QTableColumn[] = [
        { name: 'type', label: 'Items', field: 'type', align: 'left', sortable: true },
    ]
    if (props.allowDelete) {
        cols.push({ name: 'actions', label: 'Actions', field: 'actions', align: 'right' })
    }
    return cols
})

const status = computed(() => {
    return (s: string) => {
        if (s === 'deleted') return 'Marked for deletion'
        if (s === 'modified') return 'Modified'
        return s
    }
})

const statusClass = computed(() => {
    return (s: string) => {
        if (s === 'deleted') return 'text-negative'
        if (s === 'modified') return 'text-warning'
        return 'text-bch'
    }
})

const emit = defineEmits<{
    (e: 'request', pagination: any): void
    // (e: 'request', offset: number, limit: number): void
    (e: 'row-click', evt: Event, row: any, index: number): void
    (e: 'row-delete', evt: Event, row: any, index: number): void
}>()

const pagination = ref({
    sortBy: 'type',
    descending: false,
    page: 1,
    rowsPerPage: 2,
    rowsNumber: 0
})

watch(() => props.total, (totalRecordCount) => {
    pagination.value.rowsNumber = totalRecordCount
})



const onRequest = (requestProps: any) => {
    const { page, rowsPerPage } = requestProps.pagination
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.page = page
    emit('request', pagination.value)
}

const onRowClick = (evt: Event, row: any, index: number) => {
    emit('row-click', evt, row, index)
}

const onRowDelete = (evt: Event, row: any, index: number) => {
    emit('row-delete', evt, row, index)
}

onMounted(() => {
    pagination.value.rowsNumber = props.total
    emit('request', pagination.value)
})
</script>
