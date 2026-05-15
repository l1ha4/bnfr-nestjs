import { Injectable, Logger } from '@nestjs/common'
import {
  ChannelType,
  Guild,
  GuildBasedChannel,
} from 'discord.js'

import { PrismaService } from '@/core/prisma/prisma.service'
import { DiscordGuildChannelType } from '@prisma/client';


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

  async upsertGuildChannel(
    guildDbId: string,
    channel: GuildBasedChannel,
  ) {
    return this.prisma.dsGuildChannel.upsert({
      where: {
        guildDbId_channelId: {
          guildDbId,
          channelId: channel.id,
        },
      },
      update: {
        name: 'name' in channel ? channel.name : null,
        type: this.mapChannelType(channel.type),
        position: 'position' in channel ? channel.position : null,
        parentChannelId: 'parentId' in channel ? channel.parentId : null,
        isActive: true,
      },
      create: {
        guildDbId,
        channelId: channel.id,
        name: 'name' in channel ? channel.name : null,
        type: this.mapChannelType(channel.type),
        position: 'position' in channel ? channel.position : null,
        parentChannelId: 'parentId' in channel ? channel.parentId : null,
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
      },
    })
  }

  private mapChannelType(type: ChannelType): DiscordGuildChannelType {
    switch (type) {
      case ChannelType.GuildText:
        return DiscordGuildChannelType.TEXT

      case ChannelType.GuildVoice:
        return DiscordGuildChannelType.VOICE

      case ChannelType.GuildCategory:
        return DiscordGuildChannelType.CATEGORY

      case ChannelType.GuildAnnouncement:
        return DiscordGuildChannelType.ANNOUNCEMENT

      case ChannelType.GuildStageVoice:
        return DiscordGuildChannelType.STAGE_VOICE

      case ChannelType.GuildForum:
        return DiscordGuildChannelType.FORUM

      case ChannelType.GuildMedia:
        return DiscordGuildChannelType.MEDIA

      case ChannelType.PublicThread:
        return DiscordGuildChannelType.THREAD_PUBLIC

      case ChannelType.PrivateThread:
        return DiscordGuildChannelType.THREAD_PRIVATE

      case ChannelType.AnnouncementThread:
        return DiscordGuildChannelType.THREAD_ANNOUNCEMENT

      case ChannelType.GuildDirectory:
        return DiscordGuildChannelType.DIRECTORY

      default:
        return DiscordGuildChannelType.UNKNOWN
    }
  }
}