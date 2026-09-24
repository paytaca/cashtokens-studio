import { ref } from 'vue';
import { DialogChainObject, useQuasar } from 'quasar';
import CancelableLoadingDialog from 'components/dialogs/CancelableLoadingDialog.vue';

export type LoaderStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface LoaderStepDefinition {
  id: string;
  label: string;
}

export interface LoaderStep extends LoaderStepDefinition {
  status: LoaderStepStatus;
}

export function useCancelableLoadingDialog() {
  const $q = useQuasar();
  const steps = ref<LoaderStep[]>([]);
  let loadingDialog: DialogChainObject | null = null;
  let abortController: AbortController | null = null;

  /**
   * Initializes and displays the checklist overlay dialog
   */
  const startLoader = (
    initialSteps: LoaderStepDefinition[],
    onCancelCallback?: () => void,
  ) => {
    abortController = new AbortController();

    steps.value = initialSteps.map((step) => ({
      ...step,
      status: 'pending' as const,
    }));

    loadingDialog = $q.dialog({
      component: CancelableLoadingDialog,
      componentProps: { steps: steps.value },
    });

    loadingDialog.onCancel(() => {
      if (abortController) abortController.abort();

      const currentActive = steps.value.find((s) => s.status === 'running');
      if (currentActive) currentActive.status = 'failed';

      onCancelCallback?.();
    });
  };

  const updateStep = (id: string, status: LoaderStepStatus) => {
    const targetStep = steps.value.find((s) => s.id === id);
    if (targetStep) {
      targetStep.status = status;

      if (loadingDialog) {
        loadingDialog.update({
          componentProps: { steps: [...steps.value] },
        });
      }
    }
  };

  const stopLoader = (delayMs = 0) => {
    setTimeout(() => {
      if (loadingDialog) {
        loadingDialog.hide();
        loadingDialog = null;
      }
      abortController = null;
    }, delayMs);
  };

  return {
    startLoader,
    updateStep,
    stopLoader,
    getSignal: () => abortController?.signal,
  };
}
