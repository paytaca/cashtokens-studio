export const TASK_INPUTS_CHECK = 'inputs-check'
export const TASK_PREPARE_TX = 'prepare-transaction'
export const TASK_WAIT_FOR_SIG = 'waiting-for-signature'
export const TASK_BROADCASTING = 'broadcasting'
export const TASK_WAITING_PROPAGATION = 'waiting-propagation'
export const TASK_REFRESH_UTXOS = 'refresh-utxos'

export type TxTaskList = { id: string, label: string }[]

export const txTaskList = [
    { id: TASK_INPUTS_CHECK, label: 'Checking wallet for inputs.' },
    { id: TASK_PREPARE_TX, label: 'Preparing transaction.' },
    { id: TASK_WAIT_FOR_SIG, label: 'Waiting for signature. Please check your wallet.' },
    { id: TASK_BROADCASTING, label: 'Broadcasting transaction. Please wait.' },
    { id: TASK_WAITING_PROPAGATION, label: 'Waiting transaction propagation. Please wait.' },
    { id: TASK_REFRESH_UTXOS, label: 'Refreshing UTXOs' },
]

export function updateTxTaskLabel({txTaskList, taskId, newTaskLabel }: { txTaskList: TxTaskList, taskId: string, newTaskLabel: string }) {
    const task = txTaskList.find(t => t.id === taskId)
    return task!.label?.replace(/\s*\(.*?\)/g, `(${newTaskLabel})`)
}

export * from './create-square-thumbnail'
export * from './load-image'