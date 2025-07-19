import { ICurrentUser } from "src/modules/auth/interfaces";
import { User } from "src/modules/users/entities";
import { IFilterDto, IPaginatedDataResponse, IPaginationResponse } from "../dto";

export function generatePatientMRN(): string {
  const prefix = "MRN";
  const timestamp = Date.now().toString();

  const randomPart = Math.random().toString(36).substring(2, 10); 

  const sumOfDigits = timestamp.split('').reduce((sum, char) => sum + parseInt(char, 10), 0);
  const checksumChar = String.fromCharCode(65 + (sumOfDigits % 26)); 

  return `${prefix}${timestamp}${randomPart}${checksumChar}`.toUpperCase();
}

export function excludeSensitiveUserData(user: User | ICurrentUser): Omit<User, 'passwordHash' | 'refreshToken' | 'lastLoginAt'> {
  const { passwordHash, refreshToken, lastLoginAt, ...userWithoutSensitiveData } = user;
  return userWithoutSensitiveData;
}

export const getDataPaginationData = (payload: IFilterDto): IPaginationResponse => {
  const { page, limit } = payload;

  const _page = Number(page) || 1;
  const _limit = Number(limit) || 10;

  // Calculate skip (offset) for TypeORM
  const skip = (_page - 1) * _limit;

  return { take: _limit, skip: skip }
};

export const createPaginatedResponse = <T>(
    data: T[],
    totalItems: number,
    paginationOptions: IPaginationResponse,
  ): IPaginatedDataResponse<T> => {
    const currentPage = paginationOptions.skip / paginationOptions.take + 1;
    const totalPages = Math.ceil(totalItems / paginationOptions.take);
    const itemCount = data.length;

    return {
      result: data,
      meta: {
        totalItems,
        itemCount,
        itemsPerPage: paginationOptions.take,
        totalPages,
        currentPage,
      },
    };
  }