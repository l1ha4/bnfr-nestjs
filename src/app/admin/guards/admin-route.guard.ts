import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { Request } from 'express'
import { UserService } from '@/app/user/user.service'


@Injectable()
export class AdminRouteGuard implements CanActivate {
  public constructor(private readonly userService: UserService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()

    const isAdminRoute = request.path.startsWith('/admin')

    if (!isAdminRoute) {
      return true
    }

    const sessionUserId = request.session?.userId

    if (!sessionUserId) {
      throw new UnauthorizedException('Пользователь не авторизован')
    }

    const user = request.user ?? (await this.userService.findById(sessionUserId))

    if (!user) {
      throw new UnauthorizedException('Пользователь не авторизован')
    }

    request.user = user

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Недостаточно прав')
    }

    return true
  }
}