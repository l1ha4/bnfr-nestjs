import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  MonopolyCellType,
  MonopolyMoveType,
  MonopolyStreetRentGrowthMode,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../websocket/monopoly-websocket.gateway'
import { createSystemChatMessage } from '../chat/create-system-chat-message'

type UpgradeJson = {
  buyPrice?: number | null
  sellPrice?: number | null
}

const isNumberArray = (value: Prisma.JsonValue): value is Array<number | null> =>
  Array.isArray(value) && value.every((item) => item === null || typeof item === 'number')

const isUpgradeArray = (value: Prisma.JsonValue): value is UpgradeJson[] =>
  Array.isArray(value) &&
  value.every((item) => item !== null && typeof item === 'object')

@Injectable()
export class StreetUpgradeSessionMonopolyManager {
  public async sellStreet<
    TSession extends { id: string; currentMovePlayerId: string | null },
  >({
    sessionId,
    session,
    cellId,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: {
    sessionId: string
    session: TSession
    cellId: string
    prisma: PrismaService
    monopolyGateway: MonopolyWebsocketGateway
    fetchSessionSnapshot: (id: string) => Promise<TSession>
  }): Promise<TSession> {
    if (!session.currentMovePlayerId) {
      throw new BadRequestException('Текущий игрок не определен')
    }

    const [player, property, cellTemplate] = await Promise.all([
      prisma.monopolyGameSessionPlayer.findUnique({
        where: {
          sessionId_userId: {
            sessionId,
            userId: session.currentMovePlayerId,
          },
        },
        select: {
          id: true,
          userId: true,
          money: true,
        },
      }),
      prisma.monopolyGameSessionProperty.findFirst({
        where: {
          sessionId,
          cellTemplateId: cellId,
        },
        select: {
          id: true,
          ownerUserId: true,
          level: true,
          isMortgaged: true,
        },
      }),
      prisma.monopolyCellTemplate.findUnique({
        where: {
          id: cellId,
        },
        select: {
          id: true,
          name: true,
          type: true,
          price: true,
          streetEconomy: {
            select: {
              salePriceWithoutUpgrades: true,
              salePriceByUpgradeCount: true,
            },
          },
        },
      }),
    ])

    if (!player) {
      throw new NotFoundException('Игрок в сессии не найден')
    }

    if (!cellTemplate || cellTemplate.type !== MonopolyCellType.STREET) {
      throw new BadRequestException('Продажа доступна только для улицы')
    }

    if (!property || property.ownerUserId !== player.userId) {
      throw new ConflictException('Вы не владеете этой улицей')
    }

    if (property.isMortgaged) {
      throw new ConflictException('Нельзя продать заложенную улицу')
    }

    const currentLevel = Math.max(0, property.level)
    const salePriceByUpgradeCount =
      cellTemplate.streetEconomy?.salePriceByUpgradeCount
    const salePriceWithoutUpgrades =
      cellTemplate.streetEconomy?.salePriceWithoutUpgrades

    const salePriceFromLevels =
      currentLevel > 0 &&
      salePriceByUpgradeCount &&
      isNumberArray(salePriceByUpgradeCount)
        ? Number(salePriceByUpgradeCount[currentLevel - 1] ?? 0)
        : null

    const salePrice = Number(
      salePriceFromLevels ??
        salePriceWithoutUpgrades ??
        (Number(cellTemplate.price ?? 0) > 0
          ? Math.floor(Number(cellTemplate.price ?? 0) / 2)
          : 0),
    )

    if (!Number.isFinite(salePrice) || salePrice < 0) {
      throw new BadRequestException('Некорректная цена продажи улицы')
    }

    await prisma.$transaction(async (tx) => {
      await tx.monopolyGameSessionProperty.delete({
        where: {
          id: property.id,
        },
      })

      await tx.monopolyGameSessionPlayer.update({
        where: {
          id: player.id,
        },
        data: {
          money: player.money + salePrice,
        },
      })
    })

    const currentPlayer = await prisma.user.findUnique({
      where: {
        id: player.userId,
      },
      select: {
        displayName: true,
      },
    })

    const currentPlayerName = currentPlayer?.displayName ?? 'Игрок'

    await createSystemChatMessage({
      prisma,
      monopolyGateway,
      sessionId,
      userId: player.userId,
      userName: currentPlayerName,
      content: `Игрок ${currentPlayerName} продал улицу ${cellTemplate.name} за ${salePrice}`,
    })

    const updatedSession = await fetchSessionSnapshot(sessionId)

    monopolyGateway.sendStateUpdated(sessionId, updatedSession)

    return updatedSession
  }

  public async upgradeStreet<TSession extends { id: string; currentMovePlayerId: string | null }>(
    {
      sessionId,
      session,
      cellId,
      prisma,
      monopolyGateway,
      fetchSessionSnapshot,
    }: {
      sessionId: string
      session: TSession
      cellId: string
      prisma: PrismaService
      monopolyGateway: MonopolyWebsocketGateway
      fetchSessionSnapshot: (id: string) => Promise<TSession>
    },
  ): Promise<TSession> {
    return this.changeStreetUpgradeLevel({
      sessionId,
      session,
      cellId,
      prisma,
      monopolyGateway,
      fetchSessionSnapshot,
      direction: 'UP',
    })
  }

  public async downgradeStreet<
    TSession extends { id: string; currentMovePlayerId: string | null },
  >({
    sessionId,
    session,
    cellId,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: {
    sessionId: string
    session: TSession
    cellId: string
    prisma: PrismaService
    monopolyGateway: MonopolyWebsocketGateway
    fetchSessionSnapshot: (id: string) => Promise<TSession>
  }): Promise<TSession> {
    return this.changeStreetUpgradeLevel({
      sessionId,
      session,
      cellId,
      prisma,
      monopolyGateway,
      fetchSessionSnapshot,
      direction: 'DOWN',
    })
  }

  private async changeStreetUpgradeLevel<
    TSession extends { id: string; currentMovePlayerId: string | null },
  >({
    sessionId,
    session,
    cellId,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
    direction,
  }: {
    sessionId: string
    session: TSession
    cellId: string
    prisma: PrismaService
    monopolyGateway: MonopolyWebsocketGateway
    fetchSessionSnapshot: (id: string) => Promise<TSession>
    direction: 'UP' | 'DOWN'
  }): Promise<TSession> {
    if (!session.currentMovePlayerId) {
      throw new BadRequestException('Текущий игрок не определен')
    }

    const [player, property, cellTemplate] = await Promise.all([
      prisma.monopolyGameSessionPlayer.findUnique({
        where: {
          sessionId_userId: {
            sessionId,
            userId: session.currentMovePlayerId,
          },
        },
        select: {
          id: true,
          userId: true,
          money: true,
        },
      }),
      prisma.monopolyGameSessionProperty.findFirst({
        where: {
          sessionId,
          cellTemplateId: cellId,
        },
        select: {
          id: true,
          ownerUserId: true,
          level: true,
          isMortgaged: true,
        },
      }),
      prisma.monopolyCellTemplate.findUnique({
        where: {
          id: cellId,
        },
        select: {
          id: true,
          name: true,
          type: true,
          templateId: true,
          collectionId: true,
          streetEconomy: {
            select: {
              upgrades: true,
            },
          },
        },
      }),
    ])

    if (!player) {
      throw new NotFoundException('Игрок в сессии не найден')
    }

    if (!cellTemplate || cellTemplate.type !== MonopolyCellType.STREET) {
      throw new BadRequestException('Улучшение доступно только для улицы')
    }

    if (!property || property.ownerUserId !== player.userId) {
      throw new ConflictException('Вы не владеете этой улицей')
    }

    if (property.isMortgaged) {
      throw new ConflictException('Нельзя улучшать заложенную улицу')
    }

    if (!cellTemplate.collectionId) {
      throw new BadRequestException('Улица не входит в коллекцию')
    }

    const collection = await prisma.monopolyStreetCollectionTemplate.findUnique({
      where: {
        id: cellTemplate.collectionId,
      },
      select: {
        id: true,
        name: true,
        rentGrowthMode: true,
        streetsCount: true,
      },
    })

    if (!collection) {
      throw new NotFoundException('Коллекция улицы не найдена')
    }

    if (collection.rentGrowthMode !== MonopolyStreetRentGrowthMode.BY_UPGRADES) {
      throw new BadRequestException(
        'У этой коллекции рост аренды не через улучшения',
      )
    }

    const collectionCells = await prisma.monopolyCellTemplate.findMany({
      where: {
        templateId: cellTemplate.templateId,
        collectionId: collection.id,
        type: MonopolyCellType.STREET,
      },
      select: {
        id: true,
      },
    })

    const requiredStreetCount = collection.streetsCount ?? collectionCells.length

    const ownedCollectionCount = await prisma.monopolyGameSessionProperty.count({
      where: {
        sessionId,
        ownerUserId: player.userId,
        cellTemplateId: {
          in: collectionCells.map((cell) => cell.id),
        },
      },
    })

    if (ownedCollectionCount < requiredStreetCount) {
      throw new ConflictException(
        'Для улучшения нужно владеть всей коллекцией',
      )
    }

    const upgrades = cellTemplate.streetEconomy?.upgrades

    if (!upgrades || !isUpgradeArray(upgrades) || upgrades.length === 0) {
      throw new BadRequestException('Для этой улицы не настроены улучшения')
    }

    const currentLevel = Math.max(0, property.level)
    const maxLevel = upgrades.length

    const [nextLevel, moneyDelta] =
      direction === 'UP'
        ? (() => {
            if (currentLevel >= maxLevel) {
              throw new ConflictException('Достигнут максимальный уровень')
            }

            const buyPriceRaw = upgrades[currentLevel]?.buyPrice ?? 0
            const buyPrice = Number(buyPriceRaw)

            if (!Number.isFinite(buyPrice) || buyPrice < 0) {
              throw new BadRequestException('Некорректная цена улучшения')
            }

            if (player.money < buyPrice) {
              throw new ConflictException('Недостаточно денег для улучшения')
            }

            return [currentLevel + 1, -buyPrice] as const
          })()
        : (() => {
            if (currentLevel <= 0) {
              throw new ConflictException('Нечего продавать')
            }

            const sellPriceRaw = upgrades[currentLevel - 1]?.sellPrice ?? 0
            const sellPrice = Number(sellPriceRaw)

            if (!Number.isFinite(sellPrice) || sellPrice < 0) {
              throw new BadRequestException('Некорректная цена продажи')
            }

            return [currentLevel - 1, sellPrice] as const
          })()

    await prisma.$transaction(async (tx) => {
      await tx.monopolyGameSessionProperty.update({
        where: {
          id: property.id,
        },
        data: {
          level: nextLevel,
        },
      })

      await tx.monopolyGameSessionPlayer.update({
        where: {
          id: player.id,
        },
        data: {
          money: player.money + moneyDelta,
        },
      })
    })

    const currentPlayer = await prisma.user.findUnique({
      where: {
        id: player.userId,
      },
      select: {
        displayName: true,
      },
    })

    const currentPlayerName = currentPlayer?.displayName ?? 'Игрок'
    const amount = Math.abs(moneyDelta)
    const actionLabel =
      direction === 'UP'
        ? `улучшил улицу ${cellTemplate.name} до уровня ${nextLevel} за ${amount}`
        : `продал улучшение улицы ${cellTemplate.name}, новый уровень ${nextLevel}, получил ${amount}`

    await createSystemChatMessage({
      prisma,
      monopolyGateway,
      sessionId,
      userId: player.userId,
      userName: currentPlayerName,
      content: `Игрок ${currentPlayerName} ${actionLabel}`,
    })

    const updatedSession = await fetchSessionSnapshot(sessionId)

    monopolyGateway.sendStateUpdated(sessionId, updatedSession)

    return updatedSession
  }
}
