import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/core/prisma/prisma.service'

import { DsBotSyncWaitService } from '../../sync/wait/ds-bot-sync-wait.service'

@Injectable()
export class DsBotGuildManagerService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly dsBotSyncWaitService: DsBotSyncWaitService,
  ) {}

  async findAllGuildMembers(botId: string, guildId: string) {
    await this.dsBotSyncWaitService.waitUntilBotSyncCompleted(botId)
    await this.dsBotSyncWaitService.waitUntilBotGuildsSyncCompleted(botId)

    const lastMonthSince = new Date()
    lastMonthSince.setMonth(lastMonthSince.getMonth() - 1)

    const guild = await this.prismaService.dsGuild.findFirst({
      where: {
        OR: [{ id: guildId }, { guildId }],
        connections: {
          some: {
            botId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
      },
    })

    if (!guild) {
      return []
    }

    const [members, voiceDurationGroups, recentVoiceSessions] =
      await Promise.all([
        this.prismaService.dsGuildMember.findMany({
          where: {
            guildDbId: guild.id,
            isActive: true,
            user: {
              isBot: false,
              isUserBot: false,
            },
          },
          select: {
            id: true,
            joinedAt: true,
            user: {
              select: {
                userId: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        }),
        this.prismaService.dsGuildVoiceSession.groupBy({
          by: ['memberId'],
          where: {
            guildDbId: guild.id,
          },
          _sum: {
            durationSeconds: true,
          },
        }),
        this.prismaService.dsGuildVoiceSession.findMany({
          where: {
            guildDbId: guild.id,
            OR: [
              {
                endedAt: null,
              },
              {
                endedAt: {
                  gte: lastMonthSince,
                },
              },
            ],
          },
          select: {
            memberId: true,
            startedAt: true,
            endedAt: true,
          },
        }),
      ])

    const now = Date.now()
    const lastMonthBoundary = lastMonthSince.getTime()
    const voiceDurationByMemberId = new Map(
      voiceDurationGroups.map((item) => [
        item.memberId,
        item._sum.durationSeconds ?? 0,
      ]),
    )
    const activeDurationByMemberId = new Map<string, number>()
    const lastMonthDurationByMemberId = new Map<string, number>()

    for (const session of recentVoiceSessions) {
      const startedAt = session.startedAt.getTime()
      const endedAt = session.endedAt?.getTime() ?? now

      if (!session.endedAt) {
        const activeDurationSeconds = Math.max(
          0,
          Math.floor((now - startedAt) / 1000),
        )

        activeDurationByMemberId.set(
          session.memberId,
          (activeDurationByMemberId.get(session.memberId) ?? 0) +
            activeDurationSeconds,
        )
      }

      const overlapStart = Math.max(startedAt, lastMonthBoundary)
      const overlapEnd = Math.min(endedAt, now)

      if (overlapEnd <= overlapStart) {
        continue
      }

      const lastMonthDurationSeconds = Math.floor(
        (overlapEnd - overlapStart) / 1000,
      )

      lastMonthDurationByMemberId.set(
        session.memberId,
        (lastMonthDurationByMemberId.get(session.memberId) ?? 0) +
          lastMonthDurationSeconds,
      )
    }

    return members
      .map((member) => {
        const totalVoiceSeconds =
          (voiceDurationByMemberId.get(member.id) ?? 0) +
          (activeDurationByMemberId.get(member.id) ?? 0)
        const lastMonthVoiceSeconds =
          lastMonthDurationByMemberId.get(member.id) ?? 0

        return {
          id: member.user.userId,
          username: member.user.username,
          avatarUrl: member.user.avatarUrl,
          joinedAt: member.joinedAt,
          totalVoiceSeconds,
          lastMonthVoiceSeconds,
        }
      })
      .sort(
        (first, second) =>
          second.totalVoiceSeconds - first.totalVoiceSeconds ||
          first.username.localeCompare(second.username, 'ru', {
            sensitivity: 'base',
          }),
      )
  }

  findByGuildId(guildId: string) {
    return this.prismaService.dsGuild.findUnique({
      where: {
        guildId,
      },
    })
  }
}
