// src/boot/socket.ts
import { defineBoot } from '#q-app/wrappers'
import { createWebsocket } from '../services/blockexplorer'
import { useLiveTxStore } from '../stores/live-tx'

export default defineBoot(({ store }) => {
  const liveTxStore = useLiveTxStore(store)
  createWebsocket(
    (frame) => liveTxStore.handleLiveTx(frame),
    (connected) => liveTxStore.setConnected(connected)
  )
})
