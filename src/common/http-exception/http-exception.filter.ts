import { 
  ExceptionFilter, 
  Catch, 
  ArgumentsHost, 
  HttpException, 
  HttpStatus,
  Logger 
} from '@nestjs/common';
import { Response, Request } from 'express';

interface ErrorResponse {
  message: string | string[] | Record<string, any>;
  data?: any;
  error?: string;
  statusCode?: number;
}

interface StandardErrorResponse {
  error: boolean;
  statusCode: number;
  message: string;
  data: any;
  timestamp: string;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorResponse = exception.getResponse() as ErrorResponse;
    const { message, data } = this.extractErrorDetails(errorResponse);

    const standardResponse: StandardErrorResponse = {
      error: status >= 400,
      statusCode: status,
      message,
      data: data ?? null,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} Error: ${message}`,
        exception.stack,
        `${request.method} ${request.url}`
      );
    } else if (status >= 400) {
      this.logger.warn(
        `HTTP ${status} Client Error: ${message}`,
        `${request.method} ${request.url}`
      );
    }

    response.status(status).json(standardResponse);
  }

  private extractErrorDetails(errorResponse: ErrorResponse): {
    message: string;
    data: any;
  } {
    let message: string;
    let data: any;

    if (typeof errorResponse === 'string') {
      message = errorResponse;
      data = null;
    } else if (typeof errorResponse === 'object') {
      // Handle validation errors (array of messages)
      if (Array.isArray(errorResponse.message)) {
        message = errorResponse.message.join(', ');
      } else if (typeof errorResponse.message === 'string') {
        message = errorResponse.message;
      } else if (typeof errorResponse.message === 'object') {
        message = JSON.stringify(errorResponse.message);
      } else {
        message = 'An error occurred';
      }

      data = errorResponse.data;
    } else {
      message = 'An unexpected error occurred';
      data = null;
    }

    return { message, data };
  }
}

// Base custom exception class
export abstract class BaseHttpException extends HttpException {
  constructor(
    message: string | Record<string, any>,
    status: HttpStatus,
    data?: any
  ) {
    const response = typeof message === 'string' 
      ? { message, data }
      : { message: JSON.stringify(message), data };
    
    super(response, status);
  }
}

// Success responses (for consistency)
export class Http200Exception extends BaseHttpException {
  constructor(message: string | Record<string, any>, data?: any) {
    super(message, HttpStatus.OK, data);
  }
}

export class Http201Exception extends BaseHttpException {
  constructor(message: string | Record<string, any>, data?: any) {
    super(message, HttpStatus.CREATED, data);
  }
}

// Client error responses
export class Http400Exception extends BaseHttpException {
  constructor(message: string | Record<string, any>, data?: any) {
    super(message, HttpStatus.BAD_REQUEST, data);
  }
}

export class Http401Exception extends BaseHttpException {
  constructor(message: string | Record<string, any>, data?: any) {
    super(message, HttpStatus.UNAUTHORIZED, data);
  }
}

export class Http403Exception extends BaseHttpException {
  constructor(message: string | Record<string, any>, data?: any) {
    super(message, HttpStatus.FORBIDDEN, data);
  }
}

export class Http404Exception extends BaseHttpException {
  constructor(message: string | Record<string, any>, data?: any) {
    super(message, HttpStatus.NOT_FOUND, data);
  }
}

export class Http409Exception extends BaseHttpException {
  constructor(message: string | Record<string, any>, data?: any) {
    super(message, HttpStatus.CONFLICT, data);
  }
}

export class Http422Exception extends BaseHttpException {
  constructor(message: string | Record<string, any>, data?: any) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, data);
  }
}

// Server error responses
export class Http500Exception extends BaseHttpException {
  constructor(message: string | Record<string, any>, data?: any) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, data);
  }
}

export class Http503Exception extends BaseHttpException {
  constructor(message: string | Record<string, any>, data?: any) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE, data);
  }
}

// Validation exception for better error handling
export class ValidationException extends BaseHttpException {
  constructor(errors: string[] | Record<string, any>) {
    const message = Array.isArray(errors) ? errors.join(', ') : errors;
    super(message, HttpStatus.BAD_REQUEST);
  }
}

// Business logic exception
export class BusinessLogicException extends BaseHttpException {
  constructor(message: string, data?: any) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, data);
  }
}

// Resource not found exception
export class ResourceNotFoundException extends BaseHttpException {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, HttpStatus.NOT_FOUND);
  }
}

// Duplicate resource exception
export class DuplicateResourceException extends BaseHttpException {
  constructor(resource: string, field?: string) {
    const message = field 
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`;
    super(message, HttpStatus.CONFLICT);
  }
}
