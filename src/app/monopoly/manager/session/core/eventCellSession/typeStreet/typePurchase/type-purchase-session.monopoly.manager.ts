import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { MonopolyGameSessionStatus, MonopolyMoveType } from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../../../websocket/monopoly-websocket.gateway'
import { changeTurnToNextPlayer } from '../../../changeTurn/change-turn-to-next-player'
import { createSystemChatMessage } from '../../../chat/create-system-chat-message'

type TypePurchaseSessionCell = {
  id: string
  name: string
  orderIndex: number
  price: number | null
}

type TypePurchaseSessionSnapshot = {
  id: string
  status: MonopolyGameSessionStatus
  currentMovePlayerId: string | null
  currentTypeMove: MonopolyMoveType
}

type TypePurchaseSessionParams<TSession extends TypePurchaseSessionSnapshot> = {
  sessionId: string
  session: TSession
  landedCell: TypePurchaseSessionCell
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  fetchSessionSnapshot: (id: string) => Promise<TSession>
}

@Injectable()
export class TypePurchaseSessionMonopolyManager {
  public async buyStreet<TSession extends TypePurchaseSessionSnapshot>({
    sessionId,
    session,
    landedCell,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: TypePurchaseSessionParams<TSession>) {
    if (!session.currentMovePlayerId) {
      throw new BadRequestException('Текущий игрок не определен')
    }

    if (landedCell.price == null) {
      throw new BadRequestException('У клетки не задана цена покупки')
    }

    const streetPrice = landedCell.price

    const currentPlayer = await prisma.monopolyGameSessionPlayer.findFirst({
      where: {
        sessionId,
        userId: session.currentMovePlayerId,
      },
      select: {
        id: true,
        userId: true,
        money: true,
      },
    })

    if (!currentPlayer) {
      throw new NotFoundException('Игрок в сессии не найден')
    }

    if (currentPlayer.money < streetPrice) {
      throw new ConflictException('Недостаточно денег для покупки улицы')
    }

    const streetProperty = await prisma.monopolyGameSessionProperty.findFirst({
      where: {
        sessionId,
        cellTemplateId: landedCell.id,
      },
      select: {
        id: true,
        sessionPlayerId: true,
      },
    })

    if (streetProperty?.sessionPlayerId) {
      throw new ConflictException('Улица уже куплена')
    }

    await prisma.$transaction(async (tx) => {
      const ownerUser = await tx.user.findUnique({
        where: {
          id: currentPlayer.userId,
        },
        select: {
          id: true,
        },
      })

      if (!ownerUser) {
        throw new NotFoundException('Пользователь-владелец не найден')
      }

      await tx.monopolyGameSessionPlayer.update({
        where: {
          id: currentPlayer.id,
        },
        data: {
          money: currentPlayer.money - streetPrice,
        },
      })

      if (streetProperty) {
        await tx.monopolyGameSessionProperty.update({
          where: {
            id: streetProperty.id,
          },
          data: {
            sessionPlayerId: currentPlayer.id,
            ownerUserId: ownerUser.id,
          },
        })
      } else {
        await tx.monopolyGameSessionProperty.create({
          data: {
            sessionId,
            sessionPlayerId: currentPlayer.id,
            cellTemplateId: landedCell.id,
            ownerUserId: ownerUser.id,
            indexCell: landedCell.orderIndex,
          },
        })
      }
    })

    const currentPlayerUser = await prisma.user.findUnique({
      where: {
        id: currentPlayer.userId,
      },
      select: {
        displayName: true,
      },
    })

    const currentPlayerName = currentPlayerUser?.displayName ?? 'Игрок'

    await createSystemChatMessage({
      prisma,
      monopolyGateway,
      sessionId,
      userId: currentPlayer.userId,
      userName: currentPlayerName,
      content: `Игрок ${currentPlayerName} покупает улицу ${landedCell.name} за ${streetPrice}`,
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
}
