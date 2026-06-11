import * as Comlink from 'comlink'
import type { RegistryWorkerAPI } from "./registry-worker"

let workerInstance: Comlink.Remote<RegistryWorkerAPI> | null = null

if (typeof window !== 'undefined') {
  const w = new Worker(
    new URL('../workers/registry-worker.ts', import.meta.url),
    { type: 'module' }
  )
  workerInstance = Comlink.wrap<RegistryWorkerAPI>(w)
}

export function getRegistryWorker(): Comlink.Remote<RegistryWorkerAPI> {
    if (!workerInstance) {
        throw new Error(
            'Registry Worker was invoked in a non-browser environment (e.g., SSR or Server Unit Test).'
        )
    }
    return workerInstance
}
