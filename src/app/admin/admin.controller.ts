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

@Controller()
export class AdminController {
  constructor(private readonly ownerControlService: OwnerControlService) {}

  @Authorization(UserRole.OWNER)
  @Post('reset-admin-password/:id')
  @HttpCode(HttpStatus.OK)
  async resetPasswordAdmin(@Param('id') id: string, @Body() dto: ResetPasswordDto): Promise<boolean> {
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

  @Authorization(UserRole.OWNER)
  @Delete('delete-admin/:userId')
  @HttpCode(HttpStatus.OK)
  async deleteAdminUser(@Param('userId') userId: string): Promise<boolean> {
    return this.ownerControlService.deleteAdminUser(userId)
  }
}
