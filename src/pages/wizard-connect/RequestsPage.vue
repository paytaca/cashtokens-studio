<template>
    <q-page>
        <div class="row justify-center q-pa-md">
            <div class="col-xs-12 col-sm-10 q-my-lg">
                <q-table title="WizardConnect Requests" :rows="requests" :columns="columns" row-key="sequence" flat
                    bordered>
                    <template v-slot:body-cell-time="props">
                        <q-td :props="props">
                            {{ new Date(props.value * 1000).toLocaleString() }}
                        </q-td>
                    </template>
                    <template v-slot:body-cell-actions="props">
                        <q-td :props="props" class="q-gutter-x-sm">
                            <q-btn flat round color="negative" icon="close" size="sm" @click="onCancelClick(props.row)">
                                <q-tooltip>Cancel Request</q-tooltip>
                            </q-btn>
                        </q-td>
                    </template>
                </q-table>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">

import { ref, watch } from 'vue'
import { QTableColumn, useQuasar } from 'quasar'

import { useWizardConnect } from 'src/composables/useWizardConnect'

const $q = useQuasar()
const {
    wzDappMgr,
    wzWallet,
} = useWizardConnect()

const requests = ref<any[]>([])

const columns: QTableColumn[] = [
    {
        name: 'action',
        label: 'Action',
        align: 'left',
        field: 'action',
        sortable: true
    },
    {
        name: 'time',
        label: 'Time',
        align: 'left',
        field: 'time',
        sortable: true
    },
    {
        name: 'userPrompt',
        label: 'Prompt',
        align: 'left',
        // Accessing the nested property in the transaction object
        field: (row) => row.transaction?.userPrompt || 'N/A',
        sortable: true
    },
    { name: 'actions', label: 'Cancel', align: 'center', field: 'actions' }
]

const updateRequests = () => {
    wzDappMgr.value?.pendingSignatureRequests?.forEach((value: any, key: number) => {
        const r = requests.value?.find(r => {
            r.sequence === value.sequence
        })
        if (r) return
        requests.value.push(value.request)
    })
}

const onCancelClick = async (row: any) => {
    const controller = new AbortController();
    controller.abort('User Cancelled')

    try {
        const response = await wzDappMgr.value.signTransaction(
            row,
            { signal: controller.signal },
        );
    } catch (err: any) {
        if (err.name === 'AbortError') {
            $q.notify({
                type: 'Warning',
                message: 'Request cancelled'
            })
        }
    }
}

watch(() => wzDappMgr.value, () => {
    updateRequests()
}, { immediate: true, deep: true })

</script>