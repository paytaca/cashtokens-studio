/** Copy text to the clipboard. No-op where `navigator` doesn't exist (Node, tests). */
export async function copyText(text: string) {
  if (typeof navigator === 'undefined') return
  await navigator.clipboard.writeText(text)
}
