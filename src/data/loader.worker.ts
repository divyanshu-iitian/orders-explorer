import { normalizeOrders } from './normalize'
import type { LoaderRequest, LoaderResponse } from './loaderProtocol'

// Download, parse and clean run here so the 17 MB JSON.parse never blocks
// the page. Only the cleaned array crosses back to the main thread.

const post = (message: LoaderResponse) => self.postMessage(message)

self.onmessage = async (event: MessageEvent<LoaderRequest>) => {
  try {
    const response = await fetch(event.data.url)
    if (!response.ok) throw new Error(`The server answered HTTP ${response.status}.`)

    const text = await readText(response)
    post({ type: 'parsing' })

    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      throw new Error('orders.json is not valid JSON.')
    }
    if (!Array.isArray(raw)) throw new Error('orders.json does not contain a list of orders.')

    post({ type: 'done', ...normalizeOrders(raw) })
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}

async function readText(response: Response): Promise<string> {
  // content-length is the compressed size when the server gzips, so it can only
  // drive a progress bar when it is at least as large as what we receive.
  const total = Number(response.headers.get('content-length')) || null
  if (!response.body) return response.text()

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  let lastPost = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    const now = performance.now()
    if (now - lastPost > 50) {
      lastPost = now
      post({ type: 'progress', loaded, total: total !== null && loaded <= total ? total : null })
    }
  }

  const bytes = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(bytes)
}
