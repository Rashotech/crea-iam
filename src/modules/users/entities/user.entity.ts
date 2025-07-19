import { Column, Entity } from "typeorm";
import { Gender, UserRole, UserStatus } from "../enums";
import { Exclude } from 'class-transformer';
import { BaseEntity } from "src/common/entities/base.entity";

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true, length: 50})
  username: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column()
  @Exclude()
  passwordHash: string;

  @Column({ nullable: true, length: 50 })
  firstName?: string;

  @Column({ nullable: true, length: 50 })
  lastName?: string;

  @Column({ type: 'date', nullable: true })
  dob?: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender?: Gender;

  @Column({ nullable: true, length: 50 })
  healthId?: string;

  @Column({ default: true })
  active: boolean;

  @Column({
    type: "enum",
    enum: UserRole,
    array: true,
    default: [UserRole.PATIENT],
  })
  roles: UserRole[];

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: Date, nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  refreshToken?: string;
}