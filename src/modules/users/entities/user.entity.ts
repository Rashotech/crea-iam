import { Column, Entity } from "typeorm";
import { UserRole, UserStatus } from "../enums";
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

  @Column({
    type: "enum",
    enum: UserRole,
    array: true,
    default: [UserRole.USER],
  })
  roles: UserRole[]

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;
}