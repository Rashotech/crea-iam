import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from 'bcrypt';
import { User } from "./entities";
import { EntityManager, Or, Repository } from "typeorm";
import { RegisterUserDto } from "src/modules/auth/dto";
import { generatePatientMRN } from "src/common/helpers/utils";
import { UserStatus } from "./enums";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private entityManager: EntityManager,
  ) {}

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
}

