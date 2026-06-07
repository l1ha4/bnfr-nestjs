import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'

import { Server, Socket } from 'socket.io'

@WebSocketGateway({
  namespace: '/monopoly-websocket',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class MonopolySessionsGateway {
  @WebSocketServer()
  private server!: Server

  @SubscribeMessage('sessions:list:subscribe')
  public handleSubscribeList(@ConnectedSocket() client: Socket) {
    client.join('monopoly:sessions:list')

    return {
      ok: true,
    }
  }

  public sendSessionCreated(session: unknown) {
    this.server.to('monopoly:sessions:list').emit('session:created', session)
  }

  public sendSessionDeleted(sessionId: string) {
    this.server.to('monopoly:sessions:list').emit('session:deleted', sessionId)
  }

  @SubscribeMessage('sessions:list:unsubscribe')
  public handleUnsubscribeList(@ConnectedSocket() client: Socket) {
    client.leave('monopoly:sessions:list')

    return {
      ok: true,
    }
  }
}
