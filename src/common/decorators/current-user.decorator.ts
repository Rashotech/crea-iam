import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ICurrentUser } from 'src/modules/auth/interfaces';

export const getCurrentUserByContext = (
  context: ExecutionContext,
): ICurrentUser | undefined => {
  const request = context.switchToHttp().getRequest();
  return request.isAuthenticated() ? request.user : undefined;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    getCurrentUserByContext(context),
);
