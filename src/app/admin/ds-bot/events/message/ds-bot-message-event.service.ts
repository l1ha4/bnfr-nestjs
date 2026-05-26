import { Injectable, Logger } from '@nestjs/common'
import {
  Client,
  Events,
  Message,
  PartialMessage,
  ReadonlyCollection,
  Snowflake,
} from 'discord.js'

import { DsGuildSyncService } from '../../sync/guild/ds-guild.sync.service'
import { DsGuildMessageSyncService } from '../../sync/message/ds-guild-message.sync.service'
import { DsBotMessageLogSyncService } from '../../sync/message/ds-bot-message-log.sync.service'

@Injectable()
export class DsBotMessageEventsService {
  private readonly logger = new Logger(DsBotMessageEventsService.name)

  constructor(
    private readonly guildSync: DsGuildSyncService,
    private readonly guildMessageSync: DsGuildMessageSyncService,
    private readonly botMessageLogSync: DsBotMessageLogSyncService,
  ) {}

  register(botId: string, client: Client) {
    client.on(Events.MessageCreate, async (message) => {
      try {
        if (!message.inGuild()) return

        const guildRecord = await this.guildSync.upsertGuild(message.guild)

        await this.guildMessageSync.upsertMessage(
          guildRecord.id,
          message,
          client.user?.id,
        )
      } catch (error) {
        this.logger.error(
          `Failed to sync created message for bot: ${botId}`,
          error,
        )
      }
    })

    client.on(Events.MessageUpdate, async (_, newMessage) => {
      try {
        const message = await this.resolveMessage(newMessage)

        if (!message?.inGuild()) return

        const guildRecord = await this.guildSync.upsertGuild(message.guild)

        await this.guildMessageSync.upsertMessage(
          guildRecord.id,
          message,
          client.user?.id,
        )
      } catch (error) {
        this.logger.error(
          `Failed to sync updated message for bot: ${botId}`,
          error,
        )
      }
    })

    client.on(Events.MessageDelete, async (message) => {
      try {
        await this.guildMessageSync.markMessageDeleted(
          message.channelId,
          message.id,
        )

        await this.botMessageLogSync.markMessageDeleted(
          message.channelId,
          message.id,
        )
      } catch (error) {
        this.logger.error(
          `Failed to mark deleted message for bot: ${botId}`,
          error,
        )
      }
    })

    client.on(Events.MessageBulkDelete, async (messages) => {
      try {
        const grouped = this.groupMessagesByChannel(messages)

        for (const [channelId, messageIds] of grouped.entries()) {
          await this.guildMessageSync.markMessagesDeleted(channelId, messageIds)

          await this.botMessageLogSync.markMessagesDeleted(
            channelId,
            messageIds,
          )
        }
      } catch (error) {
        this.logger.error(
          `Failed to mark bulk deleted messages for bot: ${botId}`,
          error,
        )
      }
    })
  }

  private async resolveMessage(message: Message | PartialMessage) {
    if (!message.partial) return message

    try {
      return await message.fetch()
    } catch {
      return null
    }
  }

  private groupMessagesByChannel(
    messages: ReadonlyCollection<Snowflake, Message | PartialMessage>,
  ) {
    const grouped = new Map<string, string[]>()

    for (const message of messages.values()) {
      const current = grouped.get(message.channelId) ?? []

      current.push(message.id)

      grouped.set(message.channelId, current)
    }

    return grouped
  }
}
