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
routers.get('/', (req: Request, res: Response) => {
    res.json({
        message: "Bem-vindo à API de Gerenciamento de Seguidores!",
        description: "Esta API permite verificar seguidores, seguir usuários automaticamente e monitorar alterações na lista de seguidores.",
        endpoints: {
            "/check-follower": "Verifica quem você segue mas não te segue de volta.",
            "/follow-users": "Segue automaticamente os seguidores de um usuário.",
            "/check-unfollower": "Verifica quem te segue mas você ainda não segue de volta.",
            "/new-follower": "Segue um ou mais usuários específicos.",
            "/unfollow-users": "Para de seguir uma lista de usuários.",
            "/filter-organic": "Filtra usuários separando orgânicos de suspeitos (bots)."
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
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *             example: ["usuario1", "usuario2"]
 *       500:
 *         description: Erro interno ao consultar seguidores
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
routers.get('/check-follower', async (req: Request, res: Response) => {
    const name = getAuthenticatedUser(res);
    if (!name) return;

    try {
        const result = await CheckFollowerWithFollowing(name);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Erro ao conferir seguidores do usuário." });
    }
});

/**
 * @swagger
 * /follow-users:
 *   get:
 *     summary: Segue automaticamente os seguidores de um usuário que você ainda não segue
 *     tags:
 *       - Seguidores
 *     responses:
 *       200:
 *         description: Quantidade de usuários seguidos com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: number
 *             example: 12
 *       500:
 *         description: Erro interno ao seguir usuários
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
routers.get('/follow-users', async (req: Request, res: Response) => {
    const name = getAuthenticatedUser(res);
    if (!name) return;

    try {
        const result = await FollowUsersFollowers(name);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Erro ao seguir seguidores do usuário." });
    }
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
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *             example: ["usuario3", "usuario4"]
 *       500:
 *         description: Erro interno ao consultar usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
routers.get('/check-unfollower', async (req: Request, res: Response) => {
    const name = getAuthenticatedUser(res);
    if (!name) return;

    try {
        const result = await checkUnfollowAndFollow(name);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Erro ao consultar usuário seguir." });
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
 *                     example: "usuario1"
 *                   - type: array
 *                     items:
 *                       type: string
 *                     example: ["usuario1", "usuario2"]
 *     responses:
 *       200:
 *         description: Resultado do follow
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: array
 *                   items:
 *                     type: string
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Nenhum usuário informado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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

    try {
        const results = await Promise.allSettled(
            list.map(async (username) => {
                const randomDelay = Math.floor(Math.random() * 2000) + 1000;
                await new Promise(resolve => setTimeout(resolve, randomDelay));
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
 *                 example: ["usuario1", "usuario2"]
 *     responses:
 *       200:
 *         description: Resultado do unfollow em lote
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: array
 *                   items:
 *                     type: string
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Lista de usuários não informada ou vazia
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
routers.delete('/unfollow-users', async (req: Request, res: Response) => {
    const { usernames } = req.body;

    if (!Array.isArray(usernames) || usernames.length === 0) {
        res.status(400).json({ error: "Informe uma lista de usuários em 'usernames'." });
        return;
    }

    try {
        const result = await unfollowUsers(usernames);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Erro ao processar unfollow em lote." });
    }
});

/**
 * @swagger
 * /filter-organic:
 *   post:
 *     summary: Filtra uma lista de usuários separando orgânicos de suspeitos (bots/follow-for-follow)
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
 *                 example: ["usuario1", "giewan", "benalbano"]
 *     responses:
 *       200:
 *         description: Resultado da filtragem
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organic:
 *                   type: array
 *                   items:
 *                     type: string
 *                 suspicious:
 *                   type: array
 *                   items:
 *                     type: string
 *                 reasons:
 *                   type: object
 *       400:
 *         description: Lista não informada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
routers.post('/filter-organic', async (req: Request, res: Response) => {
    const { usernames } = req.body;

    if (!Array.isArray(usernames) || usernames.length === 0) {
        res.status(400).json({ error: "Informe uma lista de usuários em 'usernames'." });
        return;
    }

    try {
        const result = await filterOrganicFollowers(usernames);
        res.json(result);
    } catch (error) {
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
 *           example: Variável USER não configurada no ambiente.
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
