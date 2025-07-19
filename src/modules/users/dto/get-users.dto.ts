import { IsEnum, IsOptional } from 'class-validator';
import { IFilterDto } from 'src/common/dto/filter.dto';
import { Gender, UserRole } from '../enums';

export class GetUsersDto extends IFilterDto {
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
