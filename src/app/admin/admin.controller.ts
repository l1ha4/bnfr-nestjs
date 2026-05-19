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
import { AdminService } from './admin.service'

@Controller()
export class AdminController {
  constructor(
    private readonly ownerControlService: OwnerControlService,
    private readonly adminService: AdminService,
  ) {}

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
