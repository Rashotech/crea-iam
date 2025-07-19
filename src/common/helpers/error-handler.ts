import { BadRequestException, ConflictException, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';

export class ExceptionHelper {
  static handleException(error: any): void {
    if (error instanceof NotFoundException || 
        error instanceof UnauthorizedException || 
        error instanceof ConflictException || 
        error instanceof BadRequestException) {
      throw error;
    } else {
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }
}