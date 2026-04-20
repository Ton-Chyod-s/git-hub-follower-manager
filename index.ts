import express, { Application } from 'express';
import { RegisterRoutes } from './src/controllers/RegisterRoutes';

const server: Application = express();
const port = process.env.PORT || 3000;

server.use(express.json());

RegisterRoutes(server);

server.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`);
});
