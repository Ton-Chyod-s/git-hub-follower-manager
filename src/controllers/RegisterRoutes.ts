import { Application } from 'express';
import { routers } from './routes/apiRoutes';

export function RegisterRoutes(server: Application) {
  server.use('/', routers);
}
