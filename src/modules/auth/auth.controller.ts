import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { SuccessResponse } from "src/common/helpers/SuccessResponse";
import { LoginUserDto, RegisterUserDto } from "./dto";

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
}