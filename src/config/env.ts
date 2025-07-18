import * as dotenv from 'dotenv';
dotenv.config();

export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  environment: process.env.NODE_ENV ?? 'development',
});
