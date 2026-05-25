// manager/voice-activity/ds-bot-voice-activity.manager.ts

import { Injectable } from '@nestjs/common'
import { VoiceState } from 'discord.js'

import { PrismaService } from '@/core/prisma/prisma.service'

@Injectable()
export class DsBotVoiceActivityManager {
  constructor(private readonly prisma: PrismaService) {}

  async handleVoiceStateUpdate(
    botId: string,
    oldState: VoiceState,
    newState: VoiceState,
  ) {
    const oldChannelId = oldState.channelId
    const newChannelId = newState.channelId

    if (oldChannelId === newChannelId) {
      return
    }

    const guild = newState.guild ?? oldState.guild
    const userId = newState.id

    const guildRecord = await this.prisma.dsGuild.findUnique({
      where: {
        guildId: guild.id,
      },
    })

    if (!guildRecord) return

    const connection = await this.prisma.dsBotGuildConnection.findUnique({
      where: {
        botId_guildDbId: {
          botId,
          guildDbId: guildRecord.id,
        },
      },
      include: {
        settings: true,
      },
    })

    if (!connection?.settings?.voiceTrackingEnabled) return

    const user = await this.prisma.dsUser.findUnique({
      where: {
        userId,
      },
    })

    if (!user) return

    if (user.isBot || user.isUserBot) return

    const member = await this.prisma.dsGuildMember.findUnique({
      where: {
        guildDbId_userDbId: {
          guildDbId: guildRecord.id,
          userDbId: user.id,
        },
      },
    })

    if (!member) return

    if (oldChannelId) {
      await this.closeActiveSession(member.id)
    }

    if (newChannelId) {
      await this.startSession(guildRecord.id, member.id, newChannelId)
    }
  }

  private async startSession(
    guildDbId: string,
    memberId: string,
    channelId: string,
  ) {
    await this.closeActiveSession(memberId)

    return this.prisma.dsGuildVoiceSession.create({
      data: {
        guildDbId,
        memberId,
        channelId,
        startedAt: new Date(),
        isActive: true,
      },
    })
  }

  private async closeActiveSession(memberId: string) {
    const session = await this.prisma.dsGuildVoiceSession.findFirst({
      where: {
        memberId,
        isActive: true,
        endedAt: null,
      },
    })

    if (!session) return null

    const endedAt = new Date()
    const durationSeconds = Math.floor(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000,
    )

    return this.prisma.dsGuildVoiceSession.update({
      where: {
        id: session.id,
      },
      data: {
        endedAt,
        durationSeconds,
        isActive: false,
      },
    })
  }
}
