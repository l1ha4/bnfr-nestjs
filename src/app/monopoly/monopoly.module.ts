import { Module } from '@nestjs/common'
import { MonopolyService } from './api/monopoly.service'
import { ListSessionsController } from './api/controllers/listSessions/list-sessions.controller'
import { CreateSessionController } from './api/controllers/createSession/create-session.controller'
import { SessionController } from './api/controllers/session/session.controller'
import { GameActionsController } from './api/controllers/gameActions/game-actions.controller'
import { MonopolyWebsocketModule } from './websocket/monopoly-websocket.module'
import { ListSessionManager } from './manager/listSession/list-session.manager'
import { SessionManager } from './manager/session/session.manager'
import { TemplateManager } from './manager/template/template.manager'
import { ColorManager } from './manager/session/connection/color/color.manager'
import { FigurinesManager } from './manager/session/connection/figurines/figurines.manager'
import { ConnectionPlayerManager } from './manager/session/connection/connectionPlayer/connection-player.manager'
import { PlayerReadyManager } from './manager/session/connection/playerReady/player-ready.manager'
import { CreateSessionManager } from './manager/session/createSession/create-session.manager'
import { ResetSessionManager } from './manager/session/core/resetSession/reset-session.manager'
import { TypePurchaseSessionMonopolyManager } from './manager/session/core/eventCellSession/typeStreet/typePurchase/type-purchase-session.monopoly.manager'

@Module({
  imports: [MonopolyWebsocketModule],
  controllers: [
    ListSessionsController,
    CreateSessionController,
    SessionController,
    GameActionsController,
  ],
  providers: [
    MonopolyService,
    ListSessionManager,
    SessionManager,
    TemplateManager,
    ColorManager,
    FigurinesManager,
    ConnectionPlayerManager,
    PlayerReadyManager,
    CreateSessionManager,
    ResetSessionManager,
    TypePurchaseSessionMonopolyManager,
  ],
})
export class MonopolyModule {}
