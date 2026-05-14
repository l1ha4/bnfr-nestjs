import { Module } from '@nestjs/common'
import { DsBotService } from './api/ds-bot.service'
import { DsBotController } from './api/ds-bot.controller'
import { DsBotRunnerService } from './runner/ds-bot.runner.service';
import { DsBotManagerService } from './manager/ds-bot.manager.service';

@Module({
  controllers: [DsBotController],
  providers: [DsBotService, DsBotRunnerService, DsBotManagerService],
  exports: [DsBotService],
})
export class DsBotModule {}
