import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { AccessTokenGuard } from "src/common/guards";
import { Roles } from "src/common/decorators";
import { UserRole } from "./enums";
import { SuccessResponse } from "src/common/helpers/SuccessResponse";
import { EditUserDto, GetUsersDto } from "./dto";
import { RegisterUserDto } from "../auth/dto";

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @HttpCode(201)
  @Post()
  @UseGuards(AccessTokenGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  async createUser(@Body() registerUserDto: RegisterUserDto) {
    const response = await this.usersService.createNewUser(registerUserDto);
    return new SuccessResponse(
      'User Created Successful',
      response,
    );
  }

  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @Get()
  async getAllUsers(@Query() query: GetUsersDto) {
    const users = await this.usersService.getAllUsers(query);
    return new SuccessResponse('Users fetched Successfully', users);
  }

  @UseGuards(AccessTokenGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @Get(":id")
  async getUser(@Param("id") id: string) {
    const user = await this.usersService.getUser(id);
    return new SuccessResponse('User Fetched Successfully', user);
  }

  @UseGuards(AccessTokenGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @Patch(":id")
  async updateUserDetails(
    @Param("id") id: string,
    @Body() editUserDto: EditUserDto
  ) {
    const user = await this.usersService.updateUserDetails(id, editUserDto);
    return new SuccessResponse('User Updated Successfully', user);
  }

  @UseGuards(AccessTokenGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async deleteUserDetails(@Param("id") id: string) {
    const user = await this.usersService.deleteUser(id);
    return new SuccessResponse('User Deleted Successfully', user);
  }
}