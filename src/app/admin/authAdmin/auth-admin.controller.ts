import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import { AuthAdminService } from './auth-admin.service'
import type { Request, Response } from 'express'
import { LoginDto } from '../../auth/dto/login.dto'
import { Authorization } from '@/app/auth/decorators/auth.decorators'
import { User } from 'discord.js'
import { UserRole } from '@prisma/client'

@Controller('auth-admin')
export class AuthAdminController {
  public constructor(private readonly authAdminService: AuthAdminService) {}

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  public async getProfile(@Req() req: Request) {
    const userId = req.session.userId

    if (!userId) {
      throw new UnauthorizedException('Пользователь не авторизован')
    }

    return this.authAdminService.findByIdAdmin(userId)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  public async loginAdmin(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authAdminService.loginAdmin(req, dto)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  public async logoutAdmin(@Req() req: Request): Promise<boolean> {
    return this.authAdminService.logoutAdmin(req)
  }

  @Post('clear-session')
  @HttpCode(HttpStatus.OK)
  public clearSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authAdminService.clearSessionAdmin(req, res)
  }
}
