import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import {
  MonopolyCellType,
  MonopolyGameSessionStatus,
  MonopolyMoveType,
} from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../websocket/monopoly-websocket.gateway'
import { createSystemChatMessage } from '../chat/create-system-chat-message'
import { changeTurnToNextPlayer } from '../changeTurn/change-turn-to-next-player'
import { TypeEventSessionMonopolyManager } from './typeEvent/type-event-session.monopoly.manager'
import { TypePurchaseSessionMonopolyManager } from './typeStreet/typePurchase/type-purchase-session.monopoly.manager'
import { TypeRentSessionMonopolyManager } from './typeStreet/typeRent/type-rent-session.monopoly.manager'
import { TypeStreetSessionMonopolyManager } from './typeStreet/type-street-session.monopoly.manager'

type EventCellSessionCell = {
  id: string
  name: string
  orderIndex: number
  type: MonopolyCellType | null
  price: number | null
  collectionId?: string | null
}

type EventCellSessionSnapshot = {
  id: string
  status: MonopolyGameSessionStatus
  currentMovePlayerId: string | null
  currentTypeMove: MonopolyMoveType
  template: {
    moneyPerLap?: number
    cells: EventCellSessionCell[]
    cardGroups?: Array<{
      id: string
      title: string
      cards: Array<{
        id: string
        title: string
        description: string | null
        actions: Array<{
          id: string
          actionType: string
          amount: number | null
          targetCellId: string | null
          text: string | null
        }>
      }>
    }>
  }
}

type EventCellSessionParams<TSession extends EventCellSessionSnapshot> = {
  sessionId: string
  session: TSession
  landedCell: EventCellSessionCell | null
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  fetchSessionSnapshot: (id: string) => Promise<TSession>
}

@Injectable()
export class EventCellSessionMonopolyManager {
  private readonly logger = new Logger(EventCellSessionMonopolyManager.name)

  public constructor(
    private readonly typeEventSessionMonopolyManager = new TypeEventSessionMonopolyManager(),
    private readonly typeStreetSessionMonopolyManager = new TypeStreetSessionMonopolyManager(),
    private readonly typePurchaseSessionMonopolyManager = new TypePurchaseSessionMonopolyManager(),
    private readonly typeRentSessionMonopolyManager = new TypeRentSessionMonopolyManager(),
  ) {}

  public async handleLandedCell<TSession extends EventCellSessionSnapshot>({
    sessionId,
    session,
    landedCell,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: EventCellSessionParams<TSession>): Promise<TSession> {
    if (
      session.status !== MonopolyGameSessionStatus.ACTIVE ||
      !session.currentMovePlayerId
    ) {
      throw new BadRequestException('Ход сейчас недоступен')
    }

    if (!landedCell) {
      throw new NotFoundException('Клетка для обработки не найдена')
    }

    const currentPlayer = await prisma.user.findUnique({
      where: {
        id: session.currentMovePlayerId,
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
      userId: session.currentMovePlayerId,
      userName: currentPlayerName,
      content:
        landedCell.type === MonopolyCellType.STREET
          ? `Игрок ${currentPlayerName} попал на улицу ${landedCell.name}`
          : `Игрок ${currentPlayerName} попал на клетку ${landedCell.name}`,
    })

    if (landedCell.type === MonopolyCellType.START) {
      await changeTurnToNextPlayer({
        prisma,
        monopolyGateway,
        sessionId,
        currentMovePlayerId: session.currentMovePlayerId,
      })

      const updatedSession = await fetchSessionSnapshot(sessionId)

      monopolyGateway.sendStateUpdated(sessionId, updatedSession)

      return updatedSession
    }

    if (landedCell.type === MonopolyCellType.PARKING) {
      await changeTurnToNextPlayer({
        prisma,
        monopolyGateway,
        sessionId,
        currentMovePlayerId: session.currentMovePlayerId,
      })

      const updatedSession = await fetchSessionSnapshot(sessionId)

      monopolyGateway.sendStateUpdated(sessionId, updatedSession)

      return updatedSession
    }

    if (landedCell.type === MonopolyCellType.JAIL) {
      await changeTurnToNextPlayer({
        prisma,
        monopolyGateway,
        sessionId,
        currentMovePlayerId: session.currentMovePlayerId,
      })

      const updatedSession = await fetchSessionSnapshot(sessionId)

      monopolyGateway.sendStateUpdated(sessionId, updatedSession)

      return updatedSession
    }

    if (landedCell.type === MonopolyCellType.GO_TO_JAIL) {
      const jailCell =
        session.template.cells.find(
          (cell) => cell.type === MonopolyCellType.JAIL,
        ) ?? null

      if (!jailCell) {
        throw new NotFoundException('Клетка тюрьмы не найдена')
      }

      const currentSessionPlayer =
        await prisma.monopolyGameSessionPlayer.findUnique({
          where: {
            sessionId_userId: {
              sessionId,
              userId: session.currentMovePlayerId,
            },
          },
          select: {
            id: true,
          },
        })

      if (!currentSessionPlayer) {
        throw new NotFoundException('Игрок в сессии не найден')
      }

      await prisma.monopolyGameSessionPlayer.update({
        where: {
          id: currentSessionPlayer.id,
        },
        data: {
          position: jailCell.orderIndex,
        },
      })

      await createSystemChatMessage({
        prisma,
        monopolyGateway,
        sessionId,
        userId: session.currentMovePlayerId,
        userName: currentPlayerName,
        content: `Игрок ${currentPlayerName} отправляется в тюрьму`,
      })

      await changeTurnToNextPlayer({
        prisma,
        monopolyGateway,
        sessionId,
        currentMovePlayerId: session.currentMovePlayerId,
      })

      const updatedSession = await fetchSessionSnapshot(sessionId)

      monopolyGateway.sendStateUpdated(sessionId, updatedSession)

      return updatedSession
    }

    if (landedCell.type === MonopolyCellType.STREET) {
      return this.typeStreetSessionMonopolyManager.handleStreetCell({
        sessionId,
        session,
        landedCell,
        prisma,
        monopolyGateway,
        fetchSessionSnapshot,
        typePurchaseSessionMonopolyManager:
          this.typePurchaseSessionMonopolyManager,
        typeRentSessionMonopolyManager: this.typeRentSessionMonopolyManager,
      })
    }

    if (
      landedCell.type === MonopolyCellType.CHANCE ||
      landedCell.type === MonopolyCellType.COMMUNITY ||
      landedCell.type === MonopolyCellType.COMMUNITY_CHEST
    ) {
      return this.typeEventSessionMonopolyManager.handleEventCell({
        sessionId,
        session,
        landedCell,
        prisma,
        monopolyGateway,
        fetchSessionSnapshot,
        typeStreetSessionMonopolyManager: this.typeStreetSessionMonopolyManager,
        typePurchaseSessionMonopolyManager:
          this.typePurchaseSessionMonopolyManager,
        typeRentSessionMonopolyManager: this.typeRentSessionMonopolyManager,
      })
    }

    this.logger.warn(
      'Сервер не знает, как обработать этот тип клетки[в разработке]',
      {
        sessionId,
        cellId: landedCell.id,
        cellType: landedCell.type,
      },
    )

    await prisma.monopolyGameSession.update({
      where: {
        id: sessionId,
      },
      data: {
        currentTypeMove: MonopolyMoveType.WAIT,
      },
    })

    const updatedSession = await fetchSessionSnapshot(sessionId)

    monopolyGateway.sendStateUpdated(sessionId, updatedSession)

    return updatedSession
  }
}
