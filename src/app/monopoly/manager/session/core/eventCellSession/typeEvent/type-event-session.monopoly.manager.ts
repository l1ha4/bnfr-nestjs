import { BadRequestException, Injectable } from '@nestjs/common'
import {
  MonopolyCellType,
  MonopolyGameSessionStatus,
  MonopolyMoveType,
  MonopolyStreetRentGrowthMode,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../../websocket/monopoly-websocket.gateway'
import { createSystemChatMessage } from '../../chat/create-system-chat-message'
import { changeTurnToNextPlayer } from '../../changeTurn/change-turn-to-next-player'
import { TypePurchaseSessionMonopolyManager } from '../typeStreet/typePurchase/type-purchase-session.monopoly.manager'
import { TypeRentSessionMonopolyManager } from '../typeStreet/typeRent/type-rent-session.monopoly.manager'
import { TypeStreetSessionMonopolyManager } from '../typeStreet/type-street-session.monopoly.manager'
import { executeEventCardActions } from './execute-event-card-actions'
import {
  pickRandomEventCard,
  resolveEventCardGroup,
} from './resolve-event-card-group'

type TypeEventSessionCell = {
  id: string
  name: string
  orderIndex: number
  type: MonopolyCellType | null
  price: number | null
  collectionId?: string | null
  collection?: {
    rentGrowthMode: MonopolyStreetRentGrowthMode
    streetsCount: number | null
  } | null
  streetEconomy?: {
    description: string
    purchasePricesByOwnedCount: Prisma.JsonValue
    rentByOwnedCount: Prisma.JsonValue
    baseRentWithoutUpgrades: number | null
    upgrades: Prisma.JsonValue
    salePriceWithoutUpgrades: number | null
    salePriceByUpgradeCount: Prisma.JsonValue
    mortgagePrice: number | null
    mortgageBuyoutPrice: number | null
    allowRentWhenMortgaged: boolean
  } | null
}

type TypeEventSessionCardAction = {
  id: string
  actionType: string
  amount: number | null
  targetCellId: string | null
  text: string | null
}

type TypeEventSessionCard = {
  id: string
  title: string
  description: string | null
  actions: TypeEventSessionCardAction[]
}

type TypeEventSessionCardGroup = {
  id: string
  title: string
  cards: TypeEventSessionCard[]
}

type TypeEventSessionSnapshot = {
  id: string
  status: MonopolyGameSessionStatus
  currentMovePlayerId: string | null
  currentTypeMove: MonopolyMoveType
  template: {
    moneyPerLap?: number
    cells: TypeEventSessionCell[]
    cardGroups?: TypeEventSessionCardGroup[]
  }
}

type TypeEventSessionParams<TSession extends TypeEventSessionSnapshot> = {
  sessionId: string
  session: TSession
  landedCell: TypeEventSessionCell
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  fetchSessionSnapshot: (id: string) => Promise<TSession>
  typeStreetSessionMonopolyManager: TypeStreetSessionMonopolyManager
  typePurchaseSessionMonopolyManager: TypePurchaseSessionMonopolyManager
  typeRentSessionMonopolyManager: TypeRentSessionMonopolyManager
}

@Injectable()
export class TypeEventSessionMonopolyManager {
  public async handleEventCell<TSession extends TypeEventSessionSnapshot>({
    sessionId,
    session,
    landedCell,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
    typeStreetSessionMonopolyManager,
    typePurchaseSessionMonopolyManager,
    typeRentSessionMonopolyManager,
  }: TypeEventSessionParams<TSession>): Promise<TSession> {
    if (!session.currentMovePlayerId) {
      throw new BadRequestException('Текущий игрок не определен')
    }

    const cardGroups = session.template.cardGroups ?? []
    const selectedGroup = resolveEventCardGroup({
      landedCell,
      cardGroups,
    })
    const selectedCard = pickRandomEventCard(selectedGroup)

    const currentUser = await prisma.user.findUnique({
      where: {
        id: session.currentMovePlayerId,
      },
      select: {
        id: true,
        displayName: true,
      },
    })

    const currentPlayerName = currentUser?.displayName ?? 'Игрок'

    await prisma.monopolyGameSession.update({
      where: {
        id: sessionId,
      },
      data: {
        currentTypeMove: MonopolyMoveType.CARD_ACTION,
      },
    })

    await createSystemChatMessage({
      prisma,
      monopolyGateway,
      sessionId,
      userId: session.currentMovePlayerId,
      userName: currentPlayerName,
      content: selectedCard.description?.trim()
        ? `Игрок ${currentPlayerName} вытянул карточку «${selectedCard.title}»: ${selectedCard.description}`
        : `Игрок ${currentPlayerName} вытянул карточку «${selectedCard.title}»`,
    })

    const executionResult = await executeEventCardActions({
      sessionId,
      session,
      card: selectedCard,
      prisma,
    })

    for (const actionMessage of executionResult.actionMessages) {
      await createSystemChatMessage({
        prisma,
        monopolyGateway,
        sessionId,
        userId: session.currentMovePlayerId,
        userName: currentPlayerName,
        content: `Игрок ${currentPlayerName} ${actionMessage}`,
      })
    }

    const redirectedCell = executionResult.redirectedCellId
      ? (session.template.cells.find(
          (cell) => cell.id === executionResult.redirectedCellId,
        ) ?? null)
      : null

    if (redirectedCell?.type === MonopolyCellType.STREET) {
      const updatedSession = await fetchSessionSnapshot(sessionId)
      const actualRedirectedCell =
        updatedSession.template.cells.find(
          (cell) => cell.id === redirectedCell.id,
        ) ?? redirectedCell

      return typeStreetSessionMonopolyManager.handleStreetCell({
        sessionId,
        session: updatedSession,
        landedCell: actualRedirectedCell,
        prisma,
        monopolyGateway,
        fetchSessionSnapshot,
        typePurchaseSessionMonopolyManager,
        typeRentSessionMonopolyManager,
      })
    }

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
}
