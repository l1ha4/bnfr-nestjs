import { AdminController } from './admin.controller'
import { Module } from '@nestjs/common'
import { DsBotModule } from './ds-bot/ds-bot.module'

@Module({
  imports: [DsBotModule],
  controllers: [AdminController],
  providers: [],
  exports: [],
})
export class AdminModule {}
