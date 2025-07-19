import { Controller, Get, HttpCode, Query, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { AccessTokenGuard } from "src/common/guards";
import { CurrentUser, Roles } from "src/common/decorators";
import { UserRole } from "./enums";
import { ICurrentUser } from "../auth/interfaces";
import { SuccessResponse } from "src/common/helpers/SuccessResponse";
import { GetUsersDto } from "./dto";

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async getAllUsers(@Query() query: GetUsersDto) {
    const users = await this.usersService.getAllUsers(query);
    return new SuccessResponse('Users fetched Successfully', users);
  }
}