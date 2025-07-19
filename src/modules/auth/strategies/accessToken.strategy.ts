import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/modules/users/users.service';
import { JwtPayload } from '../interfaces';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly usersService: UsersService,
  ) {

    const jwtSecret = process.env.JWT_ACCESS_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_ACCESS_SECRET environment variable is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.validateUser(payload.email);
    return user;
  }
}
