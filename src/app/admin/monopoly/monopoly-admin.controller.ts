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
import { MonopolyAdminService } from './monopoly-admin.service'
import { CreateMonopolyFormDto } from './dto/create-monopoly-form.dto'
import { CreateMonopolyFigurineDto } from './dto/monopoly-create-figurine.dto'
import { CreateMonopolyPlayerColorDto } from './dto/monopoly-create-player-color.dto'

@Controller()
export class MonopolyAdminController {
  public constructor(
    private readonly monopolyAdminService: MonopolyAdminService,
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
    return this.monopolyAdminService.allSessions()
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Delete('session/:id')
  @HttpCode(HttpStatus.OK)
  public async deleteSession(@Param('id') id: string): Promise<boolean> {
    return this.monopolyAdminService.deleteSession(id)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Post('session/:id/reset')
  @HttpCode(HttpStatus.OK)
  public async resetSession(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    return this.monopolyAdminService.resetSession(id, req)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('player-colors')
  @HttpCode(HttpStatus.OK)
  public async allPlayerColors(): Promise<
    { id: string; name: string; hexCode: string }[]
  > {
    return this.monopolyAdminService.allPlayerColors()
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Post('player-color/create')
  @HttpCode(HttpStatus.OK)
  public async createPlayerColor(
    @Body() dto: CreateMonopolyPlayerColorDto,
  ): Promise<{ id: string }> {
    return this.monopolyAdminService.createPlayerColor(dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Delete('player-color/:id')
  @HttpCode(HttpStatus.OK)
  public async deletePlayerColor(@Param('id') id: string): Promise<boolean> {
    return this.monopolyAdminService.deletePlayerColor(id)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('figurine/:id')
  @HttpCode(HttpStatus.OK)
  public async findByIdFigurine(@Param('id') id: string): Promise<{
    id: string
    name: string
    url: string
    collectionId?: string | null
  }> {
    return this.monopolyAdminService.findFigurineById(id)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('figurines')
  @HttpCode(HttpStatus.OK)
  public async allFigurines(): Promise<
    { id: string; name: string; url: string; collectionId?: string | null }[]
  > {
    return this.monopolyAdminService.allFigurines()
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('figurine-collections')
  @HttpCode(HttpStatus.OK)
  public async allCollections() {
    return this.monopolyAdminService.allCollections()
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('figurine-collection/:id')
  @HttpCode(HttpStatus.OK)
  public async findCollectionById(@Param('id') id: string) {
    return this.monopolyAdminService.findCollectionById(id)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Post('figurine-collection/create')
  @HttpCode(HttpStatus.OK)
  public async createCollection(
    @Body() dto: { name: string; figurineIds: string[] },
  ) {
    return this.monopolyAdminService.createCollection(dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Patch('figurine-collection/:id')
  @HttpCode(HttpStatus.OK)
  public async updateCollection(
    @Param('id') id: string,
    @Body() dto: { name: string; figurineIds: string[] },
  ) {
    return this.monopolyAdminService.updateCollection(id, dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Delete('figurine-collection/:id')
  @HttpCode(HttpStatus.OK)
  public async deleteCollection(@Param('id') id: string) {
    return this.monopolyAdminService.deleteCollection(id)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Patch('figurine/:id')
  @HttpCode(HttpStatus.OK)
  public async updateFigurine(
    @Param('id') id: string,
    @Body()
    dto: { name: string; url: string; collectionId?: string },
  ): Promise<boolean> {
    return this.monopolyAdminService.updateFigurine(id, dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Post('figurine/create')
  @HttpCode(HttpStatus.OK)
  public async createFigurine(
    @Body() dto: CreateMonopolyFigurineDto,
  ): Promise<boolean> {
    return this.monopolyAdminService.createFigurine(dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Post('form')
  @HttpCode(HttpStatus.OK)
  public async createForm(
    @Body() dto: CreateMonopolyFormDto,
  ): Promise<{ id: string }> {
    return this.monopolyAdminService.createForm(dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('forms')
  @HttpCode(HttpStatus.OK)
  public async findAllForms(): Promise<{ id: string; name: string }[]> {
    return this.monopolyAdminService.findAllForms()
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('form/:id')
  @HttpCode(HttpStatus.OK)
  public async findFormById(@Param('id') id: string) {
    return this.monopolyAdminService.findFormById(id)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Patch('form/:id')
  @HttpCode(HttpStatus.OK)
  public async updateForm(
    @Param('id') id: string,
    @Body() dto: CreateMonopolyFormDto,
  ): Promise<{ id: string }> {
    return this.monopolyAdminService.updateForm(id, dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Patch('form/:id/public')
  @HttpCode(HttpStatus.OK)
  public async updateFormPublic(
    @Param('id') id: string,
    @Body() dto: { isPublic: boolean },
  ): Promise<{ id: string }> {
    return this.monopolyAdminService.updateFormPublic(id, dto.isPublic)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Delete('form/:id')
  @HttpCode(HttpStatus.OK)
  public async deleteForm(@Param('id') id: string): Promise<boolean> {
    return this.monopolyAdminService.deleteForm(id)
  }
}
