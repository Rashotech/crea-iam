import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../src/modules/users/users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../src/modules/users/entities';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Gender, UserRole, UserStatus } from '../../src/modules/users/enums';
import * as bcrypt from 'bcrypt';
import { EditUserDto } from 'src/modules/users/dto';

jest.mock('bcrypt');

describe('UsersService', () => {
  let usersService: UsersService;
  let mockUserRepository;
  let mockEntityManager;

  const mockUser = {
    id: '123',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    dob: new Date('1990-01-01'),
    gender: Gender.MALE,
    healthId: 'HEALTH123',
    active: true,
    roles: [UserRole.PATIENT],
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const registerDto = {
    username: 'newuser',
    email: 'new@example.com',
    password: 'password123',
    firstName: 'New',
    lastName: 'User',
    dob: '1990-01-01',
    gender: Gender.MALE
  };

  beforeEach(async () => {
    mockUserRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockEntityManager = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    
    // Default mock implementations
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNewUser', () => {
    it('should create a new user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({ ...mockUser });
      mockUserRepository.save.mockResolvedValue({ ...mockUser });

      const result = await usersService.createNewUser(registerDto);

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(usersService.createNewUser(registerDto)).rejects.toThrow(ConflictException);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should create and save a new user', async () => {
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await usersService.createUser(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('findUser', () => {
    it('should find a user by username or email', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await usersService.findUser(registerDto);

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await usersService.findUser(registerDto);

      expect(result).toBeNull();
    });
  });

  describe('validateUser', () => {
    it('should find an active user by username or email', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await usersService.validateUser('testuser');

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('findUserById', () => {
    it('should find a user by id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await usersService.findUserById('123');

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateUser', () => {
    it('should update user details', async () => {
      const updateData = { firstName: 'Updated', lastName: 'Name' };
      mockEntityManager.update.mockResolvedValue({ affected: 1 });

      await usersService.updateUser('123', updateData);

      expect(mockEntityManager.update).toHaveBeenCalledWith(User, '123', updateData);
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users with filters', async () => {
      const query = {
        page: '1',
        limit: '10',
        gender: Gender.MALE,
        role: UserRole.PATIENT,
      };
      
      mockUserRepository.findAndCount.mockResolvedValue([[mockUser], 1]);

      const result = await usersService.getAllUsers(query);

      expect(mockUserRepository.findAndCount).toHaveBeenCalled();
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('meta');
    });
  });

  describe('seedAdminUser', () => {
    it('should not create admin if already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await usersService.seedAdminUser();

      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should create admin user if not exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await usersService.seedAdminUser();

      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    it('should return a user by id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await usersService.getUser('123');

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(usersService.getUser('123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserDetails', () => {
    const editUserDto: EditUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
      dob: new Date('1990-01-01'),
      gender: Gender.MALE
    };

    it('should update user details', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      await usersService.updateUserDetails('123', editUserDto);

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(usersService.updateUserDetails('123', editUserDto)).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue({ affected: 1 });

      await usersService.deleteUser('123');

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockUserRepository.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(usersService.deleteUser('123')).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });
  });
});