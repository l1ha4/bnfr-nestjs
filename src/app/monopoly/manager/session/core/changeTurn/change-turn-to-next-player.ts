import { MonopolyMoveType } from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../websocket/monopoly-websocket.gateway'
import { createSystemChatMessage } from '../chat/create-system-chat-message'

type ChangeTurnToNextPlayerParams = {
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  sessionId: string
  currentMovePlayerId: string | null
}

export const changeTurnToNextPlayer = async ({
  prisma,
  monopolyGateway,
  sessionId,
  currentMovePlayerId,
}: ChangeTurnToNextPlayerParams) => {
  const players = await prisma.monopolyGameSessionPlayer.findMany({
    where: {
      sessionId,
      isBankrupt: false,
    },
    orderBy: [
      {
        orderIndex: 'asc',
      },
      {
        joinedAt: 'asc',
      },
    ],
    select: {
      userId: true,
    },
  })

  if (!players.length) {
    await prisma.monopolyGameSession.update({
      where: {
        id: sessionId,
      },
      data: {
        currentMovePlayerId: null,
        currentTypeMove: MonopolyMoveType.NULL,
      },
    })

    return null
  }

  const currentIndex = players.findIndex(
    (player) => player.userId === currentMovePlayerId,
  )

  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % players.length
  const nextPlayer = players[nextIndex]

  const shouldIncreaseRound =
    currentIndex >= 0 && nextIndex === 0 && players.length > 1

  await prisma.monopolyGameSession.update({
    where: {
      id: sessionId,
    },
    data: {
      currentMovePlayerId: nextPlayer.userId,
      currentTypeMove: MonopolyMoveType.DICE_ROLL_ON_THE_MOVE,
      ...(shouldIncreaseRound
        ? {
            currentRound: {
              increment: 1,
            },
          }
        : {}),
    },
  })

  const nextPlayerUser = await prisma.user.findUnique({
    where: {
      id: nextPlayer.userId,
    },
    select: {
      displayName: true,
    },
  })

  const nextPlayerName = nextPlayerUser?.displayName ?? 'Игрок'

  await createSystemChatMessage({
    prisma,
    monopolyGateway,
    sessionId,
    userId: nextPlayer.userId,
    userName: nextPlayerName,
    content: `Ход перешел к игроку ${nextPlayerName}`,
  })

  return {
    nextPlayerUserId: nextPlayer.userId,
    roundIncreased: shouldIncreaseRound,
  }
}
