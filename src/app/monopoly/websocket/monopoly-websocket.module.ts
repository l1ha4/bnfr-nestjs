import { Module } from '@nestjs/common'
import { MonopolyWebsocketGateway } from './monopoly-websocket.gateway'
import { ListSessionsWsService } from './listSessions/monopoly-listSessions.gateway'
import { SessionWsService } from './session/session.ws.service'

@Module({
  providers: [MonopolyWebsocketGateway, ListSessionsWsService, SessionWsService],
  exports: [MonopolyWebsocketGateway],
})
export class MonopolyWebsocketModule {}
