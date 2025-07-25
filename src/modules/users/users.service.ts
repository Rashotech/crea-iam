import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from 'bcrypt';
import { User } from "./entities";
import { ArrayContains, EntityManager, FindOptionsWhere, Repository } from "typeorm";
import { RegisterUserDto } from "src/modules/auth/dto";
import { applyNonNullValues, createPaginatedResponse, excludeSensitiveUserData, generatePatientMRN, getDataPaginationData } from "src/common/helpers/utils";
import { UserRole, UserStatus } from "./enums";
import { EditUserDto, GetUsersDto } from "./dto";
import { ExceptionHelper } from "src/common/helpers/error-handler";

import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private entityManager: EntityManager,
  ) {}


  async createNewUser(registerUserDto: RegisterUserDto) {
    try {
        // Check if user exists
      const existingUser = await this.findUser(registerUserDto);
      
      if (existingUser) {
        throw new ConflictException('Username or email already exists');
      }

      const newUser = await this.createUser(registerUserDto);
      return excludeSensitiveUserData(newUser);
    } catch (error) {
      this.logger.error(error);
      ExceptionHelper.handleException(error);
    }
  }

  async createUser(registerUserDto: RegisterUserDto) {
    this.logger.log(`Creating user: ${registerUserDto.username}`);

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerUserDto.password, saltRounds);

    const healthId = await this.generateUniqueHealthId();

    // Create user
    const user = this.usersRepository.create({
      ...registerUserDto,
      passwordHash,
      healthId
    });

    const savedUser = await this.usersRepository.save(user);
    this.logger.log(`User created successfully: ${savedUser.id}`);
    
    return savedUser;
  }

  async findUser(registerUserDto: RegisterUserDto) {
     const existingUser = await this.usersRepository.findOne({
      where: [
        { username: registerUserDto.username },
        { email: registerUserDto.email },
      ],
    });

    return existingUser;
  }

  async validateUser(userId: string) {
    const activeFilter = { active: true, status: UserStatus.ACTIVE };
    const user = await this.usersRepository.findOne({
      where: [
        { username: userId, ...activeFilter },
        { email: userId, ...activeFilter },
      ],
    });
   
    return user;
  }

  async findUserById(userId: string) {
    const user = await this.usersRepository.findOne({
      where: [
        { id: userId },
      ],
    });
   
    return user;
  }

  private async generateUniqueHealthId() {
    let healthId: string = "";
    let mrnIsUnique = false;

    while (!mrnIsUnique) {
      healthId = generatePatientMRN();

      // Check if a user with this healthId already exists in the database
      const existingUser = await this.usersRepository.findOne({ where: { healthId } });

      if (!existingUser) {
        mrnIsUnique = true; // Found a unique MRN
      } else {
        this.logger.warn(`Generated MRN ${healthId} already exists. Retrying...`);
      }
    }

    return healthId;
  }

  async updateUser(
    id: string,
    updateUserDto: Partial<User>,
  ) {
    this.logger.log(`Updating user with ID: ${id}`, updateUserDto);
    await this.entityManager.update(User, id, updateUserDto);
  }

  async getAllUsers(query: GetUsersDto) {
    const { gender, role } = query;
    const paginationOptions = getDataPaginationData(query);

    let filter: FindOptionsWhere<User> = {};

    if (gender) {
      filter = { ...filter, gender };
    }

    if (role) {
      filter = { ...filter, roles: ArrayContains([role]) };
    }

    const selectFields: (keyof User)[] = [
      'id', 'createdAt', 'updatedAt', 'username', 'email', 'firstName', 'lastName',
      'dob', 'gender', 'healthId', 'active', 'roles', 'status'
    ];

    const [users, totalItems] = await this.usersRepository.findAndCount({
      where: filter,
      ...paginationOptions,
      select: selectFields
    });

    return createPaginatedResponse(users, totalItems, paginationOptions);
  }

  async seedAdminUser() {
     try {
        const adminUsername = process.env.ADMIN_USERNAME;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminUsername || !adminEmail || !adminPassword) {
          console.log('Admin credentials are not set in environment variables');
          return;
        }

        console.log(`Checking for existing admin user with email: ${adminEmail}...`);
        const existingAdmin = await this.usersRepository.findOne({
            where: [{ email: adminEmail }],
        });

        if (existingAdmin) {
            console.log('Admin user already exists. Skipping seeding.');
            return;
        }

        console.log(`Seeding new admin user: ${adminUsername}...`);
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

        const newAdmin = this.usersRepository.create({
            username: adminUsername,
            email: adminEmail,
            passwordHash: passwordHash,
            firstName: 'Super',
            lastName: 'Admin',
            active: true,
            roles: [UserRole.ADMIN],
            status: UserStatus.ACTIVE
        });

        await this.usersRepository.save(newAdmin);
        console.log(`Admin user '${adminUsername}' seeded successfully.`);
    } catch (error) {
      console.error('Error seeding admin user:', error);
    }
  }

  async getUser(id: string) {
    try {    
      const user = await this.usersRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      this.logger.log(`Fetching user details for ID: ${id}`);
      return excludeSensitiveUserData(user);
    } catch (error) {
      this.logger.error(`Failed to fetch user details for ID: ${id}`, error);
      ExceptionHelper.handleException(error);
    }
  }

  async updateUserDetails(id: string, editUserDto: EditUserDto) {
    try {
      this.logger.log(`Updating user details for ID: ${id}`, editUserDto);
    
      const user = await this.usersRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const validatedData = applyNonNullValues(user, editUserDto);
      await this.usersRepository.update(id, validatedData);
      return excludeSensitiveUserData(validatedData);
    } catch (error) {
      this.logger.error(`Failed to update user details for ID: ${id}`, error);
      ExceptionHelper.handleException(error);
    }
  }

  async deleteUser(id: string) {
    try {    
      const user = await this.usersRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      this.logger.log(`Deleting user details for ID: ${id}`);

      await this.usersRepository.delete(id);
    } catch (error) {
      this.logger.error(`Failed to delete user details for ID: ${id}`, error);
      ExceptionHelper.handleException(error);
    }
  }
}

