import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { Request } from 'express'
import { MonopolyMoveType } from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { CreateSessionDto } from '../../api/dto/create-session.dto'
import { UpdatePlayerReadyDto } from '../../api/dto/update-player-ready.dto'
import { MonopolyWebsocketGateway } from '../../websocket/monopoly-websocket.gateway'
import { ColorManager } from './connection/color/color.manager'
import { FigurinesManager } from './connection/figurines/figurines.manager'
import { ConnectionPlayerManager } from './connection/connectionPlayer/connection-player.manager'
import { PlayerReadyManager } from './connection/playerReady/player-ready.manager'
import { CreateSessionManager } from './createSession/create-session.manager'
import { ResetSessionManager } from './core/resetSession/reset-session.manager'
import { rollTurnSession } from './core/rollTurnSession/rollTurnSessionMonopoly.manager'
import { TypePurchaseSessionMonopolyManager } from './core/eventCellSession/typeStreet/typePurchase/type-purchase-session.monopoly.manager'
import { TypeAuctionSessionMonopolyManager } from './core/eventCellSession/typeStreet/typeAuction/type-auction-session.monopoly.manager'
import { AuctionSessionMonopolyManager } from './core/auction/auction-session.monopoly.manager'
import { TypeRentSessionMonopolyManager } from './core/eventCellSession/typeStreet/typeRent/type-rent-session.monopoly.manager'

@Injectable()
export class SessionManager {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly monopolyGateway: MonopolyWebsocketGateway,
    private readonly createSessionManager: CreateSessionManager,
    private readonly connectionPlayerManager: ConnectionPlayerManager,
    private readonly playerReadyManager: PlayerReadyManager,
    private readonly colorManager: ColorManager,
    private readonly figurinesManager: FigurinesManager,
    private readonly resetSessionManager: ResetSessionManager,
    private readonly typePurchaseSessionMonopolyManager: TypePurchaseSessionMonopolyManager,
    private readonly typeRentSessionMonopolyManager: TypeRentSessionMonopolyManager,
    private readonly typeAuctionSessionMonopolyManager: TypeAuctionSessionMonopolyManager,
    private readonly auctionSessionMonopolyManager: AuctionSessionMonopolyManager,
  ) {}

  public async findSessionById(id: string) {
    return this.playerReadyManager.findSessionById(id)
  }

  public async getSessionChatHistory(sessionId: string): Promise<
    {
      id: string
      sessionId: string
      userId: string | null
      userName: string | null
      content: string
      isSystemMessage: boolean
      createdAt: Date
    }[]
  > {
    const session = await this.prisma.monopolyGameSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    })

    if (!session) {
      throw new NotFoundException('Сессия не найдена')
    }

    const messages = await this.prisma.monopolyGameSessionChatMessage.findMany({
      where: {
        sessionId,
      },
      select: {
        id: true,
        sessionId: true,
        userId: true,
        content: true,
        isSystemMessage: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const userIds = Array.from(
      new Set(
        messages
          .map((message) => message.userId)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    )

    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            displayName: true,
          },
        })
      : []

    const userNameById = new Map(
      users.map((user) => [user.id, user.displayName]),
    )

    return messages.map((message) => ({
      id: message.id,
      sessionId: message.sessionId,
      userId: message.userId,
      userName: message.userId
        ? (userNameById.get(message.userId) ?? null)
        : null,
      content: message.content,
      isSystemMessage: message.isSystemMessage,
      createdAt: message.createdAt,
    }))
  }

  public async createSessionChatMessage(
    sessionId: string,
    content: string,
    req: Request,
  ): Promise<{
    id: string
    sessionId: string
    userId: string | null
    userName: string | null
    content: string
    isSystemMessage: boolean
    createdAt: Date
  }> {
    const trimmedContent = content?.trim()

    if (!trimmedContent) {
      throw new BadRequestException('Сообщение не может быть пустым')
    }

    const session = await this.prisma.monopolyGameSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    })

    if (!session) {
      throw new NotFoundException('Сессия не найдена')
    }

    const userId = req.session.userId

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    })

    const createdMessage =
      await this.prisma.monopolyGameSessionChatMessage.create({
        data: {
          sessionId,
          userId,
          content: trimmedContent,
          isSystemMessage: false,
        },
        select: {
          id: true,
          sessionId: true,
          userId: true,
          content: true,
          isSystemMessage: true,
          createdAt: true,
        },
      })

    const payload = {
      id: createdMessage.id,
      sessionId: createdMessage.sessionId,
      userId: createdMessage.userId,
      userName: user?.displayName ?? null,
      content: createdMessage.content,
      isSystemMessage: createdMessage.isSystemMessage,
      createdAt: createdMessage.createdAt,
    }

    this.monopolyGateway.sendChatMessageCreated(sessionId, payload)

    return payload
  }

  public async getCurrentSession(req: Request) {
    const userId = req.session.userId

    const playerSession = await this.prisma.monopolyGameSessionPlayer.findFirst(
      {
        where: {
          userId,
        },
        select: {
          session: {
            select: {
              id: true,
            },
          },
        },
      },
    )

    if (!playerSession?.session?.id) {
      return null
    }

    return this.playerReadyManager.findSessionById(playerSession.session.id)
  }

  public async getFigurineCollections() {
    return this.figurinesManager.getFigurineCollections()
  }

  public async getCollectionFigurines(collectionId: string) {
    return this.figurinesManager.getCollectionFigurines(collectionId)
  }

  public async getPlayerColors() {
    return this.colorManager.getPlayerColors()
  }

  public async createSession(createSessionDto: CreateSessionDto, req: Request) {
    return this.createSessionManager.createSession(createSessionDto, req)
  }

  public async deleteSession(id: string) {
    const result = await this.prisma.monopolyGameSession.deleteMany({
      where: { id },
    })

    if (result.count === 0) {
      throw new NotFoundException('Сессия не найдена')
    }

    this.monopolyGateway.sendSessionDeleted(id)

    return true
  }

  public async exitSession(id: string, req: Request) {
    const userId = req.session.userId!

    const player = await this.prisma.monopolyGameSessionPlayer.findUnique({
      where: {
        sessionId_userId: {
          sessionId: id,
          userId,
        },
      },
      select: {
        id: true,
      },
    })

    if (!player) {
      throw new NotFoundException('Игрок не найден')
    }

    const playersCount = await this.prisma.monopolyGameSessionPlayer.count({
      where: { sessionId: id },
    })

    await this.prisma.monopolyGameSessionPlayer.delete({
      where: { id: player.id },
    })

    this.monopolyGateway.sendPlayerLeft(id, {
      sessionId: id,
      userId,
      playerId: player.id,
    })

    if (playersCount <= 1) {
      await this.deleteSession(id)
      return { deletedSession: true }
    }

    return { deletedSession: false }
  }

  public async connectToSession(id: string, req: Request) {
    return this.connectionPlayerManager.connectToSession(id, req)
  }

  public async readyPlayer(
    id: string,
    dto: UpdatePlayerReadyDto,
    req: Request,
  ) {
    return this.playerReadyManager.readyPlayer(id, dto, req)
  }

  public async rollTurn(id: string, req: Request) {
    const userId = req.session.userId

    const session = await this.playerReadyManager.findSessionById(id)

    if (session.currentMovePlayerId !== userId) {
      throw new BadRequestException('Сейчас не ваш ход')
    }

    return rollTurnSession({
      sessionId: id,
      session,
      prisma: this.prisma,
      monopolyGateway: this.monopolyGateway,
      fetchSessionSnapshot: this.playerReadyManager.findSessionById.bind(
        this.playerReadyManager,
      ),
    })
  }

  public async buyStreet(id: string, cellId: string, req: Request) {
    const userId = req.session.userId

    const session = await this.playerReadyManager.findSessionById(id)

    if (session.currentMovePlayerId !== userId) {
      throw new BadRequestException('Сейчас не ваш ход')
    }

    if (session.currentTypeMove !== MonopolyMoveType.DECISION_TO_BUY_A_STREET) {
      throw new BadRequestException('Покупка улицы сейчас недоступна')
    }

    const activeAuction =
      await this.auctionSessionMonopolyManager.getSessionActiveAuction(
        id,
        this.prisma,
      )

    if (activeAuction?.mode === 'DIRECT_OFFER') {
      return this.auctionSessionMonopolyManager.buyDirectOfferStreet({
        sessionId: id,
        auctionId: activeAuction.id,
        userId,
        prisma: this.prisma,
        monopolyGateway: this.monopolyGateway,
        fetchSessionSnapshot: this.playerReadyManager.findSessionById.bind(
          this.playerReadyManager,
        ),
      })
    }

    const cellTemplate =
      await this.prisma.monopolyCellTemplate.findUniqueOrThrow({
        where: { id: cellId },
        select: { id: true, name: true, orderIndex: true, price: true },
      })

    return this.typePurchaseSessionMonopolyManager.buyStreet({
      sessionId: id,
      session,
      landedCell: cellTemplate,
      prisma: this.prisma,
      monopolyGateway: this.monopolyGateway,
      fetchSessionSnapshot: this.playerReadyManager.findSessionById.bind(
        this.playerReadyManager,
      ),
    })
  }

  public async refusePurchase(id: string, req: Request) {
    const userId = req.session.userId

    const session = await this.playerReadyManager.findSessionById(id)

    if (session.currentMovePlayerId !== userId) {
      throw new BadRequestException('Сейчас не ваш ход')
    }

    return this.typeAuctionSessionMonopolyManager.refusePurchase({
      sessionId: id,
      session,
      prisma: this.prisma,
      monopolyGateway: this.monopolyGateway,
      fetchSessionSnapshot: this.playerReadyManager.findSessionById.bind(
        this.playerReadyManager,
      ),
      auctionSessionMonopolyManager: this.auctionSessionMonopolyManager,
    })
  }

  public async payRent(id: string, req: Request) {
    const userId = req.session.userId

    const session = await this.playerReadyManager.findSessionById(id)

    if (session.currentMovePlayerId !== userId) {
      throw new BadRequestException('Сейчас не ваш ход')
    }

    if (
      session.currentTypeMove !==
      MonopolyMoveType.EXPECTED_RENT_PAYMENT_RESPONSE
    ) {
      throw new BadRequestException('Оплата аренды сейчас недоступна')
    }

    return this.typeRentSessionMonopolyManager.payRent({
      sessionId: id,
      session,
      prisma: this.prisma,
      monopolyGateway: this.monopolyGateway,
      fetchSessionSnapshot: this.playerReadyManager.findSessionById.bind(
        this.playerReadyManager,
      ),
    })
  }

  public async raiseAuctionBid(
    id: string,
    auctionId: string,
    price: number,
    req: Request,
  ) {
    const userId = req.session.userId!

    const session = await this.playerReadyManager.findSessionById(id)

    if (session.currentTypeMove !== MonopolyMoveType.AUCTION) {
      throw new BadRequestException('Ставка доступна только во время аукциона')
    }

    return this.auctionSessionMonopolyManager.raiseBid({
      sessionId: id,
      auctionId,
      userId,
      price,
      prisma: this.prisma,
      monopolyGateway: this.monopolyGateway,
      fetchSessionSnapshot: this.playerReadyManager.findSessionById.bind(
        this.playerReadyManager,
      ),
    })
  }

  public async declineAuction(id: string, auctionId: string, req: Request) {
    const userId = req.session.userId!!

    const session = await this.playerReadyManager.findSessionById(id)

    if (
      session.currentTypeMove !== MonopolyMoveType.AUCTION &&
      session.currentTypeMove !== MonopolyMoveType.DECISION_TO_BUY_A_STREET
    ) {
      throw new BadRequestException('Отказ от аукциона сейчас недоступен')
    }

    return this.auctionSessionMonopolyManager.declineAuction({
      sessionId: id,
      auctionId,
      userId,
      prisma: this.prisma,
      monopolyGateway: this.monopolyGateway,
      fetchSessionSnapshot: this.playerReadyManager.findSessionById.bind(
        this.playerReadyManager,
      ),
    })
  }

  public async resetSession(id: string, req: Request) {
    return this.resetSessionManager.resetSession(id, req)
  }
}
