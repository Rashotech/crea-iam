import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ExceptionHelper } from 'src/common/helpers/error-handler';
import { UsersService } from '../users/users.service';
import { RegisterUserDto } from './dto';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
  ) {}
  
  async register(registerUserDto: RegisterUserDto) {
    try {
       // Check if user exists
      const existingUser = await this.usersService.findUser(registerUserDto);
      
      if (existingUser) {
        throw new ConflictException('Username or email already exists');
      }

      const newUser = await this.usersService.createUser(registerUserDto);
      const { passwordHash, ...userWithoutPassword } = newUser;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error(error);
      ExceptionHelper.handleException(error);
    }
  }
}
