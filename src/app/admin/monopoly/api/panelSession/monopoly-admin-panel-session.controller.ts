import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common'
import type { Request } from 'express'
import { UserRole } from '@prisma/client'
import { Authorization } from '@/app/auth/decorators/auth.decorators'
import { MonopolyPanelSessionManagerService } from '../../manager/panelSession/monopoly-panel-session.manager.service'
import { UpdateSessionPlayerMonopolyDto } from '../../dto/update-session-player-monopoly.dto'

@Controller()
export class MonopolyAdminPanelSessionController {
  public constructor(
    private readonly panelSessionManager: MonopolyPanelSessionManagerService,
  ) {}

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  public async allSessions(): Promise<
    {
      id: string
      name: string
      status: string
      templateName: string
      countPlayers: number
    }[]
  > {
    return this.panelSessionManager.allSessions()
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Delete('session/:id')
  @HttpCode(HttpStatus.OK)
  public async deleteSession(@Param('id') id: string): Promise<boolean> {
    return this.panelSessionManager.deleteSession(id)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Post('session/:id/reset')
  @HttpCode(HttpStatus.OK)
  public async resetSession(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    return this.panelSessionManager.resetSession(id, req)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('session/:id')
  @HttpCode(HttpStatus.OK)
  public async sessionById(@Param('id') id: string): Promise<{
    id: string
    name: string
    status: string
    templateName: string
    players: Array<{
      id: string
      userId: string
      displayName: string
      money: number
      ownedStreetCellTemplateIds: string[]
    }>
    streets: Array<{
      id: string
      name: string
      orderIndex: number
      ownerUserId: string | null
    }>
  }> {
    return this.panelSessionManager.sessionById(id)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Patch('session/:id/player/:userId')
  @HttpCode(HttpStatus.OK)
  public async updateSessionPlayer(
    @Param('id') sessionId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateSessionPlayerMonopolyDto,
  ): Promise<{ success: boolean }> {
    return this.panelSessionManager.updateSessionPlayer(sessionId, userId, dto)
  }
}
