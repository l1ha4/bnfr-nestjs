import { Injectable, NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import { PrismaService } from '@/core/prisma/prisma.service'
import { CreateSessionDto } from '../../api/dto/create-session.dto'
import { UpdatePlayerReadyDto } from '../../api/dto/update-player-ready.dto'
import { MonopolyWebsocketGateway } from '../../websocket/monopoly-websocket.gateway'
import { ColorManager } from './connection/color/color.manager'
import { FigurinesManager } from './connection/figurines/figurines.manager'
import { ConnectionPlayerManager } from './connection/connectionPlayer/connection-player.manager'
import { PlayerReadyManager } from './connection/playerReady/player-ready.manager'
import { CreateSessionManager } from './createSession/create-session.manager'

@Injectable()
export class SessionManager {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly monopolyGateway: MonopolyWebsocketGateway,
    private readonly createSessionManager: CreateSessionManager,
    private readonly connectionPlayerManager: ConnectionPlayerManager,
    private readonly playerReadyManager: PlayerReadyManager,
    private readonly colorManager: ColorManager,
    private readonly figurinesManager: FigurinesManager,
  ) {}

  public async findSessionById(id: string) {
    return this.playerReadyManager.findSessionById(id)
  }

  public async getFigurineCollections() {
    return this.figurinesManager.getFigurineCollections()
  }

  public async getCollectionFigurines(collectionId: string) {
    return this.figurinesManager.getCollectionFigurines(collectionId)
  }

  public async getPlayerColors() {
    return this.colorManager.getPlayerColors()
  }

  public async createSession(createSessionDto: CreateSessionDto, req: Request) {
    return this.createSessionManager.createSession(createSessionDto, req)
  }

  public async deleteSession(id: string) {
    const result = await this.prisma.monopolyGameSession.deleteMany({
      where: { id },
    })

    if (result.count === 0) {
      throw new NotFoundException('Сессия не найдена')
    }

    this.monopolyGateway.sendSessionDeleted(id)

    return true
  }

  public exitSession(id: string, req: Request) {
    return this.prisma.monopolyGameSessionPlayer.deleteMany({
      where: { sessionId: id, userId: req.session.userId },
    })
  }

  public async connectToSession(id: string, req: Request) {
    return this.connectionPlayerManager.connectToSession(id, req)
  }

  public async readyPlayer(
    id: string,
    dto: UpdatePlayerReadyDto,
    req: Request,
  ) {
    return this.playerReadyManager.readyPlayer(id, dto, req)
  }
}
