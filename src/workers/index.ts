import * as Comlink from 'comlink'
import type { RegistryWorkerAPI } from "./registry-worker" // Use 'import type' for cleaner bundles

// 1. Keep the internal instance reference nullable inside module scope
let workerInstance: Comlink.Remote<RegistryWorkerAPI> | null = null

export function getRegistryWorker(): Comlink.Remote<RegistryWorkerAPI> {
    // 2. Safely initialize on the client side only
    if (typeof window !== 'undefined' && !workerInstance) {
        const w = new Worker(
            new URL('../workers/registry-worker.ts', import.meta.url),
            { type: 'module' }
        )
        workerInstance = Comlink.wrap<RegistryWorkerAPI>(w)
    }
    
    // 3. Throw an explicit error instead of returning null to fix the TypeScript signature
    if (!workerInstance) {
        throw new Error(
            'Registry Worker was invoked in a non-browser environment (e.g., SSR or Server Unit Test).'
        )
    }
    
    return workerInstance
}
