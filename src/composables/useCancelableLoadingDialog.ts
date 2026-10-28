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
   * Latches once an irreversible step has run: cancellation must not become available again
   * after a broadcast, even while the next step is spinning up or the success list is on screen.
   */
  let cancelLocked = false;

  /**
   * Cancelling only makes sense while no irreversible step has started, so the dialog's Cancel
   * button is disabled from the first `cancelable: false` step (broadcasting) onwards.
   */
  const syncDialog = () => {
    const reachedIrreversibleStep = steps.value.some(
      (step) => step.cancelable === false && step.status !== 'pending',
    );
    if (reachedIrreversibleStep) cancelLocked = true;

    canCancel.value = !cancelLocked;

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
    cancelLocked = false;
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
    // Stop accepting cancels immediately: the delayed hide is only for showing the final state.
    suppressCancel = true;

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
    canCancel,
    getSignal: () => abortController?.signal,
  };
}
