import { Module } from '@nestjs/common'
import { MonopolyAdminController } from './monopoly-admin.controller'
import { MonopolyAdminService } from './monopoly-admin.service'
import { MonopolyTemplateManagerService } from './manager/monopoly-template.manager.service'

@Module({
  controllers: [MonopolyAdminController],
  providers: [MonopolyAdminService, MonopolyTemplateManagerService],
  exports: [MonopolyAdminService],
})
export class MonopolyAdminModule {}
