import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import type { MonopolyGameSessionPlayer } from '@prisma/client'
import { Server, Socket } from 'socket.io'
import { ListSessionsWsService } from './listSessions/monopoly-listSessions.gateway'
import { SessionWsService } from './session/session.ws.service'

@WebSocketGateway({
  namespace: '/monopoly-websocket',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class MonopolyWebsocketGateway {
  @WebSocketServer()
  private server!: Server

  constructor(
    private readonly listSessionsWsService: ListSessionsWsService,
    private readonly sessionWsService: SessionWsService,
  ) {}

  @SubscribeMessage('sessions:list:subscribe')
  public subscribeList(@ConnectedSocket() client: Socket) {
    return this.listSessionsWsService.subscribe(client)
  }

  @SubscribeMessage('sessions:list:unsubscribe')
  public unsubscribeList(@ConnectedSocket() client: Socket) {
    return this.listSessionsWsService.unsubscribe(client)
  }

  public sendSessionCreated(session: unknown) {
    this.listSessionsWsService.sendSessionCreated(this.server, session)
  }

  public sendSessionUpdated(session: unknown) {
    this.listSessionsWsService.sendSessionUpdated(this.server, session)
  }

  public sendSessionDeleted(sessionId: string) {
    this.listSessionsWsService.sendSessionDeleted(this.server, sessionId)
  }

  @SubscribeMessage('session:subscribe')
  public handleSubscribeSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string },
  ) {
    return this.sessionWsService.subscribe(client, body.sessionId)
  }

  @SubscribeMessage('session:unsubscribe')
  public handleUnsubscribeSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string },
  ) {
    return this.sessionWsService.unsubscribe(client, body.sessionId)
  }

  public sendPlayerJoined(
    sessionId: string,
    payload: MonopolyGameSessionPlayer,
  ) {
    this.sessionWsService.sendPlayerJoined(this.server, sessionId, payload)
  }
}
