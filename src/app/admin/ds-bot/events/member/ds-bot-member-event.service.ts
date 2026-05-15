import { Injectable, Logger } from '@nestjs/common'
import { Client, Events } from 'discord.js'

import { DsGuildSyncService } from '../../sync/guild/ds-guild.sync.service'
import { DsGuildMemberSyncService } from '../../sync/member/ds-guild-member.sync.service'

@Injectable()
export class DsBotMemberEventsService {
  private readonly logger = new Logger(DsBotMemberEventsService.name)

  constructor(
    private readonly guildSync: DsGuildSyncService,
    private readonly memberSync: DsGuildMemberSyncService,
  ) {}

  register(botId: string, client: Client) {
    client.on(Events.GuildMemberAdd, async member => {
      this.logger.log(`Member joined: ${member.user.username}`)

      const guildRecord = await this.guildSync.upsertGuild(member.guild)

      await this.memberSync.upsertGuildMember(guildRecord.id, member)
    })

    client.on(Events.GuildMemberUpdate, async (_, newMember) => {
      this.logger.log(`Member updated: ${newMember.user.username}`)

      const guildRecord = await this.guildSync.upsertGuild(newMember.guild)

      await this.memberSync.upsertGuildMember(guildRecord.id, newMember)
    })

    client.on(Events.GuildMemberRemove, async member => {
      this.logger.warn(`Member left: ${member.user.username}`)

      const guildRecord = await this.guildSync.upsertGuild(member.guild)

      await this.memberSync.markGuildMemberAsInactive(
        guildRecord.id,
        member.user.id,
      )
    })
  }
}