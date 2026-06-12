import { Module } from '@nestjs/common'
import { MonopolyService } from './api/monopoly.service'
import { MonopolyController } from './api/monopoly.controller'
import { MonopolyWebsocketGateway } from './websocket/monopoly-websocket.gateway'
import { ListSessionsWsService } from './websocket/listSessions/monopoly-listSessions.gateway'
import { SessionWsService } from './websocket/session/session.ws.service'
import { ListSessionManager } from './manager/listSession/list-session.manager'
import { SessionManager } from './manager/session/session.manager'
import { TemplateManager } from './manager/template/template.manager'

@Module({
  controllers: [MonopolyController],
  providers: [
    MonopolyService,
    MonopolyWebsocketGateway,
    ListSessionsWsService,
    SessionWsService,
    ListSessionManager,
    SessionManager,
    TemplateManager,
  ],
})
export class MonopolyModule {}
