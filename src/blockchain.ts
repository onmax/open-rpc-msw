import type { StreamOptions, Subscription, WebSocketManager } from './websocket'

export class BlockchainStream {
  ws: WebSocketManager
  constructor(ws: WebSocketManager) {
    this.ws = ws
  }

  /**
   * Subscribes to block hash events.
   */
  public async subscribeForBlockHashes<T = string>(
    userOptions?: StreamOptions,
  ): Promise<Subscription<T>> {
    return this.ws.getConnection().subscribe({ method: 'subscribeForHeadBlockHash' }, userOptions) as Promise<Subscription<T>>
  }
}
