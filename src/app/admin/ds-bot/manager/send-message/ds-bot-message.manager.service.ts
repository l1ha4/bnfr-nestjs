// src\app\admin\ds-bot\manager\send-message\ds-bot-message.manager.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { EmbedBuilder } from 'discord.js'

import { PrismaService } from '@/core/prisma/prisma.service'
import {
  DsBotMessageBlockType,
  DsBotMessageDispatchSourceType,
  DsBotMessageDispatchStatus,
} from '@prisma/client'

import { DsBotManagerService } from '../ds-bot.manager.service'
import {
  SendDsBotMessageDto,
  SendMessageBlockType,
} from '../../api/dto/send-message/send-ds-bot-message.dto'

@Injectable()
export class DsBotMessageManager {
  constructor(
    private readonly prisma: PrismaService,
    private readonly botManager: DsBotManagerService,
  ) {}

  async sendInlineMessage(dto: SendDsBotMessageDto) {
    const connection = dto.connectionId
      ? await this.prisma.dsBotGuildConnection.findUnique({
          where: { id: dto.connectionId },
          include: {
            guild: true,
            settings: true,
          },
        })
      : dto.botId && dto.guildId
        ? await this.prisma.dsBotGuildConnection.findFirst({
            where: {
              botId: dto.botId,
              guild: {
                OR: [{ id: dto.guildId }, { guildId: dto.guildId }],
              },
              isActive: true,
            },
            include: {
              guild: true,
              settings: true,
            },
          })
        : null

    if (!connection) {
      throw new NotFoundException('Bot guild connection not found')
    }

    if (!connection.settings?.messageModuleEnabled) {
      throw new ForbiddenException('Message module is disabled')
    }

    const client = this.botManager.getClient(connection.botId)

    if (!client) {
      throw new NotFoundException('Discord bot client not found')
    }

    const resolvedChannelId = await this.resolveDiscordChannelId(
      dto.channelId,
      connection.guild.id,
    )

    const guild = await client.guilds.fetch(connection.guild.guildId)
    const channel = await guild.channels.fetch(resolvedChannelId)

    if (!channel || !channel.isTextBased()) {
      throw new BadRequestException('Selected channel is not text based')
    }

    const dispatch = await this.prisma.dsBotMessageDispatch.create({
      data: {
        connectionId: connection.id,
        channelId: resolvedChannelId,
        createdById: dto.createdById,
        sourceType: DsBotMessageDispatchSourceType.INLINE,
        status: DsBotMessageDispatchStatus.SUCCESS,
      },
    })

    let successCount = 0
    let errorMessage: string | undefined

    for (const [index, block] of dto.blocks.entries()) {
      try {
        const payload = this.buildPayload(block)

        const message = await channel.send(payload)

        await this.prisma.dsBotMessageLog.create({
          data: {
            dispatchId: dispatch.id,
            discordMessageId: message.id,
            discordChannelId: resolvedChannelId,
            position: index,
            payloadJson: payload,
            isEditable: true,
          },
        })

        successCount++
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Unknown error'
      }
    }

    const status =
      successCount === dto.blocks.length
        ? DsBotMessageDispatchStatus.SUCCESS
        : successCount > 0
          ? DsBotMessageDispatchStatus.PARTIAL
          : DsBotMessageDispatchStatus.FAILED

    return this.prisma.dsBotMessageDispatch.update({
      where: { id: dispatch.id },
      data: {
        status,
        errorMessage,
      },
      include: {
        logs: true,
      },
    })
  }

  private async resolveDiscordChannelId(channelId: string, guildDbId: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        channelId,
      )

    if (!isUuid) {
      return channelId
    }

    const channel = await this.prisma.dsGuildChannel.findUnique({
      where: { id: channelId },
      select: {
        channelId: true,
        guildDbId: true,
      },
    })

    if (!channel || channel.guildDbId !== guildDbId) {
      throw new BadRequestException('Selected channel is invalid')
    }

    return channel.channelId
  }

  private buildPayload(block: SendDsBotMessageDto['blocks'][number]) {
    if (block.type === SendMessageBlockType.TEXT) {
      return {
        content: String(block.content),
      }
    }

    if (block.type === SendMessageBlockType.EMBED) {
      const content = block.content as Record<string, any>

      const embed = new EmbedBuilder()

      if (content.title) embed.setTitle(content.title)
      if (content.description) embed.setDescription(content.description)
      if (content.color) embed.setColor(content.color)
      if (content.url) embed.setURL(content.url)

      if (Array.isArray(content.fields)) {
        embed.addFields(content.fields)
      }

      if (content.footer?.text) {
        embed.setFooter({
          text: content.footer.text,
          iconURL: content.footer.iconURL,
        })
      }

      if (content.image?.url) {
        embed.setImage(content.image.url)
      }

      if (content.thumbnail?.url) {
        embed.setThumbnail(content.thumbnail.url)
      }

      return {
        embeds: [embed],
      }
    }

    throw new BadRequestException('Unknown message block type')
  }
}
