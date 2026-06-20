import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../websocket/monopoly-websocket.gateway'

type CreateSystemChatMessageParams = {
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  sessionId: string
  content: string
  userId?: string | null
  userName?: string | null
}

export const createSystemChatMessage = async ({
  prisma,
  monopolyGateway,
  sessionId,
  content,
  userId = null,
  userName = null,
}: CreateSystemChatMessageParams) => {
  const trimmedContent = content.trim()

  if (!trimmedContent) {
    return null
  }

  const message = await prisma.monopolyGameSessionChatMessage.create({
    data: {
      sessionId,
      userId,
      isSystemMessage: true,
      content: trimmedContent,
    },
    select: {
      id: true,
      sessionId: true,
      userId: true,
      content: true,
      isSystemMessage: true,
      createdAt: true,
    },
  })

  const payload = {
    id: message.id,
    sessionId: message.sessionId,
    userId: message.userId,
    userName,
    content: message.content,
    isSystemMessage: message.isSystemMessage,
    createdAt: message.createdAt,
  }

  monopolyGateway.sendChatMessageCreated(sessionId, payload)

  return payload
}
