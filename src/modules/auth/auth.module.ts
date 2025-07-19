import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [JwtModule.register({}), ConfigModule, UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService
  ],
  exports: [AuthService],
})
export class AuthModule {}
