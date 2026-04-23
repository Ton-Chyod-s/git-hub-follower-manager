import express, { Application, ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { RegisterRoutes } from './src/controllers/RegisterRoutes';
import { swaggerSpec } from './src/config/swagger';
import { errorMiddleware } from './src/interfaces/http/middlewares/errorMiddleware';
import { globalApiLimiter } from './src/interfaces/http/middlewares/rateLimitMiddleware';

dotenv.config({ path: path.resolve(__dirname, 'src/config/.env') });

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

RegisterRoutes(server);

server.use(errorMiddleware as ErrorRequestHandler);

server.listen(port, () => {
  if (env === 'development') {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
  }
});
