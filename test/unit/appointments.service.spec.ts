import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from '../../src/modules/appointments/appointments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Appointment } from '../../src/modules/appointments/entities';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from '../../src/modules/users/users.service';
import { AppointmentStatus, AppointmentType } from '../../src/modules/appointments/enums';
import { CreateAppointmentDto, GetAppointmentsDto } from '../../src/modules/appointments/dto';

describe('AppointmentsService', () => {
  let appointmentsService: AppointmentsService;
  let appointmentRepository: Repository<Appointment>;
  let usersService: UsersService;

  const mockUser = {
    id: '123',
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockAppointment = {
    id: '456',
    appointmentDate: new Date('2023-12-31'),
    appointmentTime: '14:30',
    duration: 30,
    type: AppointmentType.CONSULTATION,
    status: AppointmentStatus.SCHEDULED,
    reason: 'Regular checkup',
    userId: '123',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
  };

  const mockAppointmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockUsersService = {
    findUserById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: mockAppointmentRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    appointmentsService = module.get<AppointmentsService>(AppointmentsService);
    appointmentRepository = module.get<Repository<Appointment>>(getRepositoryToken(Appointment));
    usersService = module.get<UsersService>(UsersService);
  });

  describe('createAppointment', () => {
    const createAppointmentDto: CreateAppointmentDto = {
      appointmentDate: '2025-12-31',
      appointmentTime: '14:30',
      type: AppointmentType.CONSULTATION,
      userId: '123',
      reason: 'Regular checkup',
    };

    it('should create an appointment successfully', async () => {
      const date = new Date();
      jest.useFakeTimers().setSystemTime(date);

      
      mockUsersService.findUserById.mockResolvedValue(mockUser);
      mockAppointmentRepository.create.mockReturnValue(mockAppointment);
      mockAppointmentRepository.save.mockResolvedValue(mockAppointment);

      const result = await appointmentsService.createAppointment(createAppointmentDto);

      expect(mockUsersService.findUserById).toHaveBeenCalledWith(createAppointmentDto.userId);
      expect(mockAppointmentRepository.create).toHaveBeenCalledWith({
        type: createAppointmentDto.type,
        reason: createAppointmentDto.reason,
        userId: createAppointmentDto.userId,
        appointmentDate: expect.any(Date),
        appointmentTime: createAppointmentDto.appointmentTime,
      });
      expect(mockAppointmentRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockAppointment);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.findUserById.mockResolvedValue(null);

      await expect(appointmentsService.createAppointment(createAppointmentDto))
        .rejects.toThrow(NotFoundException);
      
      expect(mockUsersService.findUserById).toHaveBeenCalledWith(createAppointmentDto.userId);
      expect(mockAppointmentRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for past appointment date', async () => {
      const date = new Date();
      jest.useFakeTimers().setSystemTime(date);
        
      mockUsersService.findUserById.mockResolvedValue(mockUser);

      const pastAppointmentDto = {
        ...createAppointmentDto,
        appointmentDate: '2019-05-14',
        startTime: '10:00',
      };

      await expect(appointmentsService.createAppointment(pastAppointmentDto))
        .rejects.toThrow(BadRequestException);

    });
  });

  describe('getAppointments', () => {
    it('should return paginated appointments', async () => {
      const query: GetAppointmentsDto = {
        page: '1',
        limit: '10',
      };
      
      const paginatedResult = {
        data: [mockAppointment],
        meta: {
          totalItems: 1,
          itemCount: 1,
          itemsPerPage: 10,
          totalPages: 1,
          currentPage: 1,
        },
      };
      
      mockAppointmentRepository.findAndCount.mockResolvedValue([[mockAppointment], 1]);

      const result = await appointmentsService.getAppointments(query);

      expect(mockAppointmentRepository.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: {},
        skip: 0,
        take: 10,
      }));
      
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('totalItems', 1);
      expect(result.meta).toHaveProperty('currentPage', 1);
    });

    it('should filter appointments by userId', async () => {
      const query: GetAppointmentsDto = {
        page: '1',
        limit: '10',
        userId: '123',
      };
      
      mockAppointmentRepository.findAndCount.mockResolvedValue([[mockAppointment], 1]);

      await appointmentsService.getAppointments(query);

      expect(mockAppointmentRepository.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: '123' },
      }));
    });

    it('should filter appointments by status', async () => {
      const query: GetAppointmentsDto = {
        page: '1',
        limit: '10',
        status: AppointmentStatus.SCHEDULED,
      };
      
      mockAppointmentRepository.findAndCount.mockResolvedValue([[mockAppointment], 1]);

      await appointmentsService.getAppointments(query);

      expect(mockAppointmentRepository.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: AppointmentStatus.SCHEDULED },
      }));
    });

    it('should filter appointments by type', async () => {
      const query: GetAppointmentsDto = {
        page: '1',
        limit: '10',
        type: AppointmentType.CONSULTATION,
      };
      
      mockAppointmentRepository.findAndCount.mockResolvedValue([[mockAppointment], 1]);

      await appointmentsService.getAppointments(query);

      expect(mockAppointmentRepository.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: { type: AppointmentType.CONSULTATION },
      }));
    });

    it('should apply multiple filters', async () => {
      const query: GetAppointmentsDto = {
        page: '1',
        limit: '10',
        userId: '123',
        status: AppointmentStatus.SCHEDULED,
        type: AppointmentType.CONSULTATION,
      };
      
      mockAppointmentRepository.findAndCount.mockResolvedValue([[mockAppointment], 1]);

      await appointmentsService.getAppointments(query);

      expect(mockAppointmentRepository.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId: '123',
          status: AppointmentStatus.SCHEDULED,
          type: AppointmentType.CONSULTATION,
        },
      }));
    });
  });
});