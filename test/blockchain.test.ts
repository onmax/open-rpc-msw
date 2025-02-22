import { createHash } from 'node:crypto'
import WebSocket from 'isomorphic-ws'
import { http, HttpResponse, ws } from 'msw'
import { setupServer } from 'msw/node'

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { BlockchainStream } from '../src/blockchain'
import { WebSocketManager } from '../src/websocket'

Object.defineProperty(globalThis, 'WebSocket', { value: WebSocket, enumerable: true })
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
// Create a WebSocket handler using ws.link()
const blockchain = ws.link('ws://localhost:8545/ws')

const mockServer = setupServer(
  http.get('http://localhost:8545/ws', ({ request }) => {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket')
      return new HttpResponse(null, { status: 400 })

    const wsKey = request.headers.get('Sec-WebSocket-Key')
    const wsVersion = request.headers.get('Sec-WebSocket-Version')

    if (!wsKey || wsVersion !== '13')
      return new HttpResponse(null, { status: 400 })

    const acceptKey = createHash('sha1').update(wsKey + GUID).digest('base64')
    const headers: Record<string, string> = { 'Upgrade': 'websocket', 'Connection': 'Upgrade', 'Sec-WebSocket-Accept': acceptKey }

    // Only include extensions if they're valid
    const extensions = request.headers.get('Sec-WebSocket-Extensions')
    if (extensions && extensions.includes('permessage-deflate'))
      headers['Sec-WebSocket-Extensions'] = 'permessage-deflate'

    return new HttpResponse(null, { status: 101, headers })
  }),
  // Handle the WebSocket connection and messages
  blockchain.addEventListener('connection', ({ client }) => {
    // Listen for messages from the client
    client.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)

      // When client sends a subscription message
      if (message.method === 'subscribeForHeadBlockHash') {
        // Send back a random hash as response
        client.send(JSON.stringify({
          result: `0x${Math.random().toString(16).slice(2)}000000000000000000000000000000000000000000000000`,
        }))
      }
    })
  }),
)

describe('blockchainStream', () => {
  beforeAll(() => mockServer.listen())
  afterEach(() => mockServer.resetHandlers())
  afterAll(() => mockServer.close())

  it('should subscribe to block hashes', async () => {
    const ws = new WebSocketManager('ws://localhost:8545/ws')
    const blockchain = new BlockchainStream(ws)

    try {
      const { next } = await blockchain.subscribeForBlockHashes()

      // Wait for the first message
      const hash = await new Promise((resolve) => {
        next((data) => {
          if (data.data) {
            resolve(data.data)
          }
        })
      })

      expect(hash).toMatch(/^0x[a-f0-9]{64}$/)
    }
    finally {
      await ws.close()
    }
  }, { timeout: 10000 }) // Increase timeout to 10 seconds
})
