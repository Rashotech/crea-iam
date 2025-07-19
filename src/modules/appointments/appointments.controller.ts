import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "src/common/guards";
import { Roles } from "src/common/decorators";
import { SuccessResponse } from "src/common/helpers/SuccessResponse";
import { CreateAppointmentDto, GetAppointmentsDto } from "./dto";
import { UserRole } from "../users/enums";
import { AppointmentsService } from "./appointments.service";

@Controller('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @HttpCode(201)
  @Post()
  @UseGuards(AccessTokenGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  async createAppointment(@Body() createAppointmentDto: CreateAppointmentDto) {
    const response = await this.appointmentsService.createAppointment(createAppointmentDto);
    return new SuccessResponse(
      'Appointment Created Successfully',
      response,
    );
  }

  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @Get()
  async getAppointments(@Query() query: GetAppointmentsDto) {
    const appointments = await this.appointmentsService.getAppointments(query);
    return new SuccessResponse('Appointments fetched Successfully', appointments);
  }
}