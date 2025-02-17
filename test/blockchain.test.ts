import { http, HttpResponse, ws } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { BlockchainStream } from '../src/blockchain'
import { WebSocketManager } from '../src/websocket'

// Create a WebSocket handler using ws.link()
const blockchain = ws.link('ws://localhost:8545')

const mockServer = setupServer(
  http.get('http://localhost:8648/ws', ({ request }) => {
    if (request.headers.get('upgrade') === 'websocket') {
      return new HttpResponse(null, {
        status: 101,
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'Sec-WebSocket-Accept': 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=',
        },
      })
    }
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
  afterAll(() => mockServer.close())

  it('should subscribe to block hashes', async () => {
    const ws = new WebSocketManager('ws://localhost:8545')
    const blockchain = new BlockchainStream(ws)

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
  })
})
