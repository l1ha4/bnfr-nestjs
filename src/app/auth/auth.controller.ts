import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { Authorization } from './decorators/auth.decorators'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { UserRole } from '@prisma/client'
import type { Request, Response } from 'express'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Authorization(UserRole.ADMIN)
  @Post('register')
  @HttpCode(HttpStatus.OK)
  public async register(@Req() req: Request, @Body() dto: RegisterDto) {
    return this.authService.register(req, dto)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  public async login(@Req() req: Request, @Body() dto: LoginDto) {
    return this.authService.login(req, dto)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  public async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(req, res)
  }
}
