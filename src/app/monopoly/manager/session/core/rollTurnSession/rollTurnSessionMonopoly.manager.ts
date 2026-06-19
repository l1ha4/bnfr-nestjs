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

type RollTurnSessionCell = {
  id: string
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
  position: number
  money: number
}

type RollTurnSessionParams<TSession extends RollTurnSessionSnapshot> = {
  sessionId: string
  session: TSession
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  fetchSessionSnapshot: (id: string) => Promise<TSession>
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
      position: true,
      money: true,
    },
  })) as RollTurnSessionPlayer | null

  if (!currentPlayer) {
    throw new NotFoundException('Игрок в сессии не найден')
  }

  if (!session.template.cells.length) {
    throw new BadRequestException('У шаблона сессии нет клеток')
  }

  const firstDie = rollD6()
  const secondDie = rollD6()
  const totalSteps = firstDie + secondDie

  const boardSize = session.template.cells.length
  const fromPosition = currentPlayer.position
  const nextAbsolutePosition = fromPosition + totalSteps
  const lapsCompleted = Math.floor(nextAbsolutePosition / boardSize)
  const toPosition = normalizePosition(nextAbsolutePosition, boardSize)
  const landedCell =
    session.template.cells.find((cell) => cell.orderIndex === toPosition) ??
    null

  const moneyAfterMove =
    currentPlayer.money + lapsCompleted * session.template.moneyPerLap

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
