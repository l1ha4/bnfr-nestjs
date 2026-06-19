import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common'
import { MonopolyService } from '../../monopoly.service'
import { Authorization } from '../../../../auth/decorators/auth.decorators'
import { UpdatePlayerReadyDto } from '../../dto/update-player-ready.dto'
import type { Request } from 'express'
import { MONOPOLY_API_PREFIX } from '../../config/monopolyApi.config'

@Controller(MONOPOLY_API_PREFIX)
export class SessionController {
  constructor(private readonly monopolyService: MonopolyService) {}

  @Authorization()
  @Post('session/:sessionId/add-player')
  connectToSession(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.monopolyService.connectToSession(sessionId, req)
  }

  @Authorization()
  @Post('session/:sessionId/ready')
  readyPlayer(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdatePlayerReadyDto,
    @Req() req: Request,
  ) {
    return this.monopolyService.readyPlayer(sessionId, dto, req)
  }

  @Authorization()
  @Get('session/current')
  getCurrentSession(@Req() req: Request) {
    return this.monopolyService.getCurrentSession(req)
  }

  @Authorization()
  @Get('session/:id')
  findSessionById(@Param('id') id: string) {
    return this.monopolyService.findSessionById(id)
  }

  @Authorization()
  @Delete('session/:sessionId/exit')
  exitSession(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.monopolyService.exitSession(sessionId, req)
  }
}
