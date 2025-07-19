import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ExceptionHelper } from 'src/common/helpers/error-handler';
import { UsersService } from '../users/users.service';
import { LoginUserDto, RegisterUserDto } from './dto';
import { ConfigService } from '@nestjs/config';
import { excludeSensitiveUserData } from 'src/common/helpers/utils';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
  
  async register(registerUserDto: RegisterUserDto) {
    try {
       // Check if user exists
      const existingUser = await this.usersService.findUser(registerUserDto);
      
      if (existingUser) {
        throw new ConflictException('Username or email already exists');
      }

      const newUser = await this.usersService.createUser(registerUserDto);
      return excludeSensitiveUserData(newUser);
    } catch (error) {
      this.logger.error(error);
      ExceptionHelper.handleException(error);
    }
  }

  async login(loginUserDto: LoginUserDto) {
    try {
       // Check if user exists
      const existingUser = await this.usersService.validateUser(loginUserDto.userId);
      
      if (!existingUser) {
        throw new BadRequestException('Invalid username or password');
      }

      const isPasswordValid = await bcrypt.compare(loginUserDto.password, existingUser.passwordHash);
      if (!isPasswordValid) {
        throw new BadRequestException('Invalid username or password');
      }

      const tokens = await this.getTokens(existingUser.id.toString(), existingUser.email);
      await this.updateRefreshToken(existingUser.id.toString(), tokens.refreshToken);

      return { user: excludeSensitiveUserData(existingUser), tokens };
     
    } catch (error) {
      this.logger.error(error);
      ExceptionHelper.handleException(error);
    }
  }

  async getTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('jwtSettings.accessSecret'),
          expiresIn: `${this.configService.get<number>('jwtSettings.accessExpirationMinutes')}m`,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('jwtSettings.refreshSecret'),
          expiresIn: `${this.configService.get<number>('jwtSettings.refreshExpirationDays')}d`,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

   async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await this.hashData(refreshToken);
    return await this.usersService.updateUser(userId, {
      refreshToken: hashedRefreshToken,
      lastLoginAt: new Date()
    });
  }

  private hashData(data: string) {
    return bcrypt.hash(data, 10);
  }


  async logout(userId: string) {
    this.usersService.updateUser(userId, { refreshToken: undefined });
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findUserById(userId);

    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access Denied');

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(userId, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }
}
