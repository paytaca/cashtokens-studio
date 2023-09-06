import { useUI } from "src/stores/ui"
import { ref, watch } from "vue"

export const useStatusBar = () => {
  const ui = useUI()
  const statusProvider = ref()
  const setStatusProvider = (p: any, /*A ref with .processing attribute*/) => {
    statusProvider.value = p
  }
  
  watch(() => statusProvider.value?.processing, (val) => {
    ui.statusMessage = val
  })

  
  return { setStatusProvider }
}



