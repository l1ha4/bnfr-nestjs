import { Injectable, Logger } from '@nestjs/common'
import { Client, Events } from 'discord.js'

import { DsGuildSyncService } from '../../sync/guild/ds-guild.sync.service'
import { DsGuildChannelSyncService } from '../../sync/channel/ds-guild-channel.sync.service'

@Injectable()
export class DsBotChannelEventsService {
  private readonly logger = new Logger(DsBotChannelEventsService.name)

  constructor(
    private readonly guildSync: DsGuildSyncService,
    private readonly channelSync: DsGuildChannelSyncService,
  ) {}

  register(botId: string, client: Client) {
    client.on(Events.ChannelCreate, async channel => {
      if (!('guild' in channel)) return

      this.logger.log(`Channel created: ${channel.name}`)

      const guildRecord = await this.guildSync.upsertGuild(channel.guild)

      await this.channelSync.upsertGuildChannel(guildRecord.id, channel)
    })

    client.on(Events.ChannelUpdate, async (_, newChannel) => {
      if (!('guild' in newChannel)) return

      this.logger.log(`Channel updated: ${newChannel.name}`)

      const guildRecord = await this.guildSync.upsertGuild(newChannel.guild)

      await this.channelSync.upsertGuildChannel(guildRecord.id, newChannel)
    })

    client.on(Events.ChannelDelete, async channel => {
      if (!('guild' in channel)) return

      this.logger.warn(`Channel deleted: ${channel.name}`)

      const guildRecord = await this.guildSync.upsertGuild(channel.guild)

      await this.channelSync.markGuildChannelAsInactive(
        guildRecord.id,
        channel.id,
      )
    })
  }
}