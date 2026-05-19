import { AdminController } from './admin.controller'
import { Module } from '@nestjs/common'
import { DsBotModule } from './ds-bot/ds-bot.module'
import { OwnerSeedService } from './owner-seed.service'
import { UserModule } from '../user/user.module'

@Module({
  imports: [DsBotModule, UserModule],
  controllers: [AdminController],
  providers: [OwnerSeedService],
  exports: [],
})
export class AdminModule {}
