import { Module } from '@nestjs/common'
import { MonopolyService } from './api/monopoly.service'
import { MonopolyController } from './api/monopoly.controller'
import { MonopolyWebsocketGateway } from './websocket/monopoly-websocket.gateway'
import { ListSessionsWsService } from './websocket/listSessions/monopoly-listSessions.gateway'
import { SessionWsService } from './websocket/session/session.ws.service'
import { ListSessionManager } from './manager/listSession/list-session.manager'
import { SessionManager } from './manager/session/session.manager'
import { TemplateManager } from './manager/template/template.manager'
import { ColorManager } from './manager/session/connection/color/color.manager'
import { FigurinesManager } from './manager/session/connection/figurines/figurines.manager'
import { ConnectionPlayerManager } from './manager/session/connection/connectionPlayer/connection-player.manager'
import { PlayerReadyManager } from './manager/session/connection/playerReady/player-ready.manager'
import { CreateSessionManager } from './manager/session/createSession/create-session.manager'

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
    ColorManager,
    FigurinesManager,
    ConnectionPlayerManager,
    PlayerReadyManager,
    CreateSessionManager,
  ],
})
export class MonopolyModule {}
