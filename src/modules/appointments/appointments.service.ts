import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ArrayContains, EntityManager, FindOptionsWhere, Repository } from "typeorm";
import { createPaginatedResponse, getDataPaginationData } from "src/common/helpers/utils";
import { ExceptionHelper } from "src/common/helpers/error-handler";
import { Appointment } from "./entities";
import { CreateAppointmentDto, GetAppointmentsDto } from "./dto";
import { UsersService } from "../users/users.service";

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    private usersService: UsersService,
  ) {}

  async createAppointment(createAppointmentDto: CreateAppointmentDto) {
    try {
      const { userId, appointmentDate, appointmentTime, type, reason } = createAppointmentDto;

      const user = await this.usersService.findUserById(userId);
      if (!user) {
        throw new NotFoundException('Patient not found');
      }

      const _appointmentDate = new Date(appointmentDate);

      // Validate appointment is not in the past
      if (_appointmentDate < new Date()) {
        throw new BadRequestException('Cannot schedule appointments in the past');
      }

      const appointment = this.appointmentRepository.create({
        type, reason, userId,
        appointmentDate: _appointmentDate,
        appointmentTime: appointmentTime
      });

      const savedAppointment = await this.appointmentRepository.save(appointment);
      this.logger.log(`Appointment created successfully: ${savedAppointment.id}`);

      return savedAppointment;
    } catch (error) {
      this.logger.error(`Failed to create appointment: ${error.message}`);
      ExceptionHelper.handleException(error);
    }
  }

  async getAppointments(query: GetAppointmentsDto) {
    const { userId, status, type } = query;
    const paginationOptions = getDataPaginationData(query);

    let filter: FindOptionsWhere<Appointment> = {};

    if (userId) {
      filter = { ...filter, userId };
    }

    if (status) {
      filter = { ...filter, status };
    }

    if (type) {
      filter = { ...filter, type };
    }

    const [appointments, totalItems] = await this.appointmentRepository.findAndCount({
      where: filter,
       relations: {
        user: true,
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        appointmentDate: true,
        appointmentTime: true,
        duration: true,
        type: true,
        status: true,
        notes: true,
        reason: true,
        diagnosis: true,
        treatment: true,
        user: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          dob: true,
          gender: true
        },
      },
      ...paginationOptions
    });

    return createPaginatedResponse(appointments, totalItems, paginationOptions);
  }
}