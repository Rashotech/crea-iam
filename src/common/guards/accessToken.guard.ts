import { ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt') {
  private roles: string[] = [];

  constructor(
    private readonly reflector: Reflector
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    try {
      const roles = this.reflector.get(ROLES_KEY, context.getHandler());
      if(roles) {
        context.switchToHttp().getRequest().roles = roles;
        this.roles = roles;
      }
      
      return super.canActivate(context);
    } catch (error) {
      return false;
    }
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    if (this.roles.length === 0) {
      return user;
    }

    const isAllowed = this.roles.some(role => user.roles?.includes(role));

    if (!isAllowed) {
      throw new ForbiddenException('You do not have sufficient permissions to access this resource.');
    }

    return user;
  }
}
