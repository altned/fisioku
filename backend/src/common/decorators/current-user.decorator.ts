import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ActiveUserData } from '../../auth/interfaces/active-user-data.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ActiveUserData => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as ActiveUserData;
  },
);
