import { EventBus } from "quasar"
import { inject } from "vue"

export const useEventBus = () => {
  const $ebus = inject<EventBus>('eventBus')
  return { $ebus }
}



