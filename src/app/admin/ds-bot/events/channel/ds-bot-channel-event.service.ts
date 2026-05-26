import { Injectable, Logger } from '@nestjs/common'
import { Client, Events } from 'discord.js'

import { DsGuildSyncService } from '../../sync/guild/ds-guild.sync.service'
import { DsGuildChannelSyncService } from '../../sync/channel/ds-guild-channel.sync.service'
import { DsGuildMessageSyncService } from '../../sync/message/ds-guild-message.sync.service'
import { DsBotMessageLogSyncService } from '../../sync/message/ds-bot-message-log.sync.service'

@Injectable()
export class DsBotChannelEventsService {
  private readonly logger = new Logger(DsBotChannelEventsService.name)

  constructor(
    private readonly guildSync: DsGuildSyncService,
    private readonly channelSync: DsGuildChannelSyncService,
    private readonly guildMessageSync: DsGuildMessageSyncService,
    private readonly botMessageLogSync: DsBotMessageLogSyncService,
  ) {}

  register(botId: string, client: Client) {
    client.on(Events.ChannelCreate, async (channel) => {
      try {
        if (!('guild' in channel)) return

        this.logger.log(`Channel created: ${channel.name}`)

        const guildRecord = await this.guildSync.upsertGuild(channel.guild)

        await this.channelSync.upsertGuildChannel(guildRecord.id, channel)
      } catch (error) {
        this.logger.error(
          `Failed to sync created channel for bot: ${botId}`,
          error,
        )
      }
    })

    client.on(Events.ChannelUpdate, async (_, newChannel) => {
      try {
        if (!('guild' in newChannel)) return

        this.logger.log(`Channel updated: ${newChannel.name}`)

        const guildRecord = await this.guildSync.upsertGuild(newChannel.guild)

        await this.channelSync.upsertGuildChannel(guildRecord.id, newChannel)
      } catch (error) {
        this.logger.error(
          `Failed to sync updated channel for bot: ${botId}`,
          error,
        )
      }
    })

    client.on(Events.ChannelDelete, async (channel) => {
      try {
        if (!('guild' in channel)) return

        this.logger.warn(`Channel deleted: ${channel.name}`)

        const guildRecord = await this.guildSync.upsertGuild(channel.guild)

        await this.channelSync.markGuildChannelAsInactive(
          guildRecord.id,
          channel.id,
        )

        await this.guildMessageSync.markChannelMessagesDeleted(channel.id)

        await this.botMessageLogSync.markChannelMessagesDeleted(channel.id)
      } catch (error) {
        this.logger.error(
          `Failed to mark deleted channel as inactive for bot: ${botId}`,
          error,
        )
      }
    })
  }
}
