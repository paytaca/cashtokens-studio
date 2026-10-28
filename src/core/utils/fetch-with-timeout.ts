// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 15_000): Promise<Response> {
    return new Promise((resolve, reject) => {
        const controller = new AbortController()
        const id = setTimeout(() => {
            controller.abort()
            reject(new Error(`Request timed out after ${timeoutMs}ms`))
        }, timeoutMs)
        fetch(url, { ...options, signal: controller.signal })
            .then(resolve)
            .catch(reject)
            .finally(() => clearTimeout(id))
    })
}