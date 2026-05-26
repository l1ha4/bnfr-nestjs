import { Injectable, Logger } from '@nestjs/common'
import { ChannelType, Guild, GuildBasedChannel } from 'discord.js'

import { PrismaService } from '@/core/prisma/prisma.service'
import { DsGuildChannelType } from '@prisma/client'

@Injectable()
export class DsGuildChannelSyncService {
  private readonly logger = new Logger(DsGuildChannelSyncService.name)

  constructor(private readonly prisma: PrismaService) {}

  async syncGuildChannels(guildDbId: string, guild: Guild) {
    const channels = await guild.channels.fetch()

    this.logger.log(`Sync ${channels.size} channels from guild: ${guild.name}`)

    for (const channel of channels.values()) {
      if (!channel) continue

      await this.upsertGuildChannel(guildDbId, channel)
    }
  }

  async upsertGuildChannel(guildDbId: string, channel: GuildBasedChannel) {
    const capabilities = this.getChannelCapabilities(channel)

    return this.prisma.dsGuildChannel.upsert({
      where: {
        guildDbId_channelId: {
          guildDbId,
          channelId: channel.id,
        },
      },
      update: {
        name: this.getChannelName(channel),
        type: this.mapChannelType(channel.type),
        position: this.getChannelPosition(channel),
        parentChannelId: this.getParentChannelId(channel),

        isTextBased: capabilities.isTextBased,
        isVoiceBased: capabilities.isVoiceBased,
        isThread: capabilities.isThread,
        isThreadOnly: capabilities.isThreadOnly,
        canSendMessages: capabilities.canSendMessages,

        isActive: true,
      },
      create: {
        guildDbId,
        channelId: channel.id,
        name: this.getChannelName(channel),
        type: this.mapChannelType(channel.type),
        position: this.getChannelPosition(channel),
        parentChannelId: this.getParentChannelId(channel),

        isTextBased: capabilities.isTextBased,
        isVoiceBased: capabilities.isVoiceBased,
        isThread: capabilities.isThread,
        isThreadOnly: capabilities.isThreadOnly,
        canSendMessages: capabilities.canSendMessages,

        isActive: true,
      },
    })
  }

  async markGuildChannelAsInactive(guildDbId: string, channelId: string) {
    return this.prisma.dsGuildChannel.update({
      where: {
        guildDbId_channelId: {
          guildDbId,
          channelId,
        },
      },
      data: {
        isActive: false,
        canSendMessages: false,
      },
    })
  }

  private getChannelCapabilities(channel: GuildBasedChannel) {
    const isTextBased = channel.isTextBased()
    const isVoiceBased = channel.isVoiceBased()
    const isThread = channel.isThread()
    const isThreadOnly = channel.isThreadOnly()

    const canSendMessages = channel.isSendable() && !isThreadOnly

    return {
      isTextBased,
      isVoiceBased,
      isThread,
      isThreadOnly,
      canSendMessages,
    }
  }

  private getChannelName(channel: GuildBasedChannel) {
    return 'name' in channel ? channel.name : null
  }

  private getChannelPosition(channel: GuildBasedChannel) {
    return 'position' in channel ? channel.position : null
  }

  private getParentChannelId(channel: GuildBasedChannel) {
    return 'parentId' in channel ? channel.parentId : null
  }

  private mapChannelType(type: ChannelType): DsGuildChannelType {
    switch (type) {
      case ChannelType.GuildText:
        return DsGuildChannelType.TEXT

      case ChannelType.GuildVoice:
        return DsGuildChannelType.VOICE

      case ChannelType.GuildCategory:
        return DsGuildChannelType.CATEGORY

      case ChannelType.GuildAnnouncement:
        return DsGuildChannelType.ANNOUNCEMENT

      case ChannelType.GuildStageVoice:
        return DsGuildChannelType.STAGE_VOICE

      case ChannelType.GuildForum:
        return DsGuildChannelType.FORUM

      case ChannelType.GuildMedia:
        return DsGuildChannelType.MEDIA

      case ChannelType.PublicThread:
        return DsGuildChannelType.THREAD_PUBLIC

      case ChannelType.PrivateThread:
        return DsGuildChannelType.THREAD_PRIVATE

      case ChannelType.AnnouncementThread:
        return DsGuildChannelType.THREAD_ANNOUNCEMENT

      case ChannelType.GuildDirectory:
        return DsGuildChannelType.DIRECTORY

      default:
        return DsGuildChannelType.UNKNOWN
    }
  }
}
