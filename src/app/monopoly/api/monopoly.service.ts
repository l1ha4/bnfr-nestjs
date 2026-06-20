import { Injectable } from '@nestjs/common'
import { CreateSessionDto } from './dto/create-session.dto'
import { UpdatePlayerReadyDto } from './dto/update-player-ready.dto'
import type { Request } from 'express'
import { ListSessionManager } from '../manager/listSession/list-session.manager'
import { SessionManager } from '../manager/session/session.manager'
import { TemplateManager } from '../manager/template/template.manager'

@Injectable()
export class MonopolyService {
  public constructor(
    private readonly listSessionManager: ListSessionManager,
    private readonly sessionManager: SessionManager,
    private readonly templateManager: TemplateManager,
  ) {}

  getListSessions() {
    return this.listSessionManager.getListSessions()
  }

  getCurrentSession(req: Request) {
    return this.sessionManager.getCurrentSession(req)
  }

  findAllPubicTemplate() {
    return this.templateManager.findAllPubicTemplate()
  }

  async findSessionById(id: string) {
    return this.sessionManager.findSessionById(id)
  }

  async getSessionChatHistory(sessionId: string) {
    return this.sessionManager.getSessionChatHistory(sessionId)
  }

  async createSessionChatMessage(
    sessionId: string,
    content: string,
    req: Request,
  ) {
    return this.sessionManager.createSessionChatMessage(sessionId, content, req)
  }

  async getFigurineCollections() {
    return this.sessionManager.getFigurineCollections()
  }

  async getCollectionFigurines(collectionId: string) {
    return this.sessionManager.getCollectionFigurines(collectionId)
  }

  async getPlayerColors() {
    return this.sessionManager.getPlayerColors()
  }

  async createSession(createSessionDto: CreateSessionDto, req: Request) {
    return this.sessionManager.createSession(createSessionDto, req)
  }

  async deleteSession(id: string) {
    return this.sessionManager.deleteSession(id)
  }

  async exitSession(id: string, req: Request) {
    return this.sessionManager.exitSession(id, req)
  }

  async connectToSession(id: string, req: Request) {
    return this.sessionManager.connectToSession(id, req)
  }

  async readyPlayer(id: string, dto: UpdatePlayerReadyDto, req: Request) {
    return this.sessionManager.readyPlayer(id, dto, req)
  }

  async rollTurn(id: string, req: Request) {
    return this.sessionManager.rollTurn(id, req)
  }

  async buyStreet(id: string, cellId: string, req: Request) {
    return this.sessionManager.buyStreet(id, cellId, req)
  }

  async refusePurchase(id: string, req: Request) {
    return this.sessionManager.refusePurchase(id, req)
  }

  async payRent(id: string, req: Request) {
    return this.sessionManager.payRent(id, req)
  }

  async raiseAuctionBid(
    id: string,
    auctionId: string,
    price: number,
    req: Request,
  ) {
    return this.sessionManager.raiseAuctionBid(id, auctionId, price, req)
  }

  async declineAuction(id: string, auctionId: string, req: Request) {
    return this.sessionManager.declineAuction(id, auctionId, req)
  }

  async resetSession(id: string, req: Request) {
    return this.sessionManager.resetSession(id, req)
  }
}
