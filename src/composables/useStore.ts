import { useUIStore } from 'src/stores/ui'
import { useUser } from 'src/stores/user'

export default  () => {
  const user = useUser()
  const ui = useUIStore()
  return { user, ui }
}
