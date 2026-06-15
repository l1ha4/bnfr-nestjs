import { ConflictException, Injectable } from '@nestjs/common'
import type { Request } from 'express'
import { PrismaService } from '@/core/prisma/prisma.service'
import { CreateSessionDto } from '../../../api/dto/create-session.dto'
import { MonopolyWebsocketGateway } from '../../../websocket/monopoly-websocket.gateway'
import { ConnectionPlayerManager } from '../connection/connectionPlayer/connection-player.manager'

@Injectable()
export class CreateSessionManager {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly monopolyGateway: MonopolyWebsocketGateway,
    private readonly connectionPlayerManager: ConnectionPlayerManager,
  ) {}

  public async createSession(createSessionDto: CreateSessionDto, req: Request) {
    const userId = req.session.userId

    const userSessionsCount = await this.prisma.monopolyGameSessionPlayer.count(
      {
        where: { userId },
      },
    )

    if (userSessionsCount >= 1) {
      throw new ConflictException('Пользователь уже участвует в сессии')
    }

    const template = await this.prisma.monopolyGameTemplate.findUniqueOrThrow({
      where: { id: createSessionDto.templateId },
      select: {
        minPlayers: true,
        maxPlayers: true,
      },
    })

    const session = await this.prisma.monopolyGameSession.create({
      data: {
        name: createSessionDto.name,
        minPlayers: template.minPlayers,
        maxPlayers: template.maxPlayers,
        template: {
          connect: { id: createSessionDto.templateId },
        },
        createdById: userId,
      },
    })

    this.monopolyGateway.sendSessionCreated({
      id: session.id,
      name: session.name,
      minPlayers: session.minPlayers,
      maxPlayers: session.maxPlayers,
      templateId: session.templateId,
    })

    await this.connectionPlayerManager.connectToSession(session.id, req)

    return { id: session.id }
  }
}
