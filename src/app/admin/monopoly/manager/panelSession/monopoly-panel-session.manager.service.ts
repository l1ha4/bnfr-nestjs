import { PrismaService } from '@/core/prisma/prisma.service'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { Request } from 'express'
import { MonopolyWebsocketGateway } from '@/app/monopoly/websocket/monopoly-websocket.gateway'
import { createSystemChatMessage } from '@/app/monopoly/manager/session/core/chat/create-system-chat-message'
import { UpdateSessionPlayerMonopolyDto } from '../../dto/update-session-player-monopoly.dto'

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

  public async sessionById(id: string): Promise<{
    id: string
    name: string
    status: string
    templateName: string
    players: Array<{
      id: string
      userId: string
      displayName: string
      money: number
      ownedStreetCellTemplateIds: string[]
    }>
    streets: Array<{
      id: string
      name: string
      orderIndex: number
      ownerUserId: string | null
    }>
  }> {
    const session = await this.prisma.monopolyGameSession.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        template: {
          select: {
            name: true,
            cells: {
              where: {
                type: 'STREET',
              },
              select: {
                id: true,
                name: true,
                orderIndex: true,
              },
              orderBy: {
                orderIndex: 'asc',
              },
            },
          },
        },
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
            id: true,
            userId: true,
            money: true,
          },
        },
        properties: {
          where: {
            ownerUserId: {
              not: null,
            },
          },
          select: {
            cellTemplateId: true,
            ownerUserId: true,
          },
        },
      },
    })

    if (!session) {
      throw new NotFoundException('Сессия не найдена')
    }

    const ownedStreetIdsByUserId = new Map<string, string[]>()

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: session.players.map((player) => player.userId),
        },
      },
      select: {
        id: true,
        displayName: true,
      },
    })

    const displayNameByUserId = new Map(
      users.map((user) => [user.id, user.displayName]),
    )

    for (const property of session.properties) {
      if (!property.ownerUserId) {
        continue
      }

      const ownedStreetIds =
        ownedStreetIdsByUserId.get(property.ownerUserId) ?? []
      ownedStreetIds.push(property.cellTemplateId)
      ownedStreetIdsByUserId.set(property.ownerUserId, ownedStreetIds)
    }

    return {
      id: session.id,
      name: session.name ?? `Сессия ${session.id.slice(0, 8)}`,
      status: session.status,
      templateName: session.template.name,
      players: session.players.map((player) => ({
        id: player.id,
        userId: player.userId,
        displayName:
          displayNameByUserId.get(player.userId) ??
          `Игрок ${player.userId.slice(0, 6)}`,
        money: player.money,
        ownedStreetCellTemplateIds:
          ownedStreetIdsByUserId.get(player.userId) ?? [],
      })),
      streets: session.template.cells.map((street) => {
        const owner = session.properties.find(
          (property) => property.cellTemplateId === street.id,
        )

        return {
          id: street.id,
          name: street.name,
          orderIndex: street.orderIndex,
          ownerUserId: owner?.ownerUserId ?? null,
        }
      }),
    }
  }

  public async updateSessionPlayer(
    sessionId: string,
    userId: string,
    dto: UpdateSessionPlayerMonopolyDto,
  ): Promise<{ success: boolean }> {
    const session = await this.prisma.monopolyGameSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        templateId: true,
        players: {
          where: {
            userId,
          },
          select: {
            id: true,
            userId: true,
          },
          take: 1,
        },
      },
    })

    if (!session) {
      throw new NotFoundException('Сессия не найдена')
    }

    const sessionPlayer = session.players[0]

    if (!sessionPlayer) {
      throw new NotFoundException('Игрок не найден в сессии')
    }

    const uniqueStreetIds = Array.from(new Set(dto.ownedStreetCellTemplateIds))

    const templateStreetCells = await this.prisma.monopolyCellTemplate.findMany(
      {
        where: {
          templateId: session.templateId,
          type: 'STREET',
        },
        select: {
          id: true,
          orderIndex: true,
        },
      },
    )

    const streetById = new Map(
      templateStreetCells.map((street) => [street.id, street]),
    )

    const hasUnknownStreet = uniqueStreetIds.some(
      (streetId) => !streetById.has(streetId),
    )

    if (hasUnknownStreet) {
      throw new BadRequestException(
        'Список улиц содержит недопустимые значения',
      )
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.monopolyGameSessionPlayer.update({
        where: {
          sessionId_userId: {
            sessionId,
            userId,
          },
        },
        data: {
          money: dto.money,
        },
      })

      if (uniqueStreetIds.length === 0) {
        await tx.monopolyGameSessionProperty.deleteMany({
          where: {
            sessionId,
            ownerUserId: userId,
          },
        })

        return
      }

      await tx.monopolyGameSessionProperty.deleteMany({
        where: {
          sessionId,
          ownerUserId: userId,
          cellTemplateId: {
            notIn: uniqueStreetIds,
          },
        },
      })

      for (const streetId of uniqueStreetIds) {
        const street = streetById.get(streetId)

        if (!street) {
          continue
        }

        await tx.monopolyGameSessionProperty.upsert({
          where: {
            sessionId_cellTemplateId: {
              sessionId,
              cellTemplateId: street.id,
            },
          },
          update: {
            sessionPlayerId: sessionPlayer.id,
            ownerUserId: userId,
            indexCell: street.orderIndex,
            level: 0,
            isMortgaged: false,
          },
          create: {
            sessionId,
            sessionPlayerId: sessionPlayer.id,
            cellTemplateId: street.id,
            ownerUserId: userId,
            indexCell: street.orderIndex,
            level: 0,
            isMortgaged: false,
          },
        })
      }
    })

    this.monopolyGateway.sendStateUpdated(sessionId, {
      id: sessionId,
      adminPlayerUpdated: true,
      userId,
    })

    return { success: true }
  }
}
