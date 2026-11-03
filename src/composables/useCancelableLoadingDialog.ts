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

/**
 * One run of the checklist dialog.
 *
 * Everything a run owns lives here rather than in the composable's closure. A `stopLoader` that
 * fires after a new run has started must only ever touch its own dialog, and a dialog the user has
 * already dismissed must never be hidden again: Quasar's dialog plugin reads `vm.$` when `hide()`
 * reaches an instance that has already unmounted, which throws `can't access property "$"`.
 */
interface LoaderSession {
  steps: LoaderStep[];
  controller: AbortController;
  dialog: DialogChainObject | null;
  canCancel: boolean;
  suppressCancel: boolean;
  /**
   * Latches once an irreversible step has run: cancellation must not become available again
   * after a broadcast, even while the next step is spinning up or the success list is on screen.
   */
  cancelLocked: boolean;
  /** True once the dialog is gone, whether the user dismissed it or we hid it. */
  closed: boolean;
}

export function useCancelableLoadingDialog() {
  const $q = useQuasar();
  const steps = ref<LoaderStep[]>([]);
  const canCancel = ref(true);
  let session: LoaderSession | null = null;

  /**
   * Cancelling only makes sense while no irreversible step has started, so the dialog's Cancel
   * button is disabled from the first `cancelable: false` step (broadcasting) onwards.
   */
  const syncDialog = (target: LoaderSession) => {
    if (target.closed || target !== session) return;

    const reachedIrreversibleStep = target.steps.some(
      (step) => step.cancelable === false && step.status !== 'pending',
    );
    if (reachedIrreversibleStep) target.cancelLocked = true;

    target.canCancel = !target.cancelLocked;
    canCancel.value = target.canCancel;

    // A run whose dialog is already gone (the user cancelled) is skipped above, so this can only
    // reach a live dialog. The guard is still worth it: the handle is nulled by `closeSession`.
    try {
      target.dialog?.update({
        steps: [...target.steps],
        canCancel: target.canCancel,
      });
    } catch {
      // The dialog went away underneath us; the run is already being torn down.
    }
  };

  /**
   * Drops the handle before hiding, and never hides twice. Hiding is the one path Quasar leaves
   * unguarded, so it has to be idempotent here.
   */
  const closeSession = (target: LoaderSession) => {
    target.suppressCancel = true;

    if (target.closed) return;
    target.closed = true;

    const dialog = target.dialog;
    target.dialog = null;

    try {
      dialog?.hide();
    } catch {
      // Already unmounted: there is nothing left to close.
    }
  };

  /**
   * Initializes and displays the checklist overlay dialog
   */
  const startLoader = (
    initialSteps: LoaderStepDefinition[],
    onCancelCallback?: () => void,
  ) => {
    // A previous run may still be on screen because its delayed hide has not fired yet. Close it
    // now so the user never sees two overlays, and so its pending timeout cannot touch this run.
    if (session) closeSession(session);

    const newSession: LoaderSession = {
      steps: initialSteps.map((step) => ({
        ...step,
        status: 'pending' as const,
      })),
      controller: new AbortController(),
      dialog: null,
      canCancel: true,
      suppressCancel: false,
      cancelLocked: false,
      closed: false,
    };

    session = newSession;
    steps.value = newSession.steps;
    canCancel.value = true;

    const dialog = $q.dialog({
      component: CancelableLoadingDialog,
      componentProps: { steps: newSession.steps, canCancel: true },
    });

    newSession.dialog = dialog;

    dialog.onCancel(() => {
      // Quasar emits this after the dialog unmounted, so the run is over either way. Only the
      // run that still owns the composable may propagate the cancel.
      newSession.closed = true;
      newSession.dialog = null;

      if (session !== newSession) return;
      if (newSession.suppressCancel || !newSession.canCancel) return;

      newSession.controller.abort();

      const currentActive = newSession.steps.find((s) => s.status === 'running');
      if (currentActive) currentActive.status = 'failed';

      onCancelCallback?.();
    });
  };

  const updateStep = (id: string, status: LoaderStepStatus, newLabel?: string) => {
    const target = session;
    if (!target) return;

    const step = target.steps.find((s) => s.id === id);
    if (!step) return;

    step.status = status;
    if (newLabel) step.label = newLabel;
    syncDialog(target);
  };

  const stopLoader = (delayMs = 0) => {
    const target = session;
    if (!target) return;

    // Stop accepting cancels immediately: the delayed hide is only for showing the final state.
    target.suppressCancel = true;

    setTimeout(() => {
      closeSession(target);
      if (session === target) session = null;
    }, delayMs);
  };

  return {
    startLoader,
    updateStep,
    stopLoader,
    canCancel,
    getSignal: () => session?.controller.signal,
  };
}
