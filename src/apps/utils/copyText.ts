export default async (text: string) => {
  if(navigator) {
    await navigator.clipboard.writeText(text)
  }
}
