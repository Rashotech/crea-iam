import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { IFilterDto } from 'src/common/dto/filter.dto';
import { AppointmentStatus, AppointmentType } from '../enums';

export class GetAppointmentsDto extends IFilterDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;
  
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;
}
