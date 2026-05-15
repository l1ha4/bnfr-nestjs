import { Injectable, Logger } from '@nestjs/common'
import { Client, Events } from 'discord.js'

import { DsGuildSyncService } from '../../sync/guild/ds-guild.sync.service'
import { DsGuildRoleSyncService } from '../../sync/role/ds-guild-role.sync.service'

@Injectable()
export class DsBotRoleEventsService {
  private readonly logger = new Logger(DsBotRoleEventsService.name)

  constructor(
    private readonly guildSync: DsGuildSyncService,
    private readonly roleSync: DsGuildRoleSyncService,
  ) {}

  register(botId: string, client: Client) {
    client.on(Events.GuildRoleCreate, async role => {
      this.logger.log(`Role created: ${role.name}`)

      const guildRecord = await this.guildSync.upsertGuild(role.guild)

      await this.roleSync.upsertGuildRole(guildRecord.id, role)
    })

    client.on(Events.GuildRoleUpdate, async (_, newRole) => {
      this.logger.log(`Role updated: ${newRole.name}`)

      const guildRecord = await this.guildSync.upsertGuild(newRole.guild)

      await this.roleSync.upsertGuildRole(guildRecord.id, newRole)
    })

    client.on(Events.GuildRoleDelete, async role => {
      this.logger.warn(`Role deleted: ${role.name}`)

      const guildRecord = await this.guildSync.upsertGuild(role.guild)

      await this.roleSync.markGuildRoleAsInactive(guildRecord.id, role.id)
    })
  }
}