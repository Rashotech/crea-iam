import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "src/common/entities/base.entity";
import { User } from "src/modules/users/entities";
import { AppointmentStatus, AppointmentType } from "../enums";

@Entity('appointments')
export class Appointment extends BaseEntity {
  @Column({ type: 'date' })
  appointmentDate: Date;

  @Column({ type: 'time' })
  appointmentTime: string;

  @Column({ type: 'int', default: 30 })
  duration: number;

  @Column({
    type: 'enum',
    enum: AppointmentType,
    default: AppointmentType.CONSULTATION,
  })
  type: AppointmentType;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  status: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'text', nullable: true })
  diagnosis?: string;

  @Column({ type: 'text', nullable: true })
  treatment?: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;
}