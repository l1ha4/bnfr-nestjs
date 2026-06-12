import { Injectable } from '@nestjs/common'
import { CreateSessionDto } from './dto/create-session.dto'
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

  findAllPubicTemplate() {
    return this.templateManager.findAllPubicTemplate()
  }

  async findSessionById(id: string) {
    return this.sessionManager.findSessionById(id)
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
}
