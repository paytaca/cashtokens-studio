let socket: WebSocket | null = null
let shouldReconnect = true
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

// Extracts embedded JSON and readable strings from the Protobuf binary frame
function parseProtobufFrame(buffer: any) {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  // Locate the embedded JSON array '[' or object '{'
  const firstBracket = text.indexOf('[');
  const firstBrace = text.indexOf('{');
  let jsonStart = -1;

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    jsonStart = firstBracket;
  } else if (firstBrace !== -1) {
    jsonStart = firstBrace;
  }

  let payload = null;
  let headerText = text;

  if (jsonStart !== -1) {
    headerText = text.slice(0, jsonStart);
    const closingChar = text[jsonStart] === '[' ? ']' : '}';
    const jsonEnd = text.lastIndexOf(closingChar);

    if (jsonEnd > jsonStart) {
      try {
        payload = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      } catch (err) {
        console.warn('JSON slice parse failed:', err);
      }
    }
  }

  // Extract readable ASCII metadata tags from the Protobuf header (e.g. "mempool", "chipnet", "LIVE_SUBSCRIPTION")
  const metaTags = headerText.match(/[a-zA-Z0-9_-]{3,}/g) || [];

  return { metaTags, payload };
}

export interface ParsedFrame {
  metaTags: string[]
  payload: any
}

export function createWebsocket(
  onFrame: (frame: ParsedFrame) => void,
  onStatusChange?: (connected: boolean) => void) {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket
  }
  socket = new WebSocket(import.meta.env.VITE_BLOCKEXPLORER_CASH_WSS)
  socket.binaryType = 'arraybuffer'
  socket.onmessage = (event: MessageEvent) => {
    if (!(event.data instanceof ArrayBuffer)) return
    const parsed = parseProtobufFrame(event.data)
    onFrame(parsed)
  }

  socket.onopen = () => {
    onStatusChange?.(true)
  }

  socket.onclose = () => {
    onStatusChange?.(false)
    socket = null
    if (shouldReconnect) {
      reconnectTimer = setTimeout(() => createWebsocket(onFrame, onStatusChange), 5000)
    }
  }

  return socket
}

export function closeWebsocket() {
  shouldReconnect = false
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (socket) {
    socket.close()
    socket = null
  }
}

