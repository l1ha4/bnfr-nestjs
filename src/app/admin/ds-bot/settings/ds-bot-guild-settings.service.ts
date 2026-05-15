import { Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/core/prisma/prisma.service'
import { UpdateDsBotGuildSettingsDto } from '../api/dto/createDsBotGuildSettings.dto'

@Injectable()
export class DsBotGuildSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDefaultSettingsForConnection(connectionId: string) {
    return this.prisma.dsBotGuildSettings.create({
      data: {
        connectionId,
      },
    })
  }

  async getByConnectionId(connectionId: string) {
    const connection = await this.prisma.dsBotGuildConnection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      throw new NotFoundException('Bot guild connection not found')
    }

    return this.prisma.dsBotGuildSettings.upsert({
      where: { connectionId },
      update: {},
      create: { connectionId },
    })
  }

  async updateByConnectionId(
    connectionId: string,
    dto: UpdateDsBotGuildSettingsDto,
  ) {
    const connection = await this.prisma.dsBotGuildConnection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      throw new NotFoundException('Bot guild connection not found')
    }

    return this.prisma.dsBotGuildSettings.upsert({
      where: { connectionId },
      update: dto,
      create: {
        connectionId,
        ...dto,
      },
    })
  }
}
