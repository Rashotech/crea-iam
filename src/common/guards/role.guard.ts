import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { getCurrentUserByContext } from '../decorators/current-user.decorator';
import { getRoles } from '../decorators/roles.decorator';
import { UserRole } from 'src/modules/users/enums';
import { ICurrentUser } from 'src/modules/auth/interfaces';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const user: ICurrentUser | undefined = getCurrentUserByContext(context);
    if (!user) throw new UnauthorizedException();
    const roles = getRoles(context, this.reflector);
    if (!roles) return true;
    return user.roles?.some((role: UserRole) => roles.includes(role));
  }
}
