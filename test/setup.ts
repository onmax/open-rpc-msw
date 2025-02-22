import WebSocket from 'isomorphic-ws'

Object.defineProperty(globalThis, 'WebSocket', { value: WebSocket, enumerable: true })
