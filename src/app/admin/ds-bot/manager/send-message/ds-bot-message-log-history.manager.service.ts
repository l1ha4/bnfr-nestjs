import { PrismaService } from '@/core/prisma/prisma.service'
import { Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class DsBotMessageLogHistoryManager {
  constructor(private readonly prismaService: PrismaService) {}

  async getByConnectionId(connectionId: string) {
    const connection = await this.prismaService.dsBotGuildConnection.findUnique(
      {
        where: {
          id: connectionId,
        },
        select: {
          id: true,
        },
      },
    )

    if (!connection) {
      throw new NotFoundException('Такое подключение бота не найдено')
    }

    return this.prismaService.dsBotMessageLog.findMany({
      where: {
        dispatch: {
          connectionId,
        },
      },
      orderBy: [
        {
          dispatch: {
            createdAt: 'desc',
          },
        },
        {
          position: 'asc',
        },
      ],
      select: {
        id: true,
        dispatchId: true,
        discordMessageId: true,
        discordChannelId: true,
        position: true,
        payloadJson: true,
        status: true,
        isEditable: true,
        isDeleted: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        dispatch: {
          select: {
            id: true,
            connectionId: true,
            channelId: true,
            sourceType: true,
            status: true,
            errorMessage: true,
            createdAt: true,
          },
        },
      },
    })
  }
}
