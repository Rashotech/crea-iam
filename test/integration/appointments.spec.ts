import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { AppointmentsModule } from '../../src/modules/appointments/appointments.module';
import { User } from '../../src/modules/users/entities';
import { Appointment } from '../../src/modules/appointments/entities';
import { Gender, UserRole, UserStatus } from '../../src/modules/users/enums';
import { AppointmentStatus, AppointmentType } from '../../src/modules/appointments/enums';
import { HttpExceptionFilter } from '../../src/common/http-exception/http-exception.filter';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

describe('Appointments (Integration)', () => {
  let app: INestApplication;
  let postgresContainer: StartedPostgreSqlContainer;
  let userRepository: Repository<User>;
  let appointmentRepository: Repository<Appointment>;
  let adminToken: string;
  let patientToken: string;
  let doctorToken: string;
  let patientId: string;
  let appointmentId: string;
  
  const adminUser = {
    username: process.env.ADMIN_USERNAME!,
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!,
    firstName: 'Admin',
    lastName: 'User',
    roles: [UserRole.ADMIN],
  };

  const patientUser = {
    username: 'patientuser',
    email: 'patient@example.com',
    password: 'Password123msmsm!@',
    firstName: 'Patient',
    lastName: 'User',
    dob: '1990-01-01',
    gender: Gender.MALE,
    roles: [UserRole.PATIENT],
  };

  const doctorUser = {
    username: 'doctoruser',
    email: 'doctor@example.com',
    password: 'Password123!2m!@',
    firstName: 'Doctor',
    lastName: 'User',
    roles: [UserRole.DOCTOR],
  };

  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 1);
  const formattedFutureDate = futureDate.toISOString().split('T')[0];

  const appointmentData = {
    appointmentDate: formattedFutureDate,
    appointmentTime: '14:30',
    type: AppointmentType.CONSULTATION,
    reason: 'Regular checkup',
  };

  beforeAll(async () => {
    // Start PostgreSQL container
    postgresContainer = await new PostgreSqlContainer("postgres:13.3-alpine")
      .start();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
          load: [() => ({
            jwtSettings: {
              accessSecret: process.env.JWT_ACCESS_SECRET,
              refreshSecret: process.env.JWT_REFRESH_SECRET,
              accessExpirationMinutes: 15,
              refreshExpirationDays: 7,
            },
          })],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: postgresContainer.getHost(),
          port: postgresContainer.getPort(),
          username: postgresContainer.getUsername(),
          password: postgresContainer.getPassword(),
          database: postgresContainer.getDatabase(),
          entities: [User, Appointment],
          synchronize: true,
          dropSchema: true,
        }),
        JwtModule.register({}),
        AuthModule,
        UsersModule,
        AppointmentsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api/v1');
    
    // Get repositories
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    appointmentRepository = moduleFixture.get<Repository<Appointment>>(getRepositoryToken(Appointment));
    
    await app.init();

    
    // Create admin user
    const adminPasswordHash = await bcrypt.hash(adminUser.password, 10);
    const createdAdmin = await userRepository.save({
      username: adminUser.username,
      email: adminUser.email,
      passwordHash: adminPasswordHash,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      active: true,
      roles: adminUser.roles,
      status: UserStatus.ACTIVE
    });
    
    // Create patient user
    const patientPasswordHash = await bcrypt.hash(patientUser.password, 10);
    const createdPatient = await userRepository.save({
      username: patientUser.username,
      email: patientUser.email,
      passwordHash: patientPasswordHash,
      firstName: patientUser.firstName,
      lastName: patientUser.lastName,
      dob: new Date(patientUser.dob),
      gender: patientUser.gender,
      active: true,
      roles: patientUser.roles,
      status: UserStatus.ACTIVE
    });
    patientId = createdPatient.id;
    
    // Create doctor user
    const doctorPasswordHash = await bcrypt.hash(doctorUser.password, 10);
    const createdDoctor = await userRepository.save({
      username: doctorUser.username,
      email: doctorUser.email,
      passwordHash: doctorPasswordHash,
      firstName: doctorUser.firstName,
      lastName: doctorUser.lastName,
      active: true,
      roles: doctorUser.roles,
      status: UserStatus.ACTIVE
    });
    
    // Login as admin
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        userId: adminUser.username,
        password: adminUser.password,
      });
    adminToken = adminLoginResponse.body.data.tokens.accessToken;
    
    // Login as patient
    const patientLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        userId: patientUser.username,
        password: patientUser.password,
      });
    patientToken = patientLoginResponse.body.data.tokens.accessToken;
    
    // Login as doctor
    const doctorLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        userId: doctorUser.username,
        password: doctorUser.password,
      });
    doctorToken = doctorLoginResponse.body.data.tokens.accessToken;
    
  }, 9000);

  afterAll(async () => {
    await app.close();
    await postgresContainer.stop();
  });

  describe('Create Appointment', () => {
    it('should create an appointment for a patient', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          ...appointmentData,
          userId: patientId
        })
        .expect(201);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('appointmentDate');
      expect(response.body.data).toHaveProperty('appointmentTime', appointmentData.appointmentTime);
      expect(response.body.data).toHaveProperty('type', appointmentData.type);
      expect(response.body.data).toHaveProperty('userId', patientId);
      
      appointmentId = response.body.data.id;
    });

    it('should not create an appointment with past date', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const formattedPastDate = pastDate.toISOString().split('T')[0];
      
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          ...appointmentData,
          appointmentDate: formattedPastDate,
          userId: patientId
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should not create an appointment for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          ...appointmentData,
          userId: '1b60d799-6362-4e5a-bd10-3843dd53d8d2'
        })
        .expect(404);

      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Get Appointments', () => {
    it('should get all appointments', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('result');
      expect(response.body.data).toHaveProperty('meta');
      expect(response.body.data.result.length).toBeGreaterThan(0);
    });

    it('should filter appointments by userId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/appointments?userId=${patientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body.data.result.length).toBeGreaterThan(0);
      expect(response.body.data.result[0].user.id).toBe(patientId);
    });

    it('should filter appointments by type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/appointments?type=${AppointmentType.CONSULTATION}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body.data.result.some((appointment: Appointment) => appointment.type === AppointmentType.CONSULTATION)).toBe(true);
    });
  });
});