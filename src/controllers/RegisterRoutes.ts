import { Application } from 'express';
import { routers } from './routes/apiRoutes';
import authRoutes from '../auth/routes/auth.routes';

export function RegisterRoutes(server: Application) {
  server.use('/', authRoutes);

  server.use('/', routers);
}
