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
import { CreateMonopolyFormDto } from '../../dto/create-monopoly-form.dto'
import { MonopolyTemplateCrudManagerService } from '../../manager/template/monopoly-template.manager.service'

@Controller()
export class MonopolyAdminTemplateController {
  public constructor(
    private readonly templateManager: MonopolyTemplateCrudManagerService,
  ) {}

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Post('form')
  @HttpCode(HttpStatus.OK)
  public async createForm(
    @Body() dto: CreateMonopolyFormDto,
  ): Promise<{ id: string }> {
    return this.templateManager.createForm(dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('forms')
  @HttpCode(HttpStatus.OK)
  public async findAllForms(): Promise<{ id: string; name: string }[]> {
    return this.templateManager.findAllForms()
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('form/:id')
  @HttpCode(HttpStatus.OK)
  public async findFormById(@Param('id') id: string) {
    return this.templateManager.findFormById(id)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Patch('form/:id')
  @HttpCode(HttpStatus.OK)
  public async updateForm(
    @Param('id') id: string,
    @Body() dto: CreateMonopolyFormDto,
  ): Promise<{ id: string }> {
    return this.templateManager.updateForm(id, dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Patch('form/:id/public')
  @HttpCode(HttpStatus.OK)
  public async updateFormPublic(
    @Param('id') id: string,
    @Body() dto: { isPublic: boolean },
  ): Promise<{ id: string }> {
    return this.templateManager.updateFormPublic(id, dto.isPublic)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Delete('form/:id')
  @HttpCode(HttpStatus.OK)
  public async deleteForm(@Param('id') id: string): Promise<boolean> {
    return this.templateManager.deleteForm(id)
  }
}
