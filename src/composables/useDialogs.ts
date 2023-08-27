import { ref } from "vue"

export const useDialogs = () => {
  const dialog = ref<string>()
  const dialogData = ref<any>()
  const openDialog = (dialogName:string|undefined, data:any) => {
    console.log(dialogName)
    if (dialogName) {
      dialogData.value = data
      dialog.value = dialogName
    }
  }

  const onHide = () => {
    dialog.value = undefined
    dialogData.value = undefined
  }
  return { dialog, dialogData, openDialog, onHide }
}



