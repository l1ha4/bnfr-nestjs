import { AdminController } from './admin.controller'
import { Module } from '@nestjs/common'
import { DsBotModule } from './ds-bot/ds-bot.module'
import { OwnerSeedService } from './owner/owner-seed.service'
import { OwnerControlService } from './owner/owner-control.service'
import { UserModule } from '../user/user.module'
import { AdminService } from './admin.service'
import { AuthAdminModule } from './authAdmin/auth-admin.module'
import { MonopolyAdminModule } from './monopoly/monopoly-admin.module'

@Module({
  imports: [DsBotModule, UserModule, AuthAdminModule, MonopolyAdminModule],
  controllers: [AdminController],
  providers: [OwnerSeedService, OwnerControlService, AdminService],
})
export class AdminModule {}
