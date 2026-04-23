import express, { Application, ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { swaggerSpec } from './src/config/swagger';
import authRoutes from './src/auth/routes/auth.routes';
import { routers as githubRoutes } from './src/github/routes/github.routes';
import { errorMiddleware } from './src/shared/middlewares/error-middleware';
import { globalApiLimiter } from './src/shared/middlewares/rate-limit-middleware';

dotenv.config();

const server: Application = express();
const port = process.env.PORT || 3000;
const env = process.env.NODE_ENV || 'production';

server.disable('x-powered-by');

server.use(helmet());
server.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);
server.use(express.json({ limit: '10kb' }));
server.use(cookieParser());

server.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

server.use('/', globalApiLimiter);

server.use('/', authRoutes);
server.use('/', githubRoutes);

server.use(errorMiddleware as ErrorRequestHandler);

server.listen(port, () => {
  if (env === 'development') {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
  }
});
