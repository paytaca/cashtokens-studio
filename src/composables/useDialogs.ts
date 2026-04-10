import { ref } from 'vue';

export const useDialogs = () => {
  const dialog = ref<string>();
  const dialogData = ref<any>(); // can put models here
  const dialogOtherData = ref<any>(); // arbitrary optional data, we added this so we can pass data without refactoring components using dialogData as <T> :-)
  const openDialog = (
    dialogName: string | undefined,
    data: any,
    otherData?: any,
  ) => {
    if (dialogName) {
      dialogData.value = data;
      dialog.value = dialogName;
    }
  };

  const onHide = () => {
    dialog.value = undefined;
    dialogData.value = undefined;
  };

  const hideDialog = () => {
    onHide();
  };

  return {
    dialog,
    dialogData,
    dialogOtherData,
    openDialog,
    onHide,
    hideDialog,
  };
};
