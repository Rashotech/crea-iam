export class SuccessResponse {
  message: string;
  error: boolean;
  data: any;

  constructor(message = 'success', data?: any, error = false) {
    this.error = error;
    this.message = message;
    this.data = data ?? null;
  }
}
