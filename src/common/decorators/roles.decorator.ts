import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/modules/users/enums';

export const ROLES_KEY = 'roles';

export const getRoles = (
  context: ExecutionContext,
  reflector: Reflector,
): UserRole[] | undefined => reflector.get(ROLES_KEY, context.getHandler());

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
