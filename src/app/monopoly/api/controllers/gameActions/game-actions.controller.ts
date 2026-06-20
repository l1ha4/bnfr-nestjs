import { Controller, Param, Post, Req } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { MonopolyService } from '../../monopoly.service'
import { Authorization } from '../../../../auth/decorators/auth.decorators'
import { MONOPOLY_API_PREFIX } from '../../config/monopolyApi.config'
import type { Request } from 'express'

@Controller(MONOPOLY_API_PREFIX)
export class GameActionsController {
  constructor(private readonly monopolyService: MonopolyService) {}

  @Authorization()
  @Post('session/:sessionId/roll-turn')
  rollTurn(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.monopolyService.rollTurn(sessionId, req)
  }

  @Authorization()
  @Post('session/:sessionId/buy-street/:cellId')
  buyStreet(
    @Param('sessionId') sessionId: string,
    @Param('cellId') cellId: string,
    @Req() req: Request,
  ) {
    return this.monopolyService.buyStreet(sessionId, cellId, req)
  }

  @Authorization(UserRole.ADMIN)
  @Post('session/:sessionId/reset')
  resetSession(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.monopolyService.resetSession(sessionId, req)
  }
}
