import { Injectable } from '@nestjs/common'
import { Guild } from 'discord.js'

import { PrismaService } from '@/core/prisma/prisma.service'

@Injectable()
export class DsGuildSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertGuild(guild: Guild) {
    return this.prisma.dsGuild.upsert({
      where: {
        guildId: guild.id,
      },
      update: {
        name: guild.name,
        iconUrl: guild.iconURL(),
        ownerId: guild.ownerId,
        memberCount: guild.memberCount,
      },
      create: {
        guildId: guild.id,
        name: guild.name,
        iconUrl: guild.iconURL(),
        ownerId: guild.ownerId,
        memberCount: guild.memberCount,
      },
    })
  }
}