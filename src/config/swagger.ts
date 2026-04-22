import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GitHub Follower Manager API',
      version: '1.0.0',
      description:
        'API para gerenciamento de seguidores do GitHub. Permite verificar seguidores, seguir usuários automaticamente e monitorar alterações na lista de seguidores.',
    },
    servers: [
      {
        url: 'https://git-hub-follower-manager-23a9d5630eaf.herokuapp.com',
        description: 'Produção (Heroku)',
      },
      {
        url: 'http://localhost:3000',
        description: 'Desenvolvimento',
      },
    ],
  },
  apis: ['./src/controllers/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
