import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common'
import {
  MonopolyGameSessionAuctionMode,
  MonopolyGameSessionAuctionStatus,
  MonopolyMoveType,
} from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../websocket/monopoly-websocket.gateway'
import { changeTurnToNextPlayer } from '../changeTurn/change-turn-to-next-player'
import { createSystemChatMessage } from '../chat/create-system-chat-message'

type SessionSnapshot = {
  id: string
  currentMovePlayerId: string | null
  currentTypeMove: MonopolyMoveType
  template: {
    cells: Array<{
      id: string
      name: string
      orderIndex: number
      type: string | null
      price: number | null
    }>
  }
}

type BaseSessionParams<TSession extends SessionSnapshot> = {
  sessionId: string
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  fetchSessionSnapshot: (id: string) => Promise<TSession>
}

type RefusePurchaseParams<TSession extends SessionSnapshot> =
  BaseSessionParams<TSession> & {
    session: TSession
  }

type RaiseBidParams<TSession extends SessionSnapshot> =
  BaseSessionParams<TSession> & {
    auctionId: string
    userId: string
    price: number
  }

type DeclineAuctionParams<TSession extends SessionSnapshot> =
  BaseSessionParams<TSession> & {
    auctionId: string
    userId: string
  }

type BuyDirectOfferStreetParams<TSession extends SessionSnapshot> =
  BaseSessionParams<TSession> & {
    auctionId: string
    userId: string
  }

const AUCTION_BID_STEP = 50
const AUCTION_TURN_DURATION_MS = 10_000

@Injectable()
export class AuctionSessionMonopolyManager implements OnModuleDestroy {
  private readonly logger = new Logger(AuctionSessionMonopolyManager.name)
  private readonly timersByAuctionId = new Map<string, NodeJS.Timeout>()

  public onModuleDestroy() {
    for (const timer of this.timersByAuctionId.values()) {
      clearTimeout(timer)
    }

    this.timersByAuctionId.clear()
  }

  public async refusePurchase<TSession extends SessionSnapshot>({
    sessionId,
    session,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: RefusePurchaseParams<TSession>) {
    if (!session.currentMovePlayerId) {
      throw new BadRequestException('Текущий игрок не определен')
    }

    const activeAuction = await this.getActiveAuction(sessionId, prisma)

    if (activeAuction?.mode === MonopolyGameSessionAuctionMode.DIRECT_OFFER) {
      if (
        activeAuction.currentAuctionPlayer?.userId !==
        session.currentMovePlayerId
      ) {
        throw new BadRequestException('Сейчас отказ от покупки недоступен')
      }

      return this.finishAuction({
        sessionId,
        auctionId: activeAuction.id,
        prisma,
        monopolyGateway,
        fetchSessionSnapshot,
      })
    }

    if (session.currentTypeMove !== MonopolyMoveType.DECISION_TO_BUY_A_STREET) {
      throw new BadRequestException('Отказ от покупки сейчас недоступен')
    }

    const currentPlayer = await prisma.monopolyGameSessionPlayer.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId: session.currentMovePlayerId,
        },
      },
      select: {
        id: true,
        userId: true,
        position: true,
      },
    })

    if (!currentPlayer) {
      throw new NotFoundException('Игрок в сессии не найден')
    }

    const landedCell =
      session.template.cells.find(
        (cell) => cell.orderIndex === currentPlayer.position,
      ) ?? null

    if (!landedCell || landedCell.price == null) {
      throw new BadRequestException('Не удалось определить улицу для продажи')
    }

    const streetPrice = landedCell.price

    const streetProperty = await prisma.monopolyGameSessionProperty.findFirst({
      where: {
        sessionId,
        cellTemplateId: landedCell.id,
      },
      select: {
        sessionPlayerId: true,
      },
    })

    if (streetProperty?.sessionPlayerId) {
      throw new ConflictException('Улица уже куплена')
    }

    const players = await prisma.monopolyGameSessionPlayer.findMany({
      where: {
        sessionId,
        isBankrupt: false,
      },
      orderBy: [{ orderIndex: 'asc' }, { joinedAt: 'asc' }],
      select: {
        id: true,
        userId: true,
      },
    })

    if (players.length <= 1) {
      throw new BadRequestException('Недостаточно игроков для сделки')
    }

    const currentPlayerName = await this.getDisplayName(
      prisma,
      currentPlayer.userId,
    )

    if (players.length === 2) {
      const otherPlayer = players.find(
        (player) => player.userId !== currentPlayer.userId,
      )

      if (!otherPlayer) {
        throw new BadRequestException('Не найден второй игрок')
      }

      await prisma.$transaction(async (tx) => {
        const auction = await tx.monopolyGameSessionAuction.create({
          data: {
            sessionId,
            mode: MonopolyGameSessionAuctionMode.DIRECT_OFFER,
            status: MonopolyGameSessionAuctionStatus.ACTIVE,
            initiatorUserId: currentPlayer.userId,
            streetCellTemplateId: landedCell.id,
            streetInitialPrice: streetPrice,
            currentAuctionPlayerId: otherPlayer.id,
          },
          select: {
            id: true,
          },
        })

        await tx.monopolyGameSessionAuctionPlayer.create({
          data: {
            auctionId: auction.id,
            sessionPlayerId: otherPlayer.id,
            queueIndex: 0,
          },
        })

        await tx.monopolyGameSession.update({
          where: {
            id: sessionId,
          },
          data: {
            currentMovePlayerId: otherPlayer.userId,
            currentTypeMove: MonopolyMoveType.DECISION_TO_BUY_A_STREET,
          },
        })
      })

      await createSystemChatMessage({
        prisma,
        monopolyGateway,
        sessionId,
        userId: currentPlayer.userId,
        userName: currentPlayerName,
        content: `Игрок ${currentPlayerName} отказался от покупки улицы ${landedCell.name}. Другой игрок может купить ее за ${streetPrice}`,
      })

      const updatedSession = await fetchSessionSnapshot(sessionId)
      monopolyGateway.sendStateUpdated(sessionId, updatedSession)

      return updatedSession
    }

    const initiatorIndex = players.findIndex(
      (player) => player.userId === currentPlayer.userId,
    )
    const firstBidderIndex =
      initiatorIndex < 0 ? 0 : (initiatorIndex + 1) % players.length
    const firstBidder = players[firstBidderIndex]

    const createdAuction = await prisma.$transaction(async (tx) => {
      const auction = await tx.monopolyGameSessionAuction.create({
        data: {
          sessionId,
          mode: MonopolyGameSessionAuctionMode.COMPETITIVE,
          status: MonopolyGameSessionAuctionStatus.ACTIVE,
          initiatorUserId: currentPlayer.userId,
          streetCellTemplateId: landedCell.id,
          streetInitialPrice: streetPrice,
          currentAuctionPlayerId: firstBidder.id,
          turnExpiresAt: new Date(Date.now() + AUCTION_TURN_DURATION_MS),
        },
        select: {
          id: true,
        },
      })

      await tx.monopolyGameSessionAuctionPlayer.createMany({
        data: players.map((player, index) => ({
          auctionId: auction.id,
          sessionPlayerId: player.id,
          queueIndex: index,
        })),
      })

      await tx.monopolyGameSession.update({
        where: {
          id: sessionId,
        },
        data: {
          currentMovePlayerId: firstBidder.userId,
          currentTypeMove: MonopolyMoveType.AUCTION,
        },
      })

      return auction
    })

    await createSystemChatMessage({
      prisma,
      monopolyGateway,
      sessionId,
      userId: currentPlayer.userId,
      userName: currentPlayerName,
      content: `Игрок ${currentPlayerName} отказался от покупки улицы ${landedCell.name}. Запущен аукцион с начальной ценой ${streetPrice}`,
    })

    this.scheduleTurnTimeout({
      sessionId,
      auctionId: createdAuction.id,
      prisma,
      monopolyGateway,
      fetchSessionSnapshot,
    })

    const updatedSession = await fetchSessionSnapshot(sessionId)
    monopolyGateway.sendStateUpdated(sessionId, updatedSession)

    return updatedSession
  }

  public async raiseBid<TSession extends SessionSnapshot>({
    sessionId,
    auctionId,
    userId,
    price,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: RaiseBidParams<TSession>) {
    if (!Number.isInteger(price) || price <= 0) {
      throw new BadRequestException('Ставка должна быть положительным числом')
    }

    const auction = await this.getActiveAuctionById(
      auctionId,
      sessionId,
      prisma,
    )

    if (auction.mode !== MonopolyGameSessionAuctionMode.COMPETITIVE) {
      throw new BadRequestException(
        'Ставки доступны только в аукционе с торгами',
      )
    }

    if (auction.currentAuctionPlayer?.userId !== userId) {
      throw new BadRequestException('Сейчас не ваш ход в аукционе')
    }

    const participant = auction.players.find(
      (item) => item.sessionPlayer.userId === userId,
    )

    if (!participant || !participant.continuesAuction) {
      throw new BadRequestException('Вы больше не участвуете в аукционе')
    }

    const minBid = auction.lastBid
      ? auction.lastBid.price + AUCTION_BID_STEP
      : auction.streetInitialPrice

    if (price < minBid) {
      throw new BadRequestException(
        `Минимальная ставка ${minBid}. Каждый шаг должен быть не меньше ${AUCTION_BID_STEP}`,
      )
    }

    if ((auction.currentAuctionPlayer.money ?? 0) < price) {
      throw new ConflictException('Недостаточно денег для этой ставки')
    }

    await prisma.$transaction(async (tx) => {
      await tx.monopolyGameSessionAuctionBid.updateMany({
        where: {
          auctionId,
          isLastBid: true,
        },
        data: {
          isLastBid: false,
        },
      })

      const bid = await tx.monopolyGameSessionAuctionBid.create({
        data: {
          auctionId,
          sessionPlayerId: participant.sessionPlayerId,
          price,
          isLastBid: true,
          isWinner: false,
        },
        select: {
          id: true,
        },
      })

      await tx.monopolyGameSessionAuction.update({
        where: {
          id: auctionId,
        },
        data: {
          lastBidId: bid.id,
        },
      })
    })

    await this.advanceAuctionTurn({
      sessionId,
      auctionId,
      previousAuctionPlayerId: participant.sessionPlayerId,
      initiatorUserId: auction.initiatorUserId,
      prisma,
      monopolyGateway,
      fetchSessionSnapshot,
    })

    return fetchSessionSnapshot(sessionId)
  }

  public async declineAuction<TSession extends SessionSnapshot>({
    sessionId,
    auctionId,
    userId,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: DeclineAuctionParams<TSession>) {
    const auction = await this.getActiveAuctionById(
      auctionId,
      sessionId,
      prisma,
    )

    const participant = auction.players.find(
      (item) => item.sessionPlayer.userId === userId,
    )

    if (!participant) {
      throw new BadRequestException('Игрок не участвует в аукционе')
    }

    if (!participant.continuesAuction) {
      throw new BadRequestException('Вы уже отказались от дальнейших ставок')
    }

    await prisma.monopolyGameSessionAuctionPlayer.update({
      where: {
        id: participant.id,
      },
      data: {
        continuesAuction: false,
        declinedAt: new Date(),
      },
    })

    if (auction.mode === MonopolyGameSessionAuctionMode.DIRECT_OFFER) {
      return this.finishAuction({
        sessionId,
        auctionId,
        prisma,
        monopolyGateway,
        fetchSessionSnapshot,
      })
    }

    if (auction.currentAuctionPlayer?.userId !== userId) {
      const updatedSession = await fetchSessionSnapshot(sessionId)
      monopolyGateway.sendStateUpdated(sessionId, updatedSession)

      return updatedSession
    }

    await this.advanceAuctionTurn({
      sessionId,
      auctionId,
      previousAuctionPlayerId: participant.sessionPlayerId,
      initiatorUserId: auction.initiatorUserId,
      prisma,
      monopolyGateway,
      fetchSessionSnapshot,
    })

    return fetchSessionSnapshot(sessionId)
  }

  public async buyDirectOfferStreet<TSession extends SessionSnapshot>({
    sessionId,
    auctionId,
    userId,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: BuyDirectOfferStreetParams<TSession>) {
    const auction = await this.getActiveAuctionById(
      auctionId,
      sessionId,
      prisma,
    )

    if (auction.mode !== MonopolyGameSessionAuctionMode.DIRECT_OFFER) {
      throw new BadRequestException(
        'Покупка доступна только в прямом предложении',
      )
    }

    if (auction.currentAuctionPlayer?.userId !== userId) {
      throw new BadRequestException('Сейчас не ваш ход для покупки улицы')
    }

    const buyer = await prisma.monopolyGameSessionPlayer.findUnique({
      where: {
        id: auction.currentAuctionPlayer.id,
      },
      select: {
        id: true,
        userId: true,
        money: true,
      },
    })

    if (!buyer) {
      throw new NotFoundException('Игрок-покупатель не найден')
    }

    if (buyer.money < auction.streetInitialPrice) {
      throw new ConflictException('Недостаточно денег для покупки улицы')
    }

    const streetCell = await prisma.monopolyCellTemplate.findUnique({
      where: {
        id: auction.streetCellTemplateId,
      },
      select: {
        id: true,
        name: true,
        orderIndex: true,
      },
    })

    if (!streetCell) {
      throw new NotFoundException('Улица для покупки не найдена')
    }

    await prisma.$transaction(async (tx) => {
      await tx.monopolyGameSessionPlayer.update({
        where: {
          id: buyer.id,
        },
        data: {
          money: {
            decrement: auction.streetInitialPrice,
          },
        },
      })

      await tx.monopolyGameSessionProperty.upsert({
        where: {
          sessionId_cellTemplateId: {
            sessionId,
            cellTemplateId: streetCell.id,
          },
        },
        update: {
          sessionPlayerId: buyer.id,
          ownerUserId: buyer.userId,
          indexCell: streetCell.orderIndex,
        },
        create: {
          sessionId,
          cellTemplateId: streetCell.id,
          sessionPlayerId: buyer.id,
          ownerUserId: buyer.userId,
          indexCell: streetCell.orderIndex,
        },
      })

      await tx.monopolyGameSessionAuction.update({
        where: {
          id: auction.id,
        },
        data: {
          status: MonopolyGameSessionAuctionStatus.ENDED,
          currentAuctionPlayerId: null,
          turnExpiresAt: null,
          endedAt: new Date(),
        },
      })
    })

    const buyerName = await this.getDisplayName(prisma, buyer.userId)

    await createSystemChatMessage({
      prisma,
      monopolyGateway,
      sessionId,
      userId: buyer.userId,
      userName: buyerName,
      content: `Игрок ${buyerName} покупает улицу ${streetCell.name} за ${auction.streetInitialPrice}`,
    })

    await changeTurnToNextPlayer({
      prisma,
      monopolyGateway,
      sessionId,
      currentMovePlayerId: auction.initiatorUserId,
    })

    const updatedSession = await fetchSessionSnapshot(sessionId)
    monopolyGateway.sendStateUpdated(sessionId, updatedSession)

    return updatedSession
  }

  public async getSessionActiveAuction(
    sessionId: string,
    prisma: PrismaService,
  ) {
    return this.getActiveAuction(sessionId, prisma)
  }

  private async advanceAuctionTurn<TSession extends SessionSnapshot>({
    sessionId,
    auctionId,
    previousAuctionPlayerId,
    initiatorUserId,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: BaseSessionParams<TSession> & {
    auctionId: string
    previousAuctionPlayerId: string
    initiatorUserId: string
  }) {
    const auction = await this.getActiveAuctionById(
      auctionId,
      sessionId,
      prisma,
    )

    const activeParticipants = auction.players
      .filter((participant) => participant.continuesAuction)
      .sort((a, b) => a.queueIndex - b.queueIndex)

    if (activeParticipants.length <= 1) {
      await this.finishAuction({
        sessionId,
        auctionId,
        prisma,
        monopolyGateway,
        fetchSessionSnapshot,
      })

      return
    }

    const previousParticipant = auction.players.find(
      (participant) => participant.sessionPlayerId === previousAuctionPlayerId,
    )

    if (!previousParticipant) {
      throw new NotFoundException('Предыдущий участник аукциона не найден')
    }

    const nextParticipant =
      activeParticipants.find(
        (participant) =>
          participant.queueIndex > previousParticipant.queueIndex,
      ) ?? activeParticipants[0]

    const nextUserId = nextParticipant.sessionPlayer.userId
    const nextUserName = await this.getDisplayName(prisma, nextUserId)

    await prisma.$transaction(async (tx) => {
      await tx.monopolyGameSessionAuction.update({
        where: {
          id: auctionId,
        },
        data: {
          currentAuctionPlayerId: nextParticipant.sessionPlayerId,
          turnExpiresAt: new Date(Date.now() + AUCTION_TURN_DURATION_MS),
        },
      })

      await tx.monopolyGameSession.update({
        where: {
          id: sessionId,
        },
        data: {
          currentMovePlayerId: nextUserId,
          currentTypeMove: MonopolyMoveType.AUCTION,
        },
      })
    })

    this.scheduleTurnTimeout({
      sessionId,
      auctionId,
      prisma,
      monopolyGateway,
      fetchSessionSnapshot,
    })

    await createSystemChatMessage({
      prisma,
      monopolyGateway,
      sessionId,
      userId: nextUserId,
      userName: nextUserName,
      content: `Ход ставки переходит к игроку ${nextUserName}`,
    })

    const updatedSession = await fetchSessionSnapshot(sessionId)
    monopolyGateway.sendStateUpdated(sessionId, updatedSession)

    void initiatorUserId
  }

  private async finishAuction<TSession extends SessionSnapshot>({
    sessionId,
    auctionId,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: BaseSessionParams<TSession> & { auctionId: string }) {
    this.clearAuctionTimer(auctionId)

    const auction = await this.getAuctionById(auctionId, sessionId, prisma)

    if (auction.status !== MonopolyGameSessionAuctionStatus.ACTIVE) {
      return fetchSessionSnapshot(sessionId)
    }

    const winnerBid = auction.lastBid

    if (
      winnerBid &&
      auction.mode === MonopolyGameSessionAuctionMode.COMPETITIVE
    ) {
      if (winnerBid.sessionPlayer.money < winnerBid.price) {
        await createSystemChatMessage({
          prisma,
          monopolyGateway,
          sessionId,
          content:
            'Аукцион завершен без победителя: у лидирующего игрока недостаточно средств',
        })
      } else {
        const streetCell = await prisma.monopolyCellTemplate.findUnique({
          where: {
            id: auction.streetCellTemplateId,
          },
          select: {
            id: true,
            name: true,
            orderIndex: true,
          },
        })

        if (!streetCell) {
          throw new NotFoundException('Улица аукциона не найдена')
        }

        await prisma.$transaction(async (tx) => {
          await tx.monopolyGameSessionPlayer.update({
            where: {
              id: winnerBid.sessionPlayerId,
            },
            data: {
              money: {
                decrement: winnerBid.price,
              },
            },
          })

          await tx.monopolyGameSessionProperty.upsert({
            where: {
              sessionId_cellTemplateId: {
                sessionId,
                cellTemplateId: streetCell.id,
              },
            },
            update: {
              sessionPlayerId: winnerBid.sessionPlayerId,
              ownerUserId: winnerBid.sessionPlayer.userId,
              indexCell: streetCell.orderIndex,
            },
            create: {
              sessionId,
              cellTemplateId: streetCell.id,
              sessionPlayerId: winnerBid.sessionPlayerId,
              ownerUserId: winnerBid.sessionPlayer.userId,
              indexCell: streetCell.orderIndex,
            },
          })

          await tx.monopolyGameSessionAuctionBid.update({
            where: {
              id: winnerBid.id,
            },
            data: {
              isWinner: true,
            },
          })
        })

        const winnerName = await this.getDisplayName(
          prisma,
          winnerBid.sessionPlayer.userId,
        )

        await createSystemChatMessage({
          prisma,
          monopolyGateway,
          sessionId,
          userId: winnerBid.sessionPlayer.userId,
          userName: winnerName,
          content: `Аукцион завершен. Игрок ${winnerName} купил улицу за ${winnerBid.price}`,
        })
      }
    } else {
      await createSystemChatMessage({
        prisma,
        monopolyGateway,
        sessionId,
        content: 'Аукцион завершен без победителя',
      })
    }

    await prisma.monopolyGameSessionAuction.update({
      where: {
        id: auctionId,
      },
      data: {
        status: MonopolyGameSessionAuctionStatus.ENDED,
        currentAuctionPlayerId: null,
        turnExpiresAt: null,
        endedAt: new Date(),
      },
    })

    await changeTurnToNextPlayer({
      prisma,
      monopolyGateway,
      sessionId,
      currentMovePlayerId: auction.initiatorUserId,
    })

    const updatedSession = await fetchSessionSnapshot(sessionId)
    monopolyGateway.sendStateUpdated(sessionId, updatedSession)

    return updatedSession
  }

  private scheduleTurnTimeout<TSession extends SessionSnapshot>({
    sessionId,
    auctionId,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: BaseSessionParams<TSession> & { auctionId: string }) {
    this.clearAuctionTimer(auctionId)

    const timer = setTimeout(async () => {
      try {
        const auction = await this.getActiveAuctionById(
          auctionId,
          sessionId,
          prisma,
        )

        if (!auction.currentAuctionPlayer) {
          return
        }

        await this.declineAuction({
          sessionId,
          auctionId,
          userId: auction.currentAuctionPlayer.userId,
          prisma,
          monopolyGateway,
          fetchSessionSnapshot,
        })
      } catch (error) {
        this.logger.warn('Не удалось обработать таймаут аукциона', error)
      }
    }, AUCTION_TURN_DURATION_MS)

    this.timersByAuctionId.set(auctionId, timer)
  }

  private clearAuctionTimer(auctionId: string) {
    const timer = this.timersByAuctionId.get(auctionId)

    if (timer) {
      clearTimeout(timer)
      this.timersByAuctionId.delete(auctionId)
    }
  }

  private async getDisplayName(prisma: PrismaService, userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        displayName: true,
      },
    })

    return user?.displayName ?? 'Игрок'
  }

  private async getActiveAuction(sessionId: string, prisma: PrismaService) {
    return prisma.monopolyGameSessionAuction.findFirst({
      where: {
        sessionId,
        status: MonopolyGameSessionAuctionStatus.ACTIVE,
      },
      include: {
        currentAuctionPlayer: {
          select: {
            id: true,
            userId: true,
            money: true,
          },
        },
        lastBid: {
          include: {
            sessionPlayer: {
              select: {
                id: true,
                userId: true,
                money: true,
              },
            },
          },
        },
        players: {
          orderBy: {
            queueIndex: 'asc',
          },
          include: {
            sessionPlayer: {
              select: {
                id: true,
                userId: true,
                money: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  private async getActiveAuctionById(
    auctionId: string,
    sessionId: string,
    prisma: PrismaService,
  ) {
    const auction = await this.getAuctionById(auctionId, sessionId, prisma)

    if (auction.status !== MonopolyGameSessionAuctionStatus.ACTIVE) {
      throw new BadRequestException('Аукцион уже завершен')
    }

    return auction
  }

  private async getAuctionById(
    auctionId: string,
    sessionId: string,
    prisma: PrismaService,
  ) {
    const auction = await prisma.monopolyGameSessionAuction.findFirst({
      where: {
        id: auctionId,
        sessionId,
      },
      include: {
        currentAuctionPlayer: {
          select: {
            id: true,
            userId: true,
            money: true,
          },
        },
        lastBid: {
          include: {
            sessionPlayer: {
              select: {
                id: true,
                userId: true,
                money: true,
              },
            },
          },
        },
        players: {
          orderBy: {
            queueIndex: 'asc',
          },
          include: {
            sessionPlayer: {
              select: {
                id: true,
                userId: true,
                money: true,
              },
            },
          },
        },
      },
    })

    if (!auction) {
      throw new NotFoundException('Аукцион не найден')
    }

    return auction
  }
}
