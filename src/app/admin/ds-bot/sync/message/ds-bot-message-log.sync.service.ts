import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/core/prisma/prisma.service'
import { DsGuildMessageStatus } from '@prisma/client'

@Injectable()
export class DsBotMessageLogSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async markMessageDeleted(channelId: string, messageId: string) {
    return this.prisma.dsBotMessageLog.updateMany({
      where: {
        discordChannelId: channelId,
        discordMessageId: messageId,
      },
      data: {
        status: DsGuildMessageStatus.MESSAGE_DELETED,
        isDeleted: true,
        isEditable: false,
        deletedAt: new Date(),
      },
    })
  }

  async markMessagesDeleted(channelId: string, messageIds: string[]) {
    if (!messageIds.length) return null

    return this.prisma.dsBotMessageLog.updateMany({
      where: {
        discordChannelId: channelId,
        discordMessageId: {
          in: messageIds,
        },
      },
      data: {
        status: DsGuildMessageStatus.MESSAGE_DELETED,
        isDeleted: true,
        isEditable: false,
        deletedAt: new Date(),
      },
    })
  }

  async markChannelMessagesDeleted(channelId: string) {
    return this.prisma.dsBotMessageLog.updateMany({
      where: {
        discordChannelId: channelId,
        isDeleted: false,
      },
      data: {
        status: DsGuildMessageStatus.CHANNEL_DELETED,
        isDeleted: true,
        isEditable: false,
        deletedAt: new Date(),
      },
    })
  }

  async markGuildMessagesUnavailable(
    guildDbId: string,
    status: DsGuildMessageStatus = DsGuildMessageStatus.GUILD_UNAVAILABLE,
  ) {
    const dispatches = await this.prisma.dsBotMessageDispatch.findMany({
      where: {
        connection: {
          guildDbId,
        },
      },
      select: {
        id: true,
      },
    })

    const dispatchIds = dispatches.map(dispatch => dispatch.id)

    if (!dispatchIds.length) return null

    return this.prisma.dsBotMessageLog.updateMany({
      where: {
        dispatchId: {
          in: dispatchIds,
        },
        isDeleted: false,
      },
      data: {
        status,
        isDeleted: true,
        isEditable: false,
        deletedAt: new Date(),
      },
    })
  }
}