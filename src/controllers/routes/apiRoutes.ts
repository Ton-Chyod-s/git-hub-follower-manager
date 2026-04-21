import { Router, Request, Response } from 'express';
import { CheckFollowerWithFollowing } from '../../services/useCases/checkFollowerAndFollowing/CheckFollowerWithFollowingUseCase';
import { FollowUsersFollowers } from '../../services/useCases/followUsersFollowers/FollowUsersFollowersUseCase';
import { newFollower } from '../../requests/FollowRequest';
import { checkUnfollowAndFollow } from '../../services/useCases/checkUnfollowAndFollow/checkUnfollowAndFollowUseCase';
import { unfollowUsers } from '../../services/useCases/unfollowUsers/UnfollowUsersUseCase';

const routers = Router();

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
            "/check-follower": "Verifica se um usuário segue outro usuário.",
            "/follow-users": "Segue automaticamente os seguidores de um usuário.",
            "/check-unfollower": "Verifica se um usuário deixou de seguir outro.",
            "/new-follower/:name": "Segue um novo usuário específico."
        },
        note: "Para utilizar os endpoints que exigem um nome de usuário, passe o parâmetro 'name' na query string ou na URL.",
        example: "/check-follower?name=usuario"
    });
});

/**
 * @swagger
 * /check-follower:
 *   get:
 *     summary: Verifica quem você segue mas não te segue de volta
 *     tags:
 *       - Seguidores
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome de usuário do GitHub
 *         example: octocat
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
 *       400:
 *         description: Nome do usuário não informado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno ao consultar seguidores
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
routers.get('/check-follower', async (req: Request, res: Response) => {
    const name = validateUserName(req, res);
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
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome de usuário do GitHub cujos seguidores serão seguidos
 *         example: octocat
 *     responses:
 *       200:
 *         description: Quantidade de usuários seguidos com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: number
 *             example: 12
 *       400:
 *         description: Nome do usuário não informado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno ao seguir usuários
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
routers.get('/follow-users', async (req: Request, res: Response) => {
    const name = validateUserName(req, res);
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
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome de usuário do GitHub
 *         example: octocat
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
 *       400:
 *         description: Nome do usuário não informado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno ao consultar usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
routers.get('/check-unfollower', async (req: Request, res: Response) => {
    const name = validateUserName(req, res);
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
 * /new-follower/{name}:
 *   put:
 *     summary: Segue um usuário específico do GitHub
 *     tags:
 *       - Seguidores
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome de usuário do GitHub a ser seguido
 *         example: octocat
 *     responses:
 *       200:
 *         description: Usuário seguido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Nome do usuário não informado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro interno ao seguir o usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
routers.put('/new-follower/:name', async (req: Request, res: Response): Promise<void> => {
    const name = validateUserName(req, res);
    if (!name) return;

    try {
        const result = await newFollower(name);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Erro ao seguir o usuário." });
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
 *           example: O nome do usuário é obrigatório.
 *     WelcomeResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         description:
 *           type: string
 *         endpoints:
 *           type: object
 *         note:
 *           type: string
 *         example:
 *           type: string
 */

function validateUserName(req: Request, res: Response): string | null {
    const name = req.query.name as string || req.params.name;
    if (!name) {
        res.status(400).json({ error: "O nome do usuário é obrigatório." });
        return null;
    }
    return name;
}

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

export { routers };
