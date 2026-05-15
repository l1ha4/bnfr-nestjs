import { Injectable, Logger } from '@nestjs/common'
import { Client, Events } from 'discord.js'

import { DsBotSyncService } from '../../sync/ds-bot.sync.service'

@Injectable()
export class DsBotGuildEventsService {
  private readonly logger = new Logger(DsBotGuildEventsService.name)

  constructor(
    private readonly sync: DsBotSyncService,
  ) {}

  register(botId: string, client: Client) {
    client.on(Events.GuildCreate, async guild => {
      this.logger.log(`Bot ${botId} joined guild: ${guild.name}`)
      await this.sync.syncBotGuild(botId, guild)
    })

    client.on(Events.GuildUpdate, async (_, newGuild) => {
      this.logger.log(`Guild updated: ${newGuild.name}`)
      await this.sync.syncBotGuild(botId, newGuild)
    })

    client.on(Events.GuildDelete, async guild => {
      this.logger.warn(`Bot ${botId} removed from guild: ${guild.name}`)
      await this.sync.markBotGuildAsInactive(botId, guild)
    })
  }
}