import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '../../src/modules/users/entities';
import { Gender, UserRole, UserStatus } from '../../src/modules/users/enums';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: '123',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    roles: [UserRole.PATIENT],
    status: UserStatus.ACTIVE,
    active: true,
  } as User;

  const mockUsersService = {
    findUser: jest.fn(),
    validateUser: jest.fn(),
    createUser: jest.fn(),
    findUserById: jest.fn(),
    updateUser: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Configure default mock implementations
    mockConfigService.get.mockImplementation((key) => {
      const config = {
        'jwtSettings.accessSecret': 'test-access-secret',
        'jwtSettings.refreshSecret': 'test-refresh-secret',
        'jwtSettings.accessExpirationMinutes': 15,
        'jwtSettings.refreshExpirationDays': 7,
      };
      return config[key];
    });

    mockJwtService.signAsync.mockImplementation(() => 'mock-token');
    (bcrypt.compare as jest.Mock).mockImplementation(() => Promise.resolve(true));
    (bcrypt.hash as jest.Mock).mockImplementation(() => Promise.resolve('hashed-value'));
  });

  describe('register', () => {
    const registerDto = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
      dob: '1990-01-01',
      gender: Gender.MALE,
    };

    it('should register a new user successfully', async () => {
      mockUsersService.findUser.mockResolvedValue(null);
      mockUsersService.createUser.mockResolvedValue({
        ...mockUser,
        username: registerDto.username,
        email: registerDto.email,
      });

      const result = await authService.register(registerDto);

      expect(mockUsersService.findUser).toHaveBeenCalledWith(registerDto);
      expect(mockUsersService.createUser).toHaveBeenCalledWith(registerDto);
      expect(result).toBeDefined();
      if (result) {
        expect(result.email).toBe(registerDto.email);
        expect(result).not.toHaveProperty('passwordHash'); // Should not expose password hash
      }
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUsersService.findUser.mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockUsersService.findUser).toHaveBeenCalledWith(registerDto);
      expect(mockUsersService.createUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      userId: 'testuser',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      mockUsersService.validateUser.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

      const result = await authService.login(loginDto);

      expect(mockUsersService.validateUser).toHaveBeenCalledWith(loginDto.userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.passwordHash);
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockUsersService.updateUser).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result).toBeDefined();
      if (result) {
        expect(result.tokens).toHaveProperty('accessToken');
        expect(result.tokens).toHaveProperty('refreshToken');
        expect('passwordHash' in result.user).toBe(false); // Should not expose password hash
      }
    });

    it('should throw BadRequestException if user does not exist', async () => {
      mockUsersService.validateUser.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(BadRequestException);
      expect(mockUsersService.validateUser).toHaveBeenCalledWith(loginDto.userId);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if password is invalid', async () => {
      mockUsersService.validateUser.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(BadRequestException);
      expect(mockUsersService.validateUser).toHaveBeenCalledWith(loginDto.userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.passwordHash);
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('getTokens', () => {
    it('should generate access and refresh tokens', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await authService.getTokens('123', 'test@example.com');

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockConfigService.get).toHaveBeenCalledWith('jwtSettings.accessSecret');
      expect(mockConfigService.get).toHaveBeenCalledWith('jwtSettings.refreshSecret');
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('updateRefreshToken', () => {
    it('should hash and update the refresh token', async () => {
      await authService.updateRefreshToken('123', 'refresh-token');

      expect(bcrypt.hash).toHaveBeenCalledWith('refresh-token', 10);
      expect(mockUsersService.updateUser).toHaveBeenCalledWith('123', {
        refreshToken: 'hashed-value',
        lastLoginAt: expect.any(Date),
      });
    });
  });

  describe('logout', () => {
    it('should clear the refresh token', async () => {
      await authService.logout('123');

      expect(mockUsersService.updateUser).toHaveBeenCalledWith('123', {
        refreshToken: 'null',
      });
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      mockUsersService.findUserById.mockResolvedValue({
        ...mockUser,
        refreshToken: 'hashed-refresh-token',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await authService.refreshTokens('123', 'old-refresh-token');

      expect(mockUsersService.findUserById).toHaveBeenCalledWith('123');
      expect(bcrypt.compare).toHaveBeenCalledWith('old-refresh-token', 'hashed-refresh-token');
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockUsersService.updateUser).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw ForbiddenException if user not found', async () => {
      mockUsersService.findUserById.mockResolvedValue(null);

      await expect(authService.refreshTokens('123', 'refresh-token')).rejects.toThrow(ForbiddenException);
      expect(mockUsersService.findUserById).toHaveBeenCalledWith('123');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user has no refresh token', async () => {
      mockUsersService.findUserById.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await expect(authService.refreshTokens('123', 'refresh-token')).rejects.toThrow(ForbiddenException);
      expect(mockUsersService.findUserById).toHaveBeenCalledWith('123');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if refresh token does not match', async () => {
      mockUsersService.findUserById.mockResolvedValue({
        ...mockUser,
        refreshToken: 'hashed-refresh-token',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.refreshTokens('123', 'invalid-refresh-token')).rejects.toThrow(ForbiddenException);
      expect(mockUsersService.findUserById).toHaveBeenCalledWith('123');
      expect(bcrypt.compare).toHaveBeenCalledWith('invalid-refresh-token', 'hashed-refresh-token');
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});