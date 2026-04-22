import { Router, Request, Response } from 'express';
import { CheckFollowerWithFollowing } from '../../services/useCases/checkFollowerAndFollowing/CheckFollowerWithFollowingUseCase';
import { FollowUsersFollowers } from '../../services/useCases/followUsersFollowers/FollowUsersFollowersUseCase';
import { newFollower } from '../../requests/FollowRequest';
import { checkUnfollowAndFollow } from '../../services/useCases/checkUnfollowAndFollow/checkUnfollowAndFollowUseCase';
import { unfollowUsers } from '../../services/useCases/unfollowUsers/UnfollowUsersUseCase';
import { filterOrganicFollowers } from '../../services/useCases/filterOrganicFollowers/FilterOrganicFollowersUseCase';

const routers = Router();

function getAuthenticatedUser(res: Response): string | null {
    const user = process.env.USER;
    if (!user) {
        res.status(500).json({ error: "Variável USER não configurada no ambiente." });
        return null;
    }
    return user;
}

function isValidUsername(username: string): boolean {
    return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username);
}

/**
 * @swagger
 * /:
 *   get:
 *     summary: Boas-vindas e listagem de endpoints disponíveis
 *     tags:
 *       - Geral
 *     responses:
 *       200:
 *         description: Informações sobre a API e endpoints disponíveis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WelcomeResponse'
 */
routers.get('/', (_req: Request, res: Response) => {
    res.json({
        message: "Bem-vindo à API de Gerenciamento de Seguidores!",
        description: "Esta API permite verificar seguidores, seguir usuários automaticamente e monitorar alterações na lista de seguidores.",
        endpoints: {
            "/check-follower":   "Verifica quem você segue mas não te segue de volta.",
            "/follow-users":     "Segue automaticamente os seguidores de um usuário.",
            "/check-unfollower": "Verifica quem te segue mas você ainda não segue de volta.",
            "/new-follower":     "Segue um ou mais usuários específicos.",
            "/unfollow-users":   "Para de seguir uma lista de usuários.",
            "/filter-organic":   "Filtra usuários separando orgânicos de suspeitos (bots).",
        },
    });
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
 *         description: Lista de usuários que você segue mas não te seguem de volta
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
routers.get('/check-follower', async (_req: Request, res: Response) => {
    const name = getAuthenticatedUser(res);
    if (!name) return;

    try {
        const result = await CheckFollowerWithFollowing(name);
        res.json(result);
    } catch (error) {
        console.error('[check-follower]', error instanceof Error ? error.message : error);
        res.status(500).json({ error: "Erro ao verificar seguidores." });
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
 *         description: targetUser não informado ou inválido
 *       500:
 *         description: Erro interno
 */
routers.post('/follow-users', async (req: Request, res: Response) => {
    const { targetUser } = req.body;

    if (!targetUser || typeof targetUser !== 'string' || !isValidUsername(targetUser)) {
        res.status(400).json({ error: "Informe 'targetUser' com um nome de usuário GitHub válido." });
        return;
    }

    const myUser = getAuthenticatedUser(res);
    if (!myUser) return;

    res.json({ message: "Processo iniciado em background.", targetUser });

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
 *         description: Lista de usuários que te seguem mas você não segue de volta
 *       500:
 *         description: Erro interno
 */
routers.get('/check-unfollower', async (_req: Request, res: Response) => {
    const name = getAuthenticatedUser(res);
    if (!name) return;

    try {
        const result = await checkUnfollowAndFollow(name);
        res.json(result);
    } catch (error) {
        console.error('[check-unfollower]', error instanceof Error ? error.message : error);
        res.status(500).json({ error: "Erro ao verificar unfollowers." });
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
 *         description: Nenhum usuário informado ou lista vazia
 *       500:
 *         description: Erro interno
 */
routers.post('/new-follower', async (req: Request, res: Response): Promise<void> => {
    const { usernames } = req.body;

    if (!usernames) {
        res.status(400).json({ error: "Informe 'usernames' com um nome ou lista de usuários." });
        return;
    }

    const list: string[] = Array.isArray(usernames) ? usernames : [usernames];

    if (list.length === 0) {
        res.status(400).json({ error: "A lista de usuários está vazia." });
        return;
    }

    const invalidUsernames = list.filter(u => typeof u !== 'string' || !isValidUsername(u));
    if (invalidUsernames.length > 0) {
        res.status(400).json({ error: "Usernames inválidos.", invalid: invalidUsernames });
        return;
    }

    try {
        const results = await Promise.allSettled(
            list.map(async (username) => {
                const delay = Math.floor(Math.random() * 2000) + 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                const ok = await newFollower(username);
                if (!ok) throw new Error(username);
                return username;
            })
        );

        const success: string[] = [];
        const failed: string[] = [];

        results.forEach((result, i) => {
            if (result.status === 'fulfilled') success.push(result.value);
            else failed.push(list[i]);
        });

        res.json({ success, failed });
    } catch (error) {
        console.error('[new-follower]', error instanceof Error ? error.message : error);
        res.status(500).json({ error: "Erro ao seguir usuário(s)." });
    }
});

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
 *         description: Lista não informada ou vazia
 *       500:
 *         description: Erro interno
 */
routers.delete('/unfollow-users', async (req: Request, res: Response) => {
    const { usernames } = req.body;

    if (!Array.isArray(usernames) || usernames.length === 0) {
        res.status(400).json({ error: "Informe uma lista de usuários em 'usernames'." });
        return;
    }

    const invalidUsernames = usernames.filter(u => typeof u !== 'string' || !isValidUsername(u));
    if (invalidUsernames.length > 0) {
        res.status(400).json({ error: "Usernames inválidos.", invalid: invalidUsernames });
        return;
    }

    try {
        const result = await unfollowUsers(usernames);
        res.json(result);
    } catch (error) {
        console.error('[unfollow-users]', error instanceof Error ? error.message : error);
        res.status(500).json({ error: "Erro ao processar unfollow em lote." });
    }
});

/**
 * @swagger
 * /filter-organic:
 *   post:
 *     summary: Filtra uma lista de usuários separando orgânicos de suspeitos (bots)
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
 *         description: Lista não informada ou vazia
 *       500:
 *         description: Erro interno
 */
routers.post('/filter-organic', async (req: Request, res: Response) => {
    const { usernames } = req.body;

    if (!Array.isArray(usernames) || usernames.length === 0) {
        res.status(400).json({ error: "Informe uma lista de usuários em 'usernames'." });
        return;
    }

    const invalidUsernames = usernames.filter(u => typeof u !== 'string' || !isValidUsername(u));
    if (invalidUsernames.length > 0) {
        res.status(400).json({ error: "Usernames inválidos.", invalid: invalidUsernames });
        return;
    }

    try {
        const result = await filterOrganicFollowers(usernames);
        res.json(result);
    } catch (error) {
        console.error('[filter-organic]', error instanceof Error ? error.message : error);
        res.status(500).json({ error: "Erro ao filtrar usuários." });
    }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *     WelcomeResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         description:
 *           type: string
 *         endpoints:
 *           type: object
 */

export { routers };
