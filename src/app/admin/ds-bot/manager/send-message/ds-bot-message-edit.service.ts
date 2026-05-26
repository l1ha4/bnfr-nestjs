import { PrismaService } from '@/core/prisma/prisma.service'
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { EditDsBotMessageLogDto } from '../../api/dto/message/edit-ds-bot-message-log.dto'
import { DsBotManagerService } from '../ds-bot.manager.service'
import { DsGuildMessageStatus } from '@prisma/client'
import { DsBotMessageManager } from './ds-bot-message.manager.service'

@Injectable()
export class DsBotMessageEditManager {
  constructor(
    private readonly prisma: PrismaService,
    private readonly botManager: DsBotManagerService,
    private readonly messageManager: DsBotMessageManager,
  ) {}

  async editSentMessageLog(messageLogId: string, dto: EditDsBotMessageLogDto) {
    const log = await this.prisma.dsBotMessageLog.findUnique({
      where: {
        id: messageLogId,
      },
      include: {
        dispatch: {
          include: {
            connection: {
              include: {
                guild: true,
              },
            },
          },
        },
      },
    })

    if (!log) {
      throw new NotFoundException('Message log not found')
    }

    if (log.isDeleted || !log.isEditable) {
      throw new ForbiddenException('Message is not editable')
    }

    if (log.status !== DsGuildMessageStatus.ACTIVE) {
      throw new ForbiddenException('Message is not active')
    }

    const client = this.botManager.getClient(log.dispatch.connection.botId)

    if (!client) {
      throw new NotFoundException('Discord bot client not found')
    }

    const guild = await client.guilds.fetch(
      log.dispatch.connection.guild.guildId,
    )

    const channel = await guild.channels.fetch(log.discordChannelId)

    if (!channel || !channel.isTextBased()) {
      await this.prisma.dsBotMessageLog.update({
        where: {
          id: log.id,
        },
        data: {
          isEditable: false,
          status: DsGuildMessageStatus.CHANNEL_DELETED,
        },
      })

      throw new NotFoundException('Text based channel not found')
    }

    const message = await channel.messages.fetch(log.discordMessageId)

    const payload = this.messageManager.buildPayload(dto)

    await message.edit(payload.messageOptions)

    return this.prisma.dsBotMessageLog.update({
      where: {
        id: log.id,
      },
      data: {
        payloadJson: payload.payloadJson,
        editedAt: new Date(),
      },
    })
  }
}
