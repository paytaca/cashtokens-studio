let socket: WebSocket | null = null
let shouldReconnect = true
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

const utf8Decoder = new TextDecoder('utf-8', { fatal: false })

/**
 * A double quote only opens or closes a JSON string when an even number of backslashes
 * precedes it; otherwise it is escaped content.
 */
function isUnescapedQuote(text: string, index: number) {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) backslashes++;
  return backslashes % 2 === 0;
}

/** Index of the bracket opening the structure that closes at `tail`, or -1 when unbalanced. */
function matchingOpen(text: string, tail: number) {
  let depth = 0;
  let inString = false;

  for (let i = tail; i >= 0; i--) {
    const char = text[i];
    if (char === '"' && isUnescapedQuote(text, i)) {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === ']' || char === '}') depth++;
    else if (char === '[' || char === '{') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * The JSON payload sits at the tail of the frame, after a binary header whose timestamp,
 * hash and size bytes can read as '[' or '{' once decoded. Anchoring on the closing
 * bracket and walking backwards keeps those header bytes from being mistaken for JSON.
 */
function extractJsonPayload(text: string): { value: unknown; start: number } | null {
  for (let tail = text.length - 1; tail >= 0; tail--) {
    const char = text[tail];
    if (char !== ']' && char !== '}') continue;

    const start = matchingOpen(text, tail);
    if (start === -1) continue;

    try {
      return { value: JSON.parse(text.slice(start, tail + 1)), start };
    } catch {
      // A trailing byte can look like a closing bracket; keep scanning backwards.
    }
  }

  return null;
}

/** Extracts the embedded JSON payload and readable strings from a binary frame. */
function parseFrame(buffer: ArrayBuffer) {
  const text = utf8Decoder.decode(new Uint8Array(buffer));
  const json = extractJsonPayload(text);

  // Extract readable ASCII metadata tags from the header (e.g. "mempool", "chipnet", "LIVE_SUBSCRIPTION")
  const headerText = json ? text.slice(0, json.start) : text;
  const metaTags = headerText.match(/[a-zA-Z0-9_-]{3,}/g) || [];

  return { metaTags, payload: json?.value ?? null };
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
    const parsed = parseFrame(event.data)
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

