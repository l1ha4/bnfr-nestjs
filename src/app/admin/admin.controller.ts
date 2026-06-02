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
import { OwnerControlService } from './owner/owner-control.service'
import { CreateUserDto } from '../user/dto/createUser.dto'
import { Authorization } from '../auth/decorators/auth.decorators'
import { UserRole } from '@prisma/client'
import { ResetPasswordDto } from './owner/dto/resetPassword.dto'
import { UpdateRegistrationSettingsDto } from './owner/dto/updateRegistrationSettings.dto'
import { AdminService } from './admin.service'

@Controller()
export class AdminController {
  constructor(
    private readonly ownerControlService: OwnerControlService,
    private readonly adminService: AdminService,
  ) {}

  @Get('get-settings-auth-user')
  @HttpCode(HttpStatus.OK)
  async getSettingsAuthUser(): Promise<UpdateRegistrationSettingsDto> {
    return this.ownerControlService.getSettingsAuthUser()
  }

  @Authorization(UserRole.OWNER)
  @Post('set-settings-auth-user')
  @HttpCode(HttpStatus.OK)
  async setSettingsAuthUser(
    @Body() dto: UpdateRegistrationSettingsDto,
  ): Promise<void> {
    await this.ownerControlService.setSettingsAuthUser(dto)
  }

  @Authorization(UserRole.OWNER)
  @Post('reset-admin-password/:id')
  @HttpCode(HttpStatus.OK)
  async resetPasswordAdmin(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<boolean> {
    return this.ownerControlService.resetPasswordAdmin(id, dto)
  }

  @Authorization(UserRole.OWNER)
  @Post('reset-owner-password')
  @HttpCode(HttpStatus.OK)
  async resetPasswordOwner(@Body() dto: ResetPasswordDto): Promise<boolean> {
    return this.ownerControlService.resetPasswordOwner(dto)
  }

  @Authorization(UserRole.OWNER)
  @Get('all-admins')
  @HttpCode(HttpStatus.OK)
  async findAllAdmins(): Promise<
    { id: string; displayName: string; email: string }[]
  > {
    return this.ownerControlService.findAllAdmins()
  }

  @Authorization(UserRole.OWNER)
  @Post('create-admin')
  @HttpCode(HttpStatus.OK)
  async createAdminUser(@Body() dto: CreateUserDto): Promise<boolean> {
    return this.ownerControlService.createAdminUser(dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Post('create-user')
  @HttpCode(HttpStatus.OK)
  async createUser(@Body() dto: CreateUserDto): Promise<boolean> {
    return this.adminService.createUser(dto)
  }

  @Authorization(UserRole.OWNER)
  @Delete('delete-admin/:userId')
  @HttpCode(HttpStatus.OK)
  async deleteAdminUser(@Param('userId') userId: string): Promise<boolean> {
    return this.ownerControlService.deleteAdminUser(userId)
  }
}
