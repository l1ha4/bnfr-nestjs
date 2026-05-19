import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from '@prisma/client'
import { ROLES_KEY } from '../decorators/role.decorators'

@Injectable()
export class RolesGuard implements CanActivate {
  public constructor(private readonly reflector: Reflector) {}

  private getRoleLevel(role: UserRole): number {
    switch (role) {
      case UserRole.OWNER:
        return 2
      case UserRole.ADMIN:
        return 1
      default:
        return 0
    }
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const request = context.switchToHttp().getRequest()

    if (!roles) return true

    if (!request.user?.role) {
      throw new ForbiddenException('Роль пользователя не определена.')
    }

    const currentRoleLevel = this.getRoleLevel(request.user.role)
    const requiredRoleLevel = Math.min(
      ...roles.map((role) => this.getRoleLevel(role)),
    )

    if (currentRoleLevel < requiredRoleLevel) {
      throw new ForbiddenException('У вас нет доступа к этому ресурсу.')
    }

    return true
  }
}
