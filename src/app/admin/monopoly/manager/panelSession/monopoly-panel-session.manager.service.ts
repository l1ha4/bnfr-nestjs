import { PrismaService } from '@/core/prisma/prisma.service'
import { Injectable, NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import { MonopolyWebsocketGateway } from '@/app/monopoly/websocket/monopoly-websocket.gateway'
import { createSystemChatMessage } from '@/app/monopoly/manager/session/core/chat/create-system-chat-message'

@Injectable()
export class MonopolyPanelSessionManagerService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly monopolyGateway: MonopolyWebsocketGateway,
  ) {}

  public async allSessions(): Promise<
    {
      id: string
      name: string
      status: string
      templateName: string
      countPlayers: number
    }[]
  > {
    const sessions = await this.prisma.monopolyGameSession.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        playersCount: true,
        template: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return sessions.map((session) => ({
      id: session.id,
      name: session.name ?? `Сессия ${session.id.slice(0, 8)}`,
      status: session.status,
      templateName: session.template.name,
      countPlayers: session.playersCount,
    }))
  }

  public async deleteSession(id: string): Promise<boolean> {
    const deleted = await this.prisma.monopolyGameSession.deleteMany({
      where: { id },
    })

    if (deleted.count === 0) {
      throw new NotFoundException('Сессия не найдена')
    }

    return true
  }

  public async resetSession(
    id: string,
    req: Request,
  ): Promise<{ success: boolean }> {
    const adminUserId = req.session.userId

    const session = await this.prisma.monopolyGameSession.findUnique({
      where: { id },
      select: {
        id: true,
        templateId: true,
        players: {
          orderBy: [
            {
              orderIndex: 'asc',
            },
            {
              joinedAt: 'asc',
            },
          ],
          select: {
            userId: true,
          },
        },
      },
    })

    if (!session) {
      throw new NotFoundException('Сессия не найдена')
    }

    const firstPlayer = session.players[0]

    const template = await this.prisma.monopolyGameTemplate.findUniqueOrThrow({
      where: { id: session.templateId },
      select: { startMoney: true },
    })

    await this.prisma.$transaction(async (tx) => {
      await tx.monopolyGameSessionPlayer.updateMany({
        where: { sessionId: id },
        data: {
          position: 0,
          money: template.startMoney,
          isBankrupt: false,
        },
      })

      await tx.monopolyGameSessionProperty.deleteMany({
        where: { sessionId: id },
      })

      await tx.monopolyGameSession.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          currentMovePlayerId: firstPlayer?.userId ?? null,
          currentTypeMove: firstPlayer ? 'DICE_ROLL_ON_THE_MOVE' : 'NULL',
          currentRound: 1,
          startedAt: new Date(),
          finishedAt: null,
        },
      })
    })

    const adminUser = await this.prisma.user.findUnique({
      where: {
        id: adminUserId,
      },
      select: {
        displayName: true,
      },
    })

    const adminName = adminUser?.displayName ?? 'Администратор'

    this.monopolyGateway.sendStateUpdated(id, {
      id,
      reset: true,
    })

    await createSystemChatMessage({
      prisma: this.prisma,
      monopolyGateway: this.monopolyGateway,
      sessionId: id,
      userId: null,
      userName: adminName,
      content: `Сессия была сброшена администратором ${adminName}`,
    })

    return { success: true }
  }
}
