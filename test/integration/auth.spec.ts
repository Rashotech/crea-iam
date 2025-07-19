import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { User } from '../../src/modules/users/entities';
import { Gender, UserRole } from '../../src/modules/users/enums';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { HttpExceptionFilter } from '../../src/common/http-exception/http-exception.filter';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

describe('Authentication (Integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  let postgresContainer: StartedPostgreSqlContainer;
  let userRepository: Repository<User>;
  
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123282!@',
    firstName: 'Test',
    lastName: 'User',
    dob: '1990-01-01',
    gender: Gender.MALE,
  };

  const adminUser = {
    username: process.env.ADMIN_USERNAME!,
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!,
    firstName: 'Admin',
    lastName: 'User',
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
            }
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

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    
    await app.init();

     // Create admin user directly in the database
    const passwordHash = await bcrypt.hash(adminUser.password, 10);
    
    await userRepository.save({
      username: adminUser.username,
      email: adminUser.email,
      passwordHash: passwordHash,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      active: true,
      roles: [UserRole.ADMIN]
    });
  }, 9000);

  afterAll(async () => {
    await app.close();
    await postgresContainer.stop();
    
    // Clean up environment variables
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
  });

  describe('Registration', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('username', testUser.username);
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).not.toHaveProperty('passwordHash');
    });

    it('should not register a user with existing username', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should not register a user with invalid data', async () => {
      const invalidUser = {
        username: 'test',
        email: 'invalid-email',
        password: '123', // Too short
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          userId: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      
      accessToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;
    });

    it('should login with email instead of username', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          userId: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body.data).toHaveProperty('tokens');
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          userId: testUser.username,
          password: 'wrongpassword',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should not login with non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          userId: 'nonexistentuser',
          password: 'password123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', true);
    });
  });

  describe('Protected Routes', () => {
    it('should access protected route with valid token', async () => {
      // Login as admin
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          userId: adminUser.email,
          password: adminUser.password,
        })
        .expect(200);

      const adminToken = loginResponse.body.data.tokens.accessToken;

      // Access protected route
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body).toHaveProperty('data');
    });

    it('should not access protected route without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error', true);
    });

    it('should not access protected route with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(response.body).toHaveProperty('error', true);
    });

    it('should not access admin-only route with non-admin user', async () => {
      // Regular user should not access admin routes
      const response = await request(app.getHttpServer())
        .delete('/api/v1/users/some-user-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', true);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('error', false);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      
      // Update tokens for future tests
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should not refresh tokens with invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/refresh')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(response.body).toHaveProperty('error', true);
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('should not allow using refresh token after logout', async () => {
      // Try to refresh token after logout
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', true);
    });
  });
});