import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'
import { UserService } from './user.service'
import { Authorization } from '../auth/decorators/auth.decorators'
import { Authorized } from '../auth/decorators/authorized.decorators'
import { UserRole } from '@prisma/client'

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Get('profile')
  public async findProfile(@Authorized('id') userId: string) {
    return this.userService.findById(userId)
  }

  @Authorization(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get('by-id/:id')
  public async findById(@Authorized('id') userId: string) {
    return this.userService.findById(userId)
  }
}
