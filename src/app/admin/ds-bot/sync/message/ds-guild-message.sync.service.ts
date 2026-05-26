import { Injectable, Logger } from '@nestjs/common'
import type {
  Guild,
  GuildBasedChannel,
  Message,
  PartialMessage,
  ReadonlyCollection,
  Snowflake,
} from 'discord.js'

import { PrismaService } from '@/core/prisma/prisma.service'
import { DsGuildMessageStatus } from '@prisma/client'

@Injectable()
export class DsGuildMessageSyncService {
  private readonly logger = new Logger(DsGuildMessageSyncService.name)

  constructor(private readonly prisma: PrismaService) {}

  async syncGuildMessages(
    guildDbId: string,
    guild: Guild,
    ourBotUserId?: string,
  ) {
    const channels = await guild.channels.fetch()

    for (const channel of channels.values()) {
      if (!channel || !this.canSyncChannelMessages(channel)) {
        continue
      }

      try {
        await this.syncChannelMessages(guildDbId, channel, ourBotUserId)
      } catch (error) {
        this.logger.error(
          `Failed to sync message history for channel: ${guild.id}:${channel.id}`,
          error,
        )
      }
    }
  }

  async upsertMessage(
    guildDbId: string,
    message: Message | PartialMessage,
    ourBotUserId?: string,
  ) {
    if (!message.channelId || !message.id) return null

    const author = message.author

    return this.prisma.dsGuildMessage.upsert({
      where: {
        channelId_messageId: {
          channelId: message.channelId,
          messageId: message.id,
        },
      },
      update: {
        content: message.content ?? null,
        authorUserId: author?.id ?? null,
        isFromBot: author?.bot ?? false,
        isFromOurBot: Boolean(ourBotUserId && author?.id === ourBotUserId),
        status: DsGuildMessageStatus.ACTIVE,
        isDeleted: false,
        deletedAt: null,
        sentAt: message.createdAt ?? null,
        editedAt: message.editedAt ?? null,
      },
      create: {
        guildDbId,
        channelId: message.channelId,
        messageId: message.id,
        content: message.content ?? null,
        authorUserId: author?.id ?? null,
        isFromBot: author?.bot ?? false,
        isFromOurBot: Boolean(ourBotUserId && author?.id === ourBotUserId),
        status: DsGuildMessageStatus.ACTIVE,
        isDeleted: false,
        sentAt: message.createdAt ?? null,
        editedAt: message.editedAt ?? null,
      },
    })
  }

  async markMessageDeleted(channelId: string, messageId: string) {
    return this.prisma.dsGuildMessage.updateMany({
      where: {
        channelId,
        messageId,
      },
      data: {
        status: DsGuildMessageStatus.MESSAGE_DELETED,
        isDeleted: true,
        deletedAt: new Date(),
      },
    })
  }

  async markMessagesDeleted(channelId: string, messageIds: string[]) {
    if (!messageIds.length) return null

    return this.prisma.dsGuildMessage.updateMany({
      where: {
        channelId,
        messageId: {
          in: messageIds,
        },
      },
      data: {
        status: DsGuildMessageStatus.MESSAGE_DELETED,
        isDeleted: true,
        deletedAt: new Date(),
      },
    })
  }

  async markChannelMessagesDeleted(channelId: string) {
    return this.prisma.dsGuildMessage.updateMany({
      where: {
        channelId,
        isDeleted: false,
      },
      data: {
        status: DsGuildMessageStatus.CHANNEL_DELETED,
        isDeleted: true,
        deletedAt: new Date(),
      },
    })
  }

  async markGuildMessagesUnavailable(
    guildDbId: string,
    status: DsGuildMessageStatus = DsGuildMessageStatus.GUILD_UNAVAILABLE,
  ) {
    return this.prisma.dsGuildMessage.updateMany({
      where: {
        guildDbId,
        isDeleted: false,
      },
      data: {
        status,
        isDeleted: true,
        deletedAt: new Date(),
      },
    })
  }

  private async syncChannelMessages(
    guildDbId: string,
    channel: SyncableGuildMessageChannel,
    ourBotUserId?: string,
  ) {
    let before: Snowflake | undefined

    while (true) {
      const messages = await channel.messages.fetch({
        limit: 100,
        ...(before ? { before } : {}),
      })

      if (!messages.size) {
        return
      }

      const existingIds = await this.getExistingMessageIds(channel.id, [
        ...messages.keys(),
      ])

      for (const message of [...messages.values()].reverse()) {
        await this.upsertMessage(guildDbId, message, ourBotUserId)
      }

      if (existingIds.size > 0) {
        return
      }

      before = messages.lastKey()

      if (!before) {
        return
      }
    }
  }

  private async getExistingMessageIds(channelId: string, messageIds: string[]) {
    if (!messageIds.length) {
      return new Set<string>()
    }

    const existingMessages = await this.prisma.dsGuildMessage.findMany({
      where: {
        channelId,
        messageId: {
          in: messageIds,
        },
      },
      select: {
        messageId: true,
      },
    })

    return new Set(existingMessages.map((message) => message.messageId))
  }

  private canSyncChannelMessages(
    channel: GuildBasedChannel,
  ): channel is SyncableGuildMessageChannel {
    return (
      channel.isTextBased() &&
      'messages' in channel &&
      typeof channel.messages?.fetch === 'function'
    )
  }
}

type SyncableGuildMessageChannel = GuildBasedChannel & {
  messages: {
    fetch(options?: {
      limit?: number
      before?: Snowflake
    }): Promise<ReadonlyCollection<Snowflake, Message>>
  }
}
