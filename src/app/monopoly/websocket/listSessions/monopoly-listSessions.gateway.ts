import { Server, Socket } from 'socket.io'

export const MONOPOLY_SESSIONS_LIST_ROOM = 'monopoly:sessions:list'

export class ListSessionsWsService {
  public subscribe(client: Socket) {
    client.join(MONOPOLY_SESSIONS_LIST_ROOM)

    return {
      ok: true,
      room: MONOPOLY_SESSIONS_LIST_ROOM,
    }
  }

  public unsubscribe(client: Socket) {
    client.leave(MONOPOLY_SESSIONS_LIST_ROOM)

    return {
      ok: true,
    }
  }

  public sendSessionCreated(server: Server, session: unknown) {
    server.to(MONOPOLY_SESSIONS_LIST_ROOM).emit('session:add', session)
  }

  public sendSessionUpdated(server: Server, session: unknown) {
    server.to(MONOPOLY_SESSIONS_LIST_ROOM).emit('session:update', session)
  }

  public sendSessionDeleted(server: Server, sessionId: string) {
    server
      .to(MONOPOLY_SESSIONS_LIST_ROOM)
      .emit('session:remove', { id: sessionId })
  }
}
