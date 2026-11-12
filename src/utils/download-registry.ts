const DEFAULT_REGISTRY_FILENAME = 'bitcoin-cash-metadata-registry.json'

export type RegistryDownloadResult =
  | { success: true; file: string }
  | { success: false; error: string }

/**
 * Download a BCMR registry JSON file to the user's device. The verbatim published file
 * (`rawRegistry`) is preferred so the download matches the on-chain artifact; the parsed
 * registry object is only used as a fallback when the raw blob is unavailable.
 */
export const downloadRegistryFile = (params: {
  rawRegistry?: Blob
  registry?: unknown
  filename?: string
}): RegistryDownloadResult => {
  const filename = params.filename || DEFAULT_REGISTRY_FILENAME

  let blob: Blob | undefined
  if (params.rawRegistry instanceof Blob) {
    blob = params.rawRegistry
  } else if (params.registry !== undefined) {
    blob = new Blob([JSON.stringify(params.registry, null, 2)], { type: 'application/json' })
  }

  if (!blob) {
    return { success: false, error: 'No registry file available to download' }
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)

  return { success: true, file: filename }
}
