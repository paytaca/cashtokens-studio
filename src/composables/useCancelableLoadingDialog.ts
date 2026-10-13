import { ref } from 'vue';
import { DialogChainObject, useQuasar } from 'quasar';
import CancelableLoadingDialog from 'components/dialogs/CancelableLoadingDialog.vue';

export type LoaderStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface LoaderStepDefinition {
  id: string;
  label: string;
  /** Whether the dialog's Cancel button stays available while this step runs. */
  cancelable?: boolean;
}

export interface LoaderStep extends LoaderStepDefinition {
  status: LoaderStepStatus;
}

export function useCancelableLoadingDialog() {
  const $q = useQuasar();
  const steps = ref<LoaderStep[]>([]);
  const canCancel = ref(true);
  let loadingDialog: DialogChainObject | null = null;
  let abortController: AbortController | null = null;
  let suppressCancel = false;

  /**
   * Cancelling only makes sense while the active step is still reversible, so
   * the dialog's Cancel button is disabled on steps flagged `cancelable: false`.
   */
  const syncDialog = () => {
    const runningStep = steps.value.find((step) => step.status === 'running');
    canCancel.value = runningStep ? runningStep.cancelable !== false : true;

    loadingDialog?.update({
      componentProps: { steps: [...steps.value], canCancel: canCancel.value },
    });
  };

  /**
   * Initializes and displays the checklist overlay dialog
   */
  const startLoader = (
    initialSteps: LoaderStepDefinition[],
    onCancelCallback?: () => void,
  ) => {
    abortController = new AbortController();
    suppressCancel = false;
    canCancel.value = true;

    steps.value = initialSteps.map((step) => ({
      ...step,
      status: 'pending' as const,
    }));

    loadingDialog = $q.dialog({
      component: CancelableLoadingDialog,
      componentProps: { steps: steps.value, canCancel: canCancel.value },
    });

    loadingDialog.onCancel(() => {
      if (suppressCancel) return;
      if (!canCancel.value) return;

      if (abortController) abortController.abort();

      const currentActive = steps.value.find((s) => s.status === 'running');
      if (currentActive) currentActive.status = 'failed';

      onCancelCallback?.();
    });
  };

  const updateStep = (id: string, status: LoaderStepStatus, newLabel?: string) => {
    const targetStep = steps.value.find((s) => s.id === id);
    if (targetStep) {
      targetStep.status = status;
      if (newLabel) {
        targetStep.label = newLabel
      }
      syncDialog();
    }
  };

  const stopLoader = (delayMs = 0) => {
    setTimeout(() => {
      if (loadingDialog) {
        suppressCancel = true;
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
    canCancel,
    getSignal: () => abortController?.signal,
  };
}
