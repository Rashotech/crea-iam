import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_REFRESH_SECRET ?? (() => { throw new Error('JWT_REFRESH_SECRET is not defined'); })(),
      passReqToCallback: true,
    };
    super(options);
  }

  validate(req: Request, payload: any) {
    const authHeader = req.get('Authorization');
    const refreshToken = authHeader ? authHeader.replace('Bearer', '').trim() : undefined;
    return { ...payload, refreshToken };
  }
}
