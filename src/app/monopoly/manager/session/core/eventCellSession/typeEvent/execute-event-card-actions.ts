import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { MonopolyActionType, MonopolyCellType } from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'

type EventActionSessionCell = {
  id: string
  name: string
  orderIndex: number
  type: MonopolyCellType | null
}

type EventActionSession = {
  currentMovePlayerId: string | null
  template: {
    moneyPerLap?: number
    cells: EventActionSessionCell[]
  }
}

type EventCardAction = {
  id: string
  actionType: string
  amount: number | null
  targetCellId: string | null
  text: string | null
}

type EventCard = {
  id: string
  title: string
  description: string | null
  actions: EventCardAction[]
}

type ExecutedEventCardResult = {
  actionMessages: string[]
  redirectedCellId: string | null
}

const normalizePosition = (position: number, boardSize: number) =>
  ((position % boardSize) + boardSize) % boardSize

const resolveDefaultActionMessage = ({
  action,
  targetCellName,
}: {
  action: EventCardAction
  targetCellName?: string | null
}) => {
  switch (action.actionType) {
    case MonopolyActionType.RECEIVE_MONEY:
      return `получает ${action.amount ?? 0}`
    case MonopolyActionType.PAY_MONEY:
      return `платит ${action.amount ?? 0}`
    case MonopolyActionType.MOVE_TO_CELL:
      return `перемещается на клетку ${targetCellName ?? 'без названия'}`
    case MonopolyActionType.MOVE_STEPS:
      return `перемещается на ${action.amount ?? 0} клеток`
    case MonopolyActionType.GO_TO_JAIL:
      return 'отправляется в тюрьму'
    case MonopolyActionType.SKIP_TURN:
      return (
        action.text?.trim() ||
        'получает пропуск хода, но логика еще не поддерживается'
      )
    case MonopolyActionType.CUSTOM:
      return (
        action.text?.trim() ||
        'получает пользовательское событие без серверной логики'
      )
    default:
      return action.text?.trim() || 'получает событие'
  }
}

export const executeEventCardActions = async ({
  sessionId,
  session,
  card,
  prisma,
}: {
  sessionId: string
  session: EventActionSession
  card: EventCard
  prisma: PrismaService
}): Promise<ExecutedEventCardResult> => {
  if (!session.currentMovePlayerId) {
    throw new BadRequestException('Текущий игрок не определен')
  }

  return prisma.$transaction(async (tx) => {
    const currentPlayer = await tx.monopolyGameSessionPlayer.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId: session.currentMovePlayerId!,
        },
      },
      select: {
        id: true,
        money: true,
        position: true,
      },
    })

    if (!currentPlayer) {
      throw new NotFoundException('Игрок для выполнения события не найден')
    }

    const boardSize = session.template.cells.length

    if (!boardSize) {
      throw new BadRequestException('У шаблона сессии нет клеток')
    }

    let currentMoney = currentPlayer.money
    let currentPosition = currentPlayer.position
    let redirectedCellId: string | null = null
    const actionMessages: string[] = []

    for (const action of card.actions) {
      if (action.actionType === MonopolyActionType.RECEIVE_MONEY) {
        const amount = action.amount ?? 0
        currentMoney += amount

        await tx.monopolyGameSessionPlayer.update({
          where: { id: currentPlayer.id },
          data: { money: currentMoney },
        })

        actionMessages.push(resolveDefaultActionMessage({ action }))
        continue
      }

      if (action.actionType === MonopolyActionType.PAY_MONEY) {
        const amount = action.amount ?? 0

        if (currentMoney < amount) {
          throw new ConflictException(
            'Недостаточно денег для выполнения события',
          )
        }

        currentMoney -= amount

        await tx.monopolyGameSessionPlayer.update({
          where: { id: currentPlayer.id },
          data: { money: currentMoney },
        })

        actionMessages.push(resolveDefaultActionMessage({ action }))
        continue
      }

      if (action.actionType === MonopolyActionType.MOVE_TO_CELL) {
        if (!action.targetCellId) {
          throw new BadRequestException('Для события не задана целевая клетка')
        }

        const targetCell =
          session.template.cells.find(
            (cell) => cell.id === action.targetCellId,
          ) ?? null

        if (!targetCell) {
          throw new NotFoundException('Целевая клетка события не найдена')
        }

        const lapsCompleted = targetCell.orderIndex < currentPosition ? 1 : 0

        currentPosition = targetCell.orderIndex
        currentMoney += lapsCompleted * (session.template.moneyPerLap ?? 0)
        redirectedCellId = targetCell.id

        await tx.monopolyGameSessionPlayer.update({
          where: { id: currentPlayer.id },
          data: {
            position: currentPosition,
            money: currentMoney,
          },
        })

        actionMessages.push(
          resolveDefaultActionMessage({
            action,
            targetCellName: targetCell.name,
          }),
        )
        continue
      }

      if (action.actionType === MonopolyActionType.MOVE_STEPS) {
        const steps = action.amount ?? 0
        const nextAbsolutePosition = currentPosition + steps
        const lapsCompleted =
          steps > 0 ? Math.floor(nextAbsolutePosition / boardSize) : 0
        const nextPosition = normalizePosition(nextAbsolutePosition, boardSize)
        const targetCell =
          session.template.cells.find(
            (cell) => cell.orderIndex === nextPosition,
          ) ?? null

        if (!targetCell) {
          throw new NotFoundException(
            'Клетка назначения после события не найдена',
          )
        }

        currentPosition = nextPosition
        currentMoney += lapsCompleted * (session.template.moneyPerLap ?? 0)
        redirectedCellId = targetCell.id

        await tx.monopolyGameSessionPlayer.update({
          where: { id: currentPlayer.id },
          data: {
            position: currentPosition,
            money: currentMoney,
          },
        })

        actionMessages.push(
          resolveDefaultActionMessage({
            action,
            targetCellName: targetCell.name,
          }),
        )
        continue
      }

      if (action.actionType === MonopolyActionType.GO_TO_JAIL) {
        const jailCell =
          session.template.cells.find(
            (cell) => cell.type === MonopolyCellType.JAIL,
          ) ?? null

        if (!jailCell) {
          throw new NotFoundException('Клетка тюрьмы не найдена в шаблоне')
        }

        currentPosition = jailCell.orderIndex
        redirectedCellId = jailCell.id

        await tx.monopolyGameSessionPlayer.update({
          where: { id: currentPlayer.id },
          data: {
            position: currentPosition,
          },
        })

        actionMessages.push(
          resolveDefaultActionMessage({
            action,
            targetCellName: jailCell.name,
          }),
        )
        continue
      }

      actionMessages.push(resolveDefaultActionMessage({ action }))
    }

    return {
      actionMessages,
      redirectedCellId,
    }
  })
}
