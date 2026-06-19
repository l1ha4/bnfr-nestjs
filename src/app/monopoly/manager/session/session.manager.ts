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
  ) {}

  public async findSessionById(id: string) {
    return this.playerReadyManager.findSessionById(id)
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
    const userId = req.session.userId

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

    const cellTemplate =
      await this.prisma.monopolyCellTemplate.findUniqueOrThrow({
        where: { id: cellId },
        select: { id: true, orderIndex: true, price: true },
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

  public async resetSession(id: string) {
    return this.resetSessionManager.resetSession(id)
  }
}
