import { AdminController } from './admin.controller'
import { Module } from '@nestjs/common'
import { DsBotModule } from './ds-bot/ds-bot.module'
import { OwnerSeedService } from './owner-seed.service';

@Module({
  imports: [DsBotModule],
  controllers: [AdminController],
  providers: [OwnerSeedService],
  exports: [],
})
export class AdminModule {}
