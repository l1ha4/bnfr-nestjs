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
} from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { Authorization } from '@/app/auth/decorators/auth.decorators'
import { MonopolyAdminService } from './monopoly-admin.service'
import { CreateMonopolyFormDto } from './dto/create-monopoly-form.dto'

@Controller()
export class MonopolyAdminController {
  public constructor(
    private readonly monopolyAdminService: MonopolyAdminService,
  ) {}

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
  @Delete('form/:id')
  @HttpCode(HttpStatus.OK)
  public async deleteForm(@Param('id') id: string): Promise<boolean> {
    return this.monopolyAdminService.deleteForm(id)
  }
}
