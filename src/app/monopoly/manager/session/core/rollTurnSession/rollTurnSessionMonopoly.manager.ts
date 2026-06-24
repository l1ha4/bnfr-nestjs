import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  MonopolyCellType,
  MonopolyGameSessionStatus,
  MonopolyMoveType,
} from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import type { Request } from 'express'
import { MonopolyWebsocketGateway } from '../../../../websocket/monopoly-websocket.gateway'
import { EventCellSessionMonopolyManager } from '../eventCellSession/eventCellSessionMonopoly.manager'
import { createSystemChatMessage } from '../chat/create-system-chat-message'
import { changeTurnToNextPlayer } from '../changeTurn/change-turn-to-next-player'

type RollTurnSessionCell = {
  id: string
  name: string
  orderIndex: number
  type: MonopolyCellType | null
  price: number | null
}

type RollTurnSessionSnapshot = {
  id: string
  status: MonopolyGameSessionStatus
  currentMovePlayerId: string | null
  currentTypeMove: MonopolyMoveType
  template: {
    moneyPerLap: number
    cells: RollTurnSessionCell[]
  }
}

type RollTurnSessionPlayer = {
  id: string
  userId: string
  position: number
  money: number
}

type RollTurnMode = 'NORMAL' | 'JAIL_ATTEMPT' | 'JAIL_FINE'

type RollTurnSessionParams<TSession extends RollTurnSessionSnapshot> = {
  sessionId: string
  session: TSession
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  fetchSessionSnapshot: (id: string) => Promise<TSession>
  mode?: RollTurnMode
  req?: Request
}

type RollTurnSessionResult<TSession extends RollTurnSessionSnapshot> = {
  session: TSession
  dice: {
    first: number
    second: number
    total: number
  }
  fromPosition: number
  toPosition: number
  lapsCompleted: number
}

const rollD6 = () => Math.floor(Math.random() * 6) + 1

const normalizePosition = (position: number, boardSize: number) =>
  ((position % boardSize) + boardSize) % boardSize

export const rollTurnSession = async <
  TSession extends RollTurnSessionSnapshot,
>({
  sessionId,
  session,
  prisma,
  monopolyGateway,
  fetchSessionSnapshot,
  mode = 'NORMAL',
}: RollTurnSessionParams<TSession>): Promise<
  RollTurnSessionResult<TSession>
> => {
  if (
    session.status !== MonopolyGameSessionStatus.ACTIVE ||
    session.currentTypeMove !== MonopolyMoveType.DICE_ROLL_ON_THE_MOVE ||
    !session.currentMovePlayerId
  ) {
    throw new BadRequestException('Ход сейчас недоступен')
  }

  const currentPlayer = (await prisma.monopolyGameSessionPlayer.findUnique({
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
      money: true,
    },
  })) as RollTurnSessionPlayer | null

  if (!currentPlayer) {
    throw new NotFoundException('Игрок в сессии не найден')
  }

  const currentPlayerUser = await prisma.user.findUnique({
    where: {
      id: session.currentMovePlayerId,
    },
    select: {
      displayName: true,
    },
  })

  const currentPlayerName = currentPlayerUser?.displayName ?? 'Игрок'

  if (!session.template.cells.length) {
    throw new BadRequestException('У шаблона сессии нет клеток')
  }

  const jailCell =
    session.template.cells.find(
      (cell) => cell.type === MonopolyCellType.JAIL,
    ) ?? null

  const isCurrentPlayerOnJail =
    !!jailCell && currentPlayer.position === jailCell.orderIndex

  if (mode === 'NORMAL' && isCurrentPlayerOnJail) {
    throw new BadRequestException(
      'Вы в тюрьме: оплатите 100 или выбросьте дубль',
    )
  }

  if (
    (mode === 'JAIL_ATTEMPT' || mode === 'JAIL_FINE') &&
    !isCurrentPlayerOnJail
  ) {
    throw new BadRequestException(
      'Тюремное действие недоступно вне клетки тюрьмы',
    )
  }

  if (mode === 'JAIL_FINE' && currentPlayer.money < 100) {
    throw new BadRequestException('Недостаточно денег для выхода из тюрьмы')
  }

  const firstDie = rollD6()
  const secondDie = rollD6()
  const totalSteps = firstDie + secondDie

  const boardSize = session.template.cells.length
  const fromPosition = currentPlayer.position

  if (mode === 'JAIL_ATTEMPT' && firstDie !== secondDie) {
    await createSystemChatMessage({
      prisma,
      monopolyGateway,
      sessionId,
      userId: session.currentMovePlayerId,
      userName: currentPlayerName,
      content: `Игрок ${currentPlayerName} пытается выйти из тюрьмы и бросает ${firstDie} и ${secondDie}. Дубль не выпал`,
    })

    await changeTurnToNextPlayer({
      prisma,
      monopolyGateway,
      sessionId,
      currentMovePlayerId: session.currentMovePlayerId,
    })

    const updatedSession = await fetchSessionSnapshot(sessionId)

    monopolyGateway.sendStateUpdated(sessionId, updatedSession)

    return {
      session: updatedSession,
      dice: {
        first: firstDie,
        second: secondDie,
        total: totalSteps,
      },
      fromPosition,
      toPosition: fromPosition,
      lapsCompleted: 0,
    }
  }

  const nextAbsolutePosition = fromPosition + totalSteps
  const lapsCompleted = Math.floor(nextAbsolutePosition / boardSize)
  const toPosition = normalizePosition(nextAbsolutePosition, boardSize)
  const landedCell =
    session.template.cells.find((cell) => cell.orderIndex === toPosition) ??
    null

  const moneyAfterMove =
    currentPlayer.money +
    lapsCompleted * session.template.moneyPerLap -
    (mode === 'JAIL_FINE' ? 100 : 0)

  await prisma.$transaction(async (tx) => {
    await tx.monopolyGameSessionPlayer.update({
      where: {
        id: currentPlayer.id,
      },
      data: {
        position: toPosition,
        money: moneyAfterMove,
      },
    })
  })

  await createSystemChatMessage({
    prisma,
    monopolyGateway,
    sessionId,
    userId: session.currentMovePlayerId,
    userName: currentPlayerName,
    content:
      mode === 'JAIL_ATTEMPT'
        ? `Игрок ${currentPlayerName} выбросил дубль ${firstDie} и ${secondDie}, выходит из тюрьмы и проходит ${totalSteps} клеток`
        : mode === 'JAIL_FINE'
          ? `Игрок ${currentPlayerName} оплачивает 100 за выход из тюрьмы и бросает кубики: ${firstDie} и ${secondDie} (сумма ${totalSteps})`
          : `Игрок ${currentPlayerName} бросил кубики: ${firstDie} и ${secondDie} (сумма ${totalSteps})`,
  })

  const eventCellSessionMonopolyManager = new EventCellSessionMonopolyManager()
  const updatedSession = await eventCellSessionMonopolyManager.handleLandedCell(
    {
      sessionId,
      session,
      landedCell,
      prisma,
      monopolyGateway,
      fetchSessionSnapshot,
    },
  )

  return {
    session: updatedSession,
    dice: {
      first: firstDie,
      second: secondDie,
      total: totalSteps,
    },
    fromPosition,
    toPosition,
    lapsCompleted,
  }
}
