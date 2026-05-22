import { PrismaService } from '@/core/prisma/prisma.service'
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { DiscordGuildChannelType, DsBot } from '@prisma/client'
import { CreateDsBotDto } from './dto/createBot/createDsBot.dto'
import { DsBotManagerService } from '../manager/ds-bot.manager.service'
import { DsBotTokenCryptoService } from '../manager/crypto/ds-bot-token-crypto.service'
import { DsBotGuildSettingsService } from '../settings/ds-bot-guild-settings.service'
import { DsBotSyncWaitService } from '../sync/wait/ds-bot-sync-wait.service'
import { SendDsBotMessageDto } from './dto/send-message/send-ds-bot-message.dto'
import { DsBotMessageManager } from '../manager/send-message/ds-bot-message.manager.service'

@Injectable()
export class DsBotService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly dsBotManager: DsBotManagerService,
    private readonly tokenCrypto: DsBotTokenCryptoService,
    private readonly dsBotSyncWaitService: DsBotSyncWaitService,
    private readonly messageManager: DsBotMessageManager,
  ) {}

  sendMessage(dto: SendDsBotMessageDto) {
    return this.messageManager.sendInlineMessage(dto)
  }
  async findAllTextChannelsGuild(botId: string, guildId: string) {
    await this.dsBotSyncWaitService.waitUntilBotSyncCompleted(botId)
    await this.dsBotSyncWaitService.waitUntilBotGuildsSyncCompleted(botId)

    const textChannels = await this.prismaService.dsGuildChannel.findMany({
      where: {
        isActive: true,
        type: DiscordGuildChannelType.TEXT,
        guild: {
          OR: [{ id: guildId }, { guildId }],
          connections: {
            some: {
              botId,
              isActive: true,
            },
          },
        },
      },
      orderBy: {
        position: 'asc',
      },
    })

    return textChannels.map((channel) => ({
      id: channel.channelId,
      name: channel.name,
      type: channel.type.toLowerCase(),
    }))
  }

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

  async findAllGuilds(botId: string) {
    await this.dsBotSyncWaitService.waitUntilBotSyncCompleted(botId)
    await this.dsBotSyncWaitService.waitUntilBotGuildsSyncCompleted(botId)

    const guildConnections =
      await this.prismaService.dsBotGuildConnection.findMany({
        where: {
          botId: botId,
          isActive: true,
        },
        select: {
          id: true,
          guild: true,
        },
      })

    return guildConnections
      .filter((connection) => connection.guild)
      .map((connection) => ({
        ...connection.guild,
        connectionId: connection.id,
      }))
  }

  async findAll() {
    await this.dsBotSyncWaitService.waitUntilAllSyncCompleted()

    return await this.prismaService.dsBot.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        isActive: true,
        isEnabled: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async findById(id: string): Promise<DsBot> {
    await this.dsBotSyncWaitService.waitUntilBotSyncCompleted(id)

    const dsBot = await this.prismaService.dsBot.findUnique({
      where: {
        id,
      },
    })

    if (!dsBot) throw new NotFoundException('Такой бот не найден')

    return dsBot
  }

  async add(dto: CreateDsBotDto): Promise<boolean> {
    const { secretTokenBot } = dto
    const encryptedToken = this.tokenCrypto.encrypt(secretTokenBot)

    const dsBot = await this.prismaService.dsBot.findFirst({
      where: {
        secretTokenBot: encryptedToken,
      },
    })

    if (dsBot) throw new ConflictException('Данный бот уже добавлен')

    const newDsBot = await this.prismaService.dsBot.create({
      data: {
        secretTokenBot: encryptedToken,
      },
    })

    if (newDsBot.isEnabled) {
      await this.dsBotManager.startBot(newDsBot.id, newDsBot.secretTokenBot)
    }

    return true
  }

  async getEnabled(id: string): Promise<boolean> {
    const dsBot = await this.prismaService.dsBot.findUnique({
      where: {
        id,
      },
      select: {
        isEnabled: true,
      },
    })

    if (!dsBot) {
      throw new NotFoundException('Такой бот не найден')
    }

    return dsBot.isEnabled
  }

  async setEnabled(id: string, isEnabled: boolean): Promise<boolean> {
    const dsBot = await this.prismaService.dsBot.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        isActive: true,
        isEnabled: true,
        secretTokenBot: true,
      },
    })

    if (!dsBot) {
      throw new NotFoundException('Такой бот не найден')
    }

    if (dsBot.isEnabled === isEnabled) {
      return true
    }

    await this.prismaService.dsBot.update({
      where: {
        id,
      },
      data: {
        isEnabled,
      },
    })

    if (isEnabled && dsBot.isActive) {
      await this.dsBotManager.startBot(dsBot.id, dsBot.secretTokenBot)
    }

    if (!isEnabled) {
      await this.dsBotManager.stopBot(dsBot.id)
    }

    return true
  }

  async delete(id: string): Promise<boolean> {
    const dsBot = await this.findById(id)

    await this.dsBotManager.stopBot(dsBot.id)

    await this.prismaService.dsBot.delete({
      where: {
        id,
      },
    })

    return true
  }
}
