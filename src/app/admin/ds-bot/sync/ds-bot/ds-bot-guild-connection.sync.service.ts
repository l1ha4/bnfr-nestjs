import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/core/prisma/prisma.service'

@Injectable()
export class DsBotGuildConnectionSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertConnection(botId: string, guildDbId: string) {
    const connection = await this.prisma.dsBotGuildConnection.upsert({
      where: {
        botId_guildDbId: {
          botId,
          guildDbId,
        },
      },
      update: {
        isActive: true,
      },
      create: {
        botId,
        guildDbId,
        isActive: true,
      },
    })

    await this.prisma.dsBotGuildSettings.upsert({
      where: {
        connectionId: connection.id,
      },
      update: {},
      create: {
        connectionId: connection.id,
      },
    })

    return connection
  }

  async markConnectionAsInactive(botId: string, guildDbId: string) {
    return this.prisma.dsBotGuildConnection.upsert({
      where: {
        botId_guildDbId: {
          botId,
          guildDbId,
        },
      },
      update: {
        isActive: false,
      },
      create: {
        botId,
        guildDbId,
        isActive: false,
      },
    })
  }
}