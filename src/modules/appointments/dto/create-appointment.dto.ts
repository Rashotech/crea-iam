import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { AppointmentType } from '../enums';

export class CreateAppointmentDto {
  @IsDateString()
  @IsNotEmpty()
  appointmentDate: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Appointment time must be in HH:MM format'
  })
  appointmentTime: string;

  @IsNotEmpty()
  @IsEnum(AppointmentType)
  type: AppointmentType;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
