import { Injectable } from '@nestjs/common'
import { Server, Socket } from 'socket.io'

import { MonopolySessionWsEvent } from './monopoly-session.ws.events'
import { getMonopolySessionRoom } from './session.ws.rooms'
import { MonopolyGameSessionPlayer } from '@prisma/client'

@Injectable()
export class SessionWsService {
  public subscribe(client: Socket, sessionId: string) {
    const room = getMonopolySessionRoom(sessionId)

    client.join(room)

    return {
      ok: true,
      room,
    }
  }

  public unsubscribe(client: Socket, sessionId: string) {
    const room = getMonopolySessionRoom(sessionId)

    client.leave(room)

    return {
      ok: true,
      room,
    }
  }

  public sendPlayerJoined(
    server: Server,
    sessionId: string,
    payload: { userId: string },
  ) {
    server
      .to(getMonopolySessionRoom(sessionId))
      .emit(MonopolySessionWsEvent.PLAYER_JOINED, payload)
  }

  public sendPlayerLeft(
    server: Server,
    sessionId: string,
    payload: MonopolyGameSessionPlayer,
  ) {
    server
      .to(getMonopolySessionRoom(sessionId))
      .emit(MonopolySessionWsEvent.PLAYER_LEFT, payload)
  }

  public sendStateUpdated(server: Server, sessionId: string, payload: unknown) {
    server
      .to(getMonopolySessionRoom(sessionId))
      .emit(MonopolySessionWsEvent.STATE_UPDATED, payload)
  }
}
