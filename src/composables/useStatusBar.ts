import { useUI } from "src/stores/ui"
import { ref, watch } from "vue"

export const useStatusBar = () => {
  const ui = useUI()
  /**
   * statusProvider is a reactive/ref object that has a .processing:string property to it.
   * Every time the .processing string changes the ui store is updated
   */
  const statusProvider = ref()
  const setStatusProvider = (p: any, /*A ref with .processing attribute*/) => {
    statusProvider.value = p
  }
  
  watch(() => statusProvider.value?.processing, (val) => {
    ui.statusMessage = val
    ui.statusMessageSpinner = true
  })

  watch(() => statusProvider.value?.staticMessage, (val) => {
    ui.statusMessage = val
    ui.statusMessageSpinner = false
  })

  
  return { setStatusProvider }
}



