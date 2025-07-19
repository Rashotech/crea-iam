import { Column, Entity } from "typeorm";
import { Gender, UserRole, UserStatus } from "../enums";
import { Exclude } from 'class-transformer';
import { BaseEntity } from "src/common/entities/base.entity";

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'date' })
  dob: Date;

  @Column({
    type: 'enum',
    enum: Gender,
  })
  gender: Gender;

  @Column()
  healthId: string;

  @Column({ default: true })
  active: boolean;

  @Column({
    type: "enum",
    enum: UserRole,
    array: true,
    default: [UserRole.USER],
  })
  roles: UserRole[]

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: Date, nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  refreshToken?: string;
}