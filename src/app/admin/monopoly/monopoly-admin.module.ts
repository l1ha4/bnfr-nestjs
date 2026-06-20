import { Module } from '@nestjs/common'
import { MonopolyAdminService } from './monopoly-admin.service'
import { MonopolyTemplateManagerService } from './manager/template/monopoly-template.manage'
import { MonopolyWebsocketModule } from '@/app/monopoly/websocket/monopoly-websocket.module'
import { MonopolyPanelSessionManagerService } from './manager/panelSession/monopoly-panel-session.manager.service'
import { MonopolyColorsManagerService } from './manager/colors/monopoly-colors.manager.service'
import { MonopolyFigurinesManagerService } from './manager/figurines/monopoly-figurines.manager.service'
import { MonopolyTemplateCrudManagerService } from './manager/template/monopoly-template.manager.service'
import { MonopolyAdminPanelSessionController } from './api/panelSession/monopoly-admin-panel-session.controller'
import { MonopolyAdminColorsController } from './api/colors/monopoly-admin-colors.controller'
import { MonopolyAdminFigurinesController } from './api/figurines/monopoly-admin-figurines.controller'
import { MonopolyAdminTemplateController } from './api/template/monopoly-admin-template.controller'

@Module({
  imports: [MonopolyWebsocketModule],
  controllers: [
    MonopolyAdminPanelSessionController,
    MonopolyAdminColorsController,
    MonopolyAdminFigurinesController,
    MonopolyAdminTemplateController,
  ],
  providers: [
    MonopolyAdminService,
    MonopolyTemplateManagerService,
    MonopolyPanelSessionManagerService,
    MonopolyColorsManagerService,
    MonopolyFigurinesManagerService,
    MonopolyTemplateCrudManagerService,
  ],
  exports: [MonopolyAdminService],
})
export class MonopolyAdminModule {}
