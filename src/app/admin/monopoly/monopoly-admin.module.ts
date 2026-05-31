import { Module } from '@nestjs/common'
import { MonopolyAdminController } from './monopoly-admin.controller'
import { MonopolyAdminService } from './monopoly-admin.service'

@Module({
  controllers: [MonopolyAdminController],
  providers: [MonopolyAdminService],
  exports: [MonopolyAdminService],
})
export class MonopolyAdminModule {}
