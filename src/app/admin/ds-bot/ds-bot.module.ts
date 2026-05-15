import { Module } from '@nestjs/common'
import { DsBotService } from './api/ds-bot.service'
import { DsBotController } from './api/ds-bot.controller'
import { DsBotRunnerService } from './runner/ds-bot.runner.service'
import { dsBotSyncProviders } from './sync/ds-bot.sync.index'
import { dsBotManagerProviders } from './manager/ds-bot.manager.index'
import { dsBotEventProviders } from './events/ds-bot.event.index'
import { DsBotGuildSettingsService } from './settings/ds-bot-guild-settings.service'

@Module({
  controllers: [DsBotController],
  providers: [
    DsBotService,
    DsBotRunnerService,
    DsBotGuildSettingsService,

    ...dsBotEventProviders,
    ...dsBotManagerProviders,
    ...dsBotSyncProviders,
  ],
  exports: [DsBotService],
})
export class DsBotModule {}
