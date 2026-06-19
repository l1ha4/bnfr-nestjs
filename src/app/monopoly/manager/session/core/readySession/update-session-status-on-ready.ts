import { MonopolyGameSessionStatus, MonopolyMoveType } from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../websocket/monopoly-websocket.gateway'

type ReadySessionPlayer = {
  isReady: boolean
}

type ReadySessionSnapshot = {
  id: string
  status: MonopolyGameSessionStatus
  minPlayers: number
  players: ReadySessionPlayer[]
}

type UpdateSessionStatusWhenAllReadyParams<
  TSession extends ReadySessionSnapshot,
> = {
  sessionId: string
  session: TSession
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  fetchSessionSnapshot: (id: string) => Promise<TSession>
}

type UpdateSessionStatusWhenAllReadyResult<
  TSession extends ReadySessionSnapshot,
> = {
  session: TSession
  statusChanged: boolean
}

const shufflePlayers = <T>(players: T[]): T[] => {
  const shuffledPlayers = [...players]

  for (let index = shuffledPlayers.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffledPlayers[index], shuffledPlayers[randomIndex]] = [
      shuffledPlayers[randomIndex],
      shuffledPlayers[index],
    ]
  }

  return shuffledPlayers
}

export const updateSessionStatusWhenAllReady = async <
  TSession extends ReadySessionSnapshot,
>({
  sessionId,
  session,
  prisma,
  monopolyGateway,
  fetchSessionSnapshot,
}: UpdateSessionStatusWhenAllReadyParams<TSession>): Promise<
  UpdateSessionStatusWhenAllReadyResult<TSession>
> => {
  const allPlayersReady =
    session.players.length >= session.minPlayers &&
    session.players.every((player) => player.isReady)

  if (
    !allPlayersReady ||
    session.status !== MonopolyGameSessionStatus.WAITING
  ) {
    return {
      session,
      statusChanged: false,
    }
  }

  const players = await prisma.monopolyGameSessionPlayer.findMany({
    where: {
      sessionId,
    },
    select: {
      id: true,
      userId: true,
    },
    orderBy: {
      joinedAt: 'asc',
    },
  })

  if (!players.length) {
    return {
      session,
      statusChanged: false,
    }
  }

  const startedAt = new Date()
  const playersInRandomOrder = shufflePlayers(players)

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      playersInRandomOrder.map((player, index) =>
        tx.monopolyGameSessionPlayer.update({
          where: {
            id: player.id,
          },
          data: {
            orderIndex: index,
          },
        }),
      ),
    )

    await tx.monopolyGameSession.update({
      where: {
        id: sessionId,
      },
      data: {
        status: MonopolyGameSessionStatus.ACTIVE,
        startedAt,
        currentMovePlayerId: playersInRandomOrder[0].userId,
        currentTypeMove: MonopolyMoveType.DICE_ROLL_ON_THE_MOVE,
      },
    })
  })

  const updatedSession = await fetchSessionSnapshot(sessionId)

  monopolyGateway.sendStateUpdated(sessionId, updatedSession)

  return {
    session: updatedSession,
    statusChanged: true,
  }
}
