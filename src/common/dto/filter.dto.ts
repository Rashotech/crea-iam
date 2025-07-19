import {
  IsNumberString,
  IsOptional
} from 'class-validator';

export class IFilterDto {
  @IsNumberString()
  @IsOptional()
  page?: string;

  @IsNumberString()
  @IsOptional()
  limit?: string;
}

export interface IFilterResponse {
  skip: number;
  limit: number;
  page: number;
}


export interface IPaginationResponse {
  take: number;
  skip: number;
}

export interface IPaginatedDataResponse<T> {
  result: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}
