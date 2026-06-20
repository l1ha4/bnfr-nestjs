import { Module } from '@nestjs/common'
import { MonopolyAdminController } from './monopoly-admin.controller'
import { MonopolyAdminService } from './monopoly-admin.service'
import { MonopolyTemplateManagerService } from './manager/monopoly-template.manager.service'
import { MonopolyWebsocketModule } from '@/app/monopoly/websocket/monopoly-websocket.module'

@Module({
  imports: [MonopolyWebsocketModule],
  controllers: [MonopolyAdminController],
  providers: [MonopolyAdminService, MonopolyTemplateManagerService],
  exports: [MonopolyAdminService],
})
export class MonopolyAdminModule {}
