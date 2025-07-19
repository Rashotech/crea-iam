import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Gender } from 'src/modules/users/enums';

export class EditUserDto {
  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsOptional()
  @IsDateString()
  dob: Date;

  @IsEnum(Gender)
  @IsOptional()
  gender: Gender;
}
