import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common'
import type { Request } from 'express'
import { UserRole } from '@prisma/client'
import { Authorization } from '@/app/auth/decorators/auth.decorators'
import { MonopolyPanelSessionManagerService } from '../../manager/panelSession/monopoly-panel-session.manager.service'

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
}
