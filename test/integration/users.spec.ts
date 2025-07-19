import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { User } from '../../src/modules/users/entities';
import { Gender, UserRole, UserStatus } from '../../src/modules/users/enums';
import { HttpExceptionFilter } from '../../src/common/http-exception/http-exception.filter';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

describe('Users (Integration)', () => {
  let app: INestApplication;
  let postgresContainer: StartedPostgreSqlContainer;
  let userRepository: Repository<User>;
  let adminToken: string;
  let regularUserToken: string;
  let userId: string;
  
  const adminUser = {
    username: process.env.ADMIN_USERNAME!,
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!,
    firstName: 'Admin',
    lastName: 'User',
    roles: [UserRole.ADMIN],
  };

  const regularUser = {
    username: 'regularuser',
    email: 'regular@example.com',
    password: 'Password12@3',
    firstName: 'Regular',
    lastName: 'User',
    dob: '1990-01-01',
    gender: Gender.MALE,
    roles: [UserRole.PATIENT],
  };

  const newUser = {
    username: 'newuser',
    email: 'new@example.com',
    password: 'Password12@jj3',
    firstName: 'New',
    lastName: 'User',
    dob: '1992-05-15',
    gender: Gender.FEMALE,
    roles: [UserRole.NURSE],
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
          entities: [User],
          synchronize: true,
          dropSchema: true,
        }),
        JwtModule.register({}),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api/v1');
    
    // Get the user repository
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    
    await app.init();
    
    // Create admin user directly in the database
    const saltRounds = 10;
    const adminPasswordHash = await bcrypt.hash(adminUser.password, 10);
    
    await userRepository.save({
      username: adminUser.username,
      email: adminUser.email,
      passwordHash: adminPasswordHash,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      active: true,
      roles: adminUser.roles,
      status: UserStatus.ACTIVE
    });
    
    // Create regular user directly in the database
    const regularPasswordHash = await bcrypt.hash(regularUser.password, 10);
    
    await userRepository.save({
      username: regularUser.username,
      email: regularUser.email,
      passwordHash: regularPasswordHash,
      firstName: regularUser.firstName,
      lastName: regularUser.lastName,
      dob: new Date(regularUser.dob),
      gender: regularUser.gender,
      active: true,
      roles: regularUser.roles,
      status: UserStatus.ACTIVE
    });
    
    // Login as admin to get token
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        userId: adminUser.username,
        password: adminUser.password,
      });
    
    adminToken = adminLoginResponse.body.data.tokens.accessToken;
    
    // Login as regular user to get token
    const regularLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        userId: regularUser.username,
        password: regularUser.password,
      });
    
    regularUserToken = regularLoginResponse.body.data.tokens.accessToken;
    
  }, 9000);
  afterAll(async () => {
    await app.close();
    await postgresContainer.stop();
  });

  describe('Create User', () => {
    it('should create a new user when admin is authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('username', newUser.username);
      expect(response.body.data).toHaveProperty('email', newUser.email);
      expect(response.body.data).not.toHaveProperty('passwordHash');
      
      // Save user ID for later tests
      userId = response.body.data.id;
    });

    it('should not create a user with existing username', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(409);

      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should not allow regular users to create users', async () => {
      const anotherUser = {
        ...newUser,
        username: 'anotheruser',
        email: 'another@example.com',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send(anotherUser)
        .expect(403);

      expect(response.body).toHaveProperty('error', true);
    });
  });

  describe('Get Users', () => {
    it('should get all users with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('result');
      expect(response.body.data).toHaveProperty('meta');
      expect(response.body.data.meta).toHaveProperty('totalItems');
      expect(response.body.data.meta).toHaveProperty('currentPage');
      expect(response.body.data.result.length).toBeGreaterThan(0);
    });

    it('should filter users by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users?role=patient')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body.data.result.length).toBeGreaterThan(0);
      expect(response.body.data.result[0].roles).toContain(UserRole.PATIENT);
    });

    it('should filter users by gender', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users?gender=female')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body.data.result.some(user => user.gender === Gender.FEMALE)).toBe(true);
    });
  });

  describe('Get User by ID', () => {
    it('should get a user by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', userId);
      expect(response.body.data).toHaveProperty('username', newUser.username);
      expect(response.body.data).toHaveProperty('email', newUser.email);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', true);
    });
  });

  describe('Update User', () => {
    it('should update a user', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('firstName', updateData.firstName);
      expect(response.body.data).toHaveProperty('lastName', updateData.lastName);
    });

    it('should not update a non-existent user', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error', true);
    });

    it('should not allow regular users to update other users', async () => {
      const updateData = {
        firstName: 'Unauthorized',
        lastName: 'Update',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('error', true);
    });
  });

  describe('Delete User', () => {
    it('should not allow non-admin users to delete users', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', true);
    });

    it('should delete a user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('error', false);
    });

    it('should return 404 when trying to get deleted user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', true);
    });
  });
});