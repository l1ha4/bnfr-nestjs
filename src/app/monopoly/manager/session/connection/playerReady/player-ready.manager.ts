import { Injectable, NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import { PrismaService } from '@/core/prisma/prisma.service'
import { UpdatePlayerReadyDto } from '../../../../api/dto/update-player-ready.dto'
import { MonopolyWebsocketGateway } from '../../../../websocket/monopoly-websocket.gateway'
import { ColorManager } from '../color/color.manager'
import { FigurinesManager } from '../figurines/figurines.manager'
import { createSystemChatMessage } from '../../core/chat/create-system-chat-message'
import { updateSessionStatusWhenAllReady } from '../../core/readySession/update-session-status-on-ready'

@Injectable()
export class PlayerReadyManager {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly monopolyGateway: MonopolyWebsocketGateway,
    private readonly colorManager: ColorManager,
    private readonly figurinesManager: FigurinesManager,
  ) {}

  private async fetchSessionSnapshot(id: string) {
    const session = await this.prisma.monopolyGameSession.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            cells: {
              orderBy: {
                orderIndex: 'asc',
              },
            },
            streetCollections: {
              include: {
                cells: {
                  orderBy: {
                    orderIndex: 'asc',
                  },
                },
              },
            },
          },
        },
        properties: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        players: {
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    })

    if (!session) {
      throw new NotFoundException('Сессия не найдена')
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: session.players.map((player) => player.userId),
        },
      },
      select: {
        id: true,
        displayName: true,
        picture: true,
      },
    })

    const colorIds = session.players
      .map((player) => player.colorId)
      .filter((value): value is string => Boolean(value))

    const figurineIds = session.players
      .map((player) => player.figurineId)
      .filter((value): value is string => Boolean(value))

    const [colors, figurines] = await Promise.all([
      this.colorManager.getColorsByIds(colorIds),
      this.figurinesManager.getFigurinesByIds(figurineIds),
    ])

    const usersMap = new Map(users.map((user) => [user.id, user]))
    const colorsMap = new Map(colors.map((color) => [color.id, color]))
    const figurinesMap = new Map(
      figurines.map((figurine) => [figurine.id, figurine]),
    )

    return {
      ...session,
      property: session.properties,
      minPlayers: session.template.minPlayers,
      players: session.players.map((player) => ({
        ...player,
        displayName: usersMap.get(player.userId)?.displayName ?? 'Игрок',
        picture: usersMap.get(player.userId)?.picture ?? null,
        colorHex: colorsMap.get(player.colorId ?? '')?.hexCode ?? null,
        figurineUrl: figurinesMap.get(player.figurineId ?? '')?.url ?? null,
      })),
    }
  }

  public async findSessionById(id: string) {
    return this.fetchSessionSnapshot(id)
  }

  public async readyPlayer(
    id: string,
    dto: UpdatePlayerReadyDto,
    req: Request,
  ) {
    const userId = req.session.userId

    const currentPlayer = await this.prisma.monopolyGameSessionPlayer.findFirst(
      {
        where: {
          sessionId: id,
          userId,
        },
        select: {
          id: true,
        },
      },
    )

    if (!currentPlayer) {
      throw new NotFoundException('Игрок в сессии не найден')
    }

    await Promise.all([
      this.colorManager.ensureColorExists(dto.colorId),
      this.figurinesManager.ensureFigurineExists(dto.figurineId),
    ])

    await this.prisma.monopolyGameSessionPlayer.update({
      where: { id: currentPlayer.id },
      data: {
        colorId: dto.colorId,
        figurineId: dto.figurineId,
        isReady: true,
      },
    })

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        displayName: true,
      },
    })

    const playerName = user?.displayName ?? 'Игрок'

    await createSystemChatMessage({
      prisma: this.prisma,
      monopolyGateway: this.monopolyGateway,
      sessionId: id,
      userId,
      userName: playerName,
      content: `Игрок ${playerName} готов к сессии`,
    })

    const session = await this.fetchSessionSnapshot(id)

    const { session: actualSession, statusChanged } =
      await updateSessionStatusWhenAllReady({
        sessionId: id,
        session,
        prisma: this.prisma,
        monopolyGateway: this.monopolyGateway,
        fetchSessionSnapshot: this.fetchSessionSnapshot.bind(this),
      })

    if (!statusChanged) {
      this.monopolyGateway.sendStateUpdated(id, actualSession)
    }

    return actualSession
  }
}
