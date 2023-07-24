import { useUIStore } from 'src/stores/ui'
import { useUser } from 'src/stores/user'
import { useBcmr } from 'src/stores/bcmr'

export default  () => {
  const user = useUser()
  const ui = useUIStore()
  const bcmr = useBcmr()
  return { user, ui, bcmr }
}
