/// <reference lib="webworker" />
import { handle, toEngineError } from './engine'
import type { EngineRequest, EngineResponse } from './protocol'

// One PostgreSQL database per worker. Requests run one after another, like on a single connection.
let queue: Promise<unknown> = Promise.resolve()

self.onmessage = (event: MessageEvent<EngineRequest>) => {
  const request = event.data
  queue = queue.then(async () => {
    let response: EngineResponse
    try {
      response = { id: request.id, ok: true, value: await handle(request) }
    } catch (error) {
      response = { id: request.id, ok: false, error: toEngineError(error) }
    }
    self.postMessage(response)
  })
}
