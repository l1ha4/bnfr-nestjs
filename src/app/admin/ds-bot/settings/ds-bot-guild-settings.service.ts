import { Injectable, NotFoundException } from '@nestjs/common'
import type { DsBotGuildSettings } from '@prisma/client'

import { PrismaService } from '@/core/prisma/prisma.service'
import { UpdateDsBotGuildSettingsDto } from '../api/dto/patchSettings/createDsBotGuildSettings.dto'

type DsBotGuildSettingsResponse = Omit<
  DsBotGuildSettings,
  'voiceTrackingEnabled'
> & {
  voiceActivityTrackingEnabled: boolean
}

@Injectable()
export class DsBotGuildSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDtoToPrisma(dto: UpdateDsBotGuildSettingsDto) {
    const { voiceActivityTrackingEnabled, ...restDto } = dto

    return {
      ...restDto,
      ...(voiceActivityTrackingEnabled !== undefined
        ? { voiceTrackingEnabled: voiceActivityTrackingEnabled }
        : {}),
    }
  }

  private mapSettingsResponse(
    settings: DsBotGuildSettings,
  ): DsBotGuildSettingsResponse {
    const { voiceTrackingEnabled, ...restSettings } = settings

    return {
      ...restSettings,
      voiceActivityTrackingEnabled: voiceTrackingEnabled,
    }
  }

  async createDefaultSettingsForConnection(connectionId: string) {
    const settings = await this.prisma.dsBotGuildSettings.create({
      data: {
        connectionId,
      },
    })

    return this.mapSettingsResponse(settings)
  }

  async getByConnectionId(connectionId: string) {
    const connection = await this.prisma.dsBotGuildConnection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      throw new NotFoundException('Bot guild connection not found')
    }

    const settings = await this.prisma.dsBotGuildSettings.upsert({
      where: { connectionId },
      update: {},
      create: { connectionId },
    })

    return this.mapSettingsResponse(settings)
  }

  async updateByConnectionId(
    connectionId: string,
    dto: UpdateDsBotGuildSettingsDto,
  ) {
    const prismaDto = this.mapDtoToPrisma(dto)

    const connection = await this.prisma.dsBotGuildConnection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      throw new NotFoundException('Bot guild connection not found')
    }

    const settings = await this.prisma.dsBotGuildSettings.upsert({
      where: { connectionId },
      update: prismaDto,
      create: {
        connectionId,
        ...prismaDto,
      },
    })

    return this.mapSettingsResponse(settings)
  }
}
