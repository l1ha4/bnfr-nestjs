import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import {
  MonopolyCellType,
  MonopolyGameSessionStatus,
  MonopolyMoveType,
} from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../../websocket/monopoly-websocket.gateway'
import { createSystemChatMessage } from '../../chat/create-system-chat-message'
import { changeTurnToNextPlayer } from '../../changeTurn/change-turn-to-next-player'
import { TypePurchaseSessionMonopolyManager } from './typePurchase/type-purchase-session.monopoly.manager'
import { TypeRentSessionMonopolyManager } from './typeRent/type-rent-session.monopoly.manager'

type TypeStreetSessionCell = {
  id: string
  name: string
  orderIndex: number
  type: MonopolyCellType | null
  price: number | null
  collectionId?: string | null
}

type TypeStreetSessionSnapshot = {
  id: string
  status: MonopolyGameSessionStatus
  currentMovePlayerId: string | null
  currentTypeMove: MonopolyMoveType
}

type TypeStreetSessionParams<TSession extends TypeStreetSessionSnapshot> = {
  sessionId: string
  session: TSession
  landedCell: TypeStreetSessionCell
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  fetchSessionSnapshot: (id: string) => Promise<TSession>
  typePurchaseSessionMonopolyManager: TypePurchaseSessionMonopolyManager
  typeRentSessionMonopolyManager: TypeRentSessionMonopolyManager
}

@Injectable()
export class TypeStreetSessionMonopolyManager {
  private readonly logger = new Logger(TypeStreetSessionMonopolyManager.name)

  public constructor(
    private readonly typePurchaseSessionMonopolyManager = new TypePurchaseSessionMonopolyManager(),
    private readonly typeRentSessionMonopolyManager = new TypeRentSessionMonopolyManager(),
  ) {}

  public async handleStreetCell<TSession extends TypeStreetSessionSnapshot>({
    sessionId,
    session,
    landedCell,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
    typePurchaseSessionMonopolyManager,
    typeRentSessionMonopolyManager,
  }: TypeStreetSessionParams<TSession>) {
    if (!session.currentMovePlayerId) {
      throw new BadRequestException('Текущий игрок не определен')
    }

    const streetProperty = await prisma.monopolyGameSessionProperty.findFirst({
      where: {
        sessionId,
        cellTemplateId: landedCell.id,
      },
      select: {
        id: true,
        sessionPlayerId: true,
        ownerUserId: true,
      },
    })

    if (!streetProperty?.sessionPlayerId) {
      await prisma.monopolyGameSession.update({
        where: {
          id: sessionId,
        },
        data: {
          currentTypeMove: MonopolyMoveType.DECISION_TO_BUY_A_STREET,
        },
      })

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
        content: `Игрок ${currentPlayerName} выбирает: купить улицу ${landedCell.name} или выставить ее на аукцион`,
      })

      const updatedSession = await fetchSessionSnapshot(sessionId)

      monopolyGateway.sendStateUpdated(sessionId, updatedSession)

      return updatedSession
    }

    if (
      streetProperty.ownerUserId &&
      streetProperty.ownerUserId !== session.currentMovePlayerId
    ) {
      return typeRentSessionMonopolyManager.expectRentPayment({
        sessionId,
        session,
        landedCell,
        ownerUserId: streetProperty.ownerUserId,
        prisma,
        monopolyGateway,
        fetchSessionSnapshot,
      })
    }

    if (streetProperty.ownerUserId === session.currentMovePlayerId) {
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
        content: `Игрок ${currentPlayerName} попал на свою улицу ${landedCell.name}. Аренда не взимается.`,
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

    this.logger.warn(
      'Сервер не знает, как обработать этот тип клетки [в разработке]',
      {
        sessionId,
        cellId: landedCell.id,
        ownerPlayerId: streetProperty.sessionPlayerId,
        ownerUserId: streetProperty.ownerUserId,
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

  public async buyStreet<TSession extends TypeStreetSessionSnapshot>({
    sessionId,
    session,
    landedCell,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: TypeStreetSessionParams<TSession>) {
    return this.typePurchaseSessionMonopolyManager.buyStreet({
      sessionId,
      session,
      landedCell,
      prisma,
      monopolyGateway,
      fetchSessionSnapshot,
    })
  }
}
