import { Injectable, Logger } from '@nestjs/common'
import { Client, Guild } from 'discord.js'

import { DsGuildSyncService } from './guild/ds-guild.sync.service'
import { DsBotGuildConnectionSyncService } from './ds-bot/ds-bot-guild-connection.sync.service'
import { DsGuildMemberSyncService } from './member/ds-guild-member.sync.service'
import { DsGuildRoleSyncService } from './role/ds-guild-role.sync.service'
import { DsGuildChannelSyncService } from './channel/ds-guild-channel.sync.service'

@Injectable()
export class DsBotSyncService {
  private readonly logger = new Logger(DsBotSyncService.name)

  constructor(
    private readonly guildSync: DsGuildSyncService,
    private readonly connectionSync: DsBotGuildConnectionSyncService,
    private readonly guildMemberSync: DsGuildMemberSyncService,
    private readonly guildRoleSync: DsGuildRoleSyncService,
    private readonly guildChannelSync: DsGuildChannelSyncService,
  ) {}

  async syncBotGuilds(botId: string, client: Client) {
    for (const guild of client.guilds.cache.values()) {
      await this.syncBotGuild(botId, guild)
    }
  }

  async syncBotGuild(botId: string, guild: Guild) {
    const guildRecord = await this.guildSync.upsertGuild(guild)

    await this.guildSync.setGuildLoadingSync(guildRecord.id, true)

    try {
      await this.connectionSync.upsertConnection(botId, guildRecord.id)

      await this.guildChannelSync.syncGuildChannels(guildRecord.id, guild)

      await this.guildRoleSync.syncGuildRoles(guildRecord.id, guild)

      await this.guildMemberSync.syncGuildMembers(guildRecord.id, guild)
    } finally {
      await this.guildSync.setGuildLoadingSync(guildRecord.id, false)
    }

    return guildRecord
  }

  async markBotGuildAsInactive(botId: string, guild: Guild) {
    const guildRecord = await this.guildSync.upsertGuild(guild)

    return this.connectionSync.markConnectionAsInactive(botId, guildRecord.id)
  }
}
