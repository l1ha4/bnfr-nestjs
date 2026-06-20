import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { Authorization } from '@/app/auth/decorators/auth.decorators'
import { CreateMonopolyPlayerColorDto } from '../../dto/monopoly-create-player-color.dto'
import { MonopolyColorsManagerService } from '../../manager/colors/monopoly-colors.manager.service'

@Controller()
export class MonopolyAdminColorsController {
  public constructor(
    private readonly colorsManager: MonopolyColorsManagerService,
  ) {}

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('player-colors')
  @HttpCode(HttpStatus.OK)
  public async allPlayerColors(): Promise<
    { id: string; name: string; hexCode: string }[]
  > {
    return this.colorsManager.allPlayerColors()
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Post('player-color/create')
  @HttpCode(HttpStatus.OK)
  public async createPlayerColor(
    @Body() dto: CreateMonopolyPlayerColorDto,
  ): Promise<{ id: string }> {
    return this.colorsManager.createPlayerColor(dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Delete('player-color/:id')
  @HttpCode(HttpStatus.OK)
  public async deletePlayerColor(@Param('id') id: string): Promise<boolean> {
    return this.colorsManager.deletePlayerColor(id)
  }
}
