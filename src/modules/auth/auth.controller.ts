import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { SuccessResponse } from "src/common/helpers/SuccessResponse";
import { LoginUserDto, RegisterUserDto } from "./dto";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { ICurrentUser } from "./interfaces";
import { AccessTokenGuard } from "src/common/guards";
import { excludeSensitiveUserData } from "src/common/helpers/utils";

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(201)
  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    const response = await this.authService.register(registerUserDto);
    return new SuccessResponse(
      'Registration Successful',
      response,
    );
  }

  @HttpCode(200)
  @Post('login')
  async login(@Body() data: LoginUserDto) {
    const response = await this.authService.login(data);
    return new SuccessResponse('Login Successful', response);
  }

  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  @Get('profile')
  async profile(@CurrentUser() user: ICurrentUser) {
    return new SuccessResponse('Profile Retrieved Successfully', excludeSensitiveUserData(user));
  }
}