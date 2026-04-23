import { Router, Request, Response, NextFunction } from 'express';
import { CheckFollowerWithFollowing } from '../usecases/check-follower-with-following-usecase';
import { FollowUsersFollowers } from '../usecases/follow-users-followers-usecase';
import { newFollower } from '../requests/follow-request';
import { checkUnfollowAndFollow } from '../usecases/check-unfollow-and-follow-usecase';
import { unfollowUsers } from '../usecases/unfollow-users-usecase';
import { filterOrganicFollowers } from '../usecases/filter-organic-followers-usecase';
import { AppError } from '../../utils/app-error';
import { createResponse } from '../../utils/create-response';
import { httpStatusCodes } from '../../utils/http-constants';

const routers = Router();

function getAuthenticatedUser(res: Response): string | null {
  const user = process.env.USER;
  if (!user) {
    const status = httpStatusCodes.INTERNAL_SERVER_ERROR;
    res
      .status(status)
      .json(createResponse(status, 'GitHub user not configured', undefined, 'USER_NOT_SET'));
    return null;
  }
  return user;
}

function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username);
}

routers.get('/', (_req: Request, res: Response) => {
  const status = httpStatusCodes.OK;
  res.status(status).json(
    createResponse(status, 'Bem-vindo à API de Gerenciamento de Seguidores!', {
      endpoints: {
        '/check-follower': 'Verifica quem você segue mas não te segue de volta.',
        '/follow-users': 'Segue automaticamente os seguidores de um usuário.',
        '/check-unfollower': 'Verifica quem te segue mas você ainda não segue de volta.',
        '/new-follower': 'Segue um ou mais usuários específicos.',
        '/unfollow-users': 'Para de seguir uma lista de usuários.',
        '/filter-organic': 'Filtra usuários separando orgânicos de suspeitos (bots).',
      },
    }),
  );
});

/**
 * @swagger
 * /check-follower:
 *   get:
 *     summary: Verifica quem você segue mas não te segue de volta
 *     tags:
 *       - Seguidores
 *     responses:
 *       200:
 *         description: Lista retornada com sucesso
 *       500:
 *         description: Erro interno
 */
routers.get('/check-follower', async (_req: Request, res: Response, next: NextFunction) => {
  const name = getAuthenticatedUser(res);
  if (!name) return;

  try {
    const result = await CheckFollowerWithFollowing(name);
    const status = httpStatusCodes.OK;
    res.status(status).json(createResponse(status, 'Success', result));
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /follow-users:
 *   post:
 *     summary: Copia e segue os seguidores orgânicos de uma conta referência
 *     tags:
 *       - Seguidores
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetUser
 *             properties:
 *               targetUser:
 *                 type: string
 *                 example: "referencia_organica"
 *     responses:
 *       200:
 *         description: Processo iniciado em background
 *       400:
 *         description: targetUser inválido
 */
routers.post('/follow-users', async (req: Request, res: Response, next: NextFunction) => {
  const { targetUser } = req.body;

  if (!targetUser || typeof targetUser !== 'string' || !isValidUsername(targetUser)) {
    return next(
      AppError.badRequest(
        "Informe 'targetUser' com um nome de usuário GitHub válido.",
        'INVALID_TARGET_USER',
      ),
    );
  }

  const myUser = getAuthenticatedUser(res);
  if (!myUser) return;

  const status = httpStatusCodes.OK;
  res
    .status(status)
    .json(createResponse(status, 'Processo iniciado em background.', { targetUser }));

  setImmediate(async () => {
    try {
      const result = await FollowUsersFollowers(targetUser, myUser);
      console.log('[follow-users] concluído:', result);
    } catch (error) {
      console.error('[follow-users] erro:', error instanceof Error ? error.message : error);
    }
  });
});

/**
 * @swagger
 * /check-unfollower:
 *   get:
 *     summary: Verifica quem te segue mas você ainda não segue de volta
 *     tags:
 *       - Seguidores
 *     responses:
 *       200:
 *         description: Lista retornada com sucesso
 *       500:
 *         description: Erro interno
 */
routers.get('/check-unfollower', async (_req: Request, res: Response, next: NextFunction) => {
  const name = getAuthenticatedUser(res);
  if (!name) return;

  try {
    const result = await checkUnfollowAndFollow(name);
    const status = httpStatusCodes.OK;
    res.status(status).json(createResponse(status, 'Success', result));
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /new-follower:
 *   post:
 *     summary: Segue um ou mais usuários do GitHub
 *     tags:
 *       - Seguidores
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usernames:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: Resultado do follow
 *       400:
 *         description: Nenhum usuário informado ou lista inválida
 */
routers.post(
  '/new-follower',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { usernames } = req.body;

    if (!usernames) {
      return next(
        AppError.badRequest(
          "Informe 'usernames' com um nome ou lista de usuários.",
          'MISSING_USERNAMES',
        ),
      );
    }

    const list: string[] = Array.isArray(usernames) ? usernames : [usernames];

    if (list.length === 0) {
      return next(AppError.badRequest('A lista de usuários está vazia.', 'EMPTY_USERNAMES'));
    }

    const invalid = list.filter((u) => typeof u !== 'string' || !isValidUsername(u));
    if (invalid.length > 0) {
      return next(AppError.badRequest('Usernames inválidos.', 'INVALID_USERNAMES', { invalid }));
    }

    try {
      const results = await Promise.allSettled(
        list.map(async (username) => {
          const delay = Math.floor(Math.random() * 2000) + 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          const ok = await newFollower(username);
          if (!ok) throw new Error(username);
          return username;
        }),
      );

      const success: string[] = [];
      const failed: string[] = [];

      results.forEach((result, i) => {
        if (result.status === 'fulfilled') success.push(result.value);
        else failed.push(list[i]);
      });

      const status = httpStatusCodes.OK;
      res.status(status).json(createResponse(status, 'Success', { success, failed }));
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @swagger
 * /unfollow-users:
 *   delete:
 *     summary: Para de seguir uma lista de usuários do GitHub
 *     tags:
 *       - Seguidores
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usernames:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Resultado do unfollow em lote
 *       400:
 *         description: Lista inválida
 */
routers.delete('/unfollow-users', async (req: Request, res: Response, next: NextFunction) => {
  const { usernames } = req.body;

  if (!Array.isArray(usernames) || usernames.length === 0) {
    return next(
      AppError.badRequest("Informe uma lista de usuários em 'usernames'.", 'MISSING_USERNAMES'),
    );
  }

  const invalid = usernames.filter((u) => typeof u !== 'string' || !isValidUsername(u));
  if (invalid.length > 0) {
    return next(AppError.badRequest('Usernames inválidos.', 'INVALID_USERNAMES', { invalid }));
  }

  try {
    const result = await unfollowUsers(usernames);
    const status = httpStatusCodes.OK;
    res.status(status).json(createResponse(status, 'Success', result));
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /filter-organic:
 *   post:
 *     summary: Filtra usuários separando orgânicos de suspeitos (bots)
 *     tags:
 *       - Seguidores
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usernames:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Resultado da filtragem
 *       400:
 *         description: Lista inválida
 */
routers.post('/filter-organic', async (req: Request, res: Response, next: NextFunction) => {
  const { usernames } = req.body;

  if (!Array.isArray(usernames) || usernames.length === 0) {
    return next(
      AppError.badRequest("Informe uma lista de usuários em 'usernames'.", 'MISSING_USERNAMES'),
    );
  }

  const invalid = usernames.filter((u) => typeof u !== 'string' || !isValidUsername(u));
  if (invalid.length > 0) {
    return next(AppError.badRequest('Usernames inválidos.', 'INVALID_USERNAMES', { invalid }));
  }

  try {
    const result = await filterOrganicFollowers(usernames);
    const status = httpStatusCodes.OK;
    res.status(status).json(createResponse(status, 'Success', result));
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         statusCode:
 *           type: number
 *         message:
 *           type: string
 *         code:
 *           type: string
 */

export { routers };
