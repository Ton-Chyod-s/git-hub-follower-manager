import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, refreshToken, logout, me } from '../controllers/auth-controller';
import { githubAuth, githubCallback } from '../controllers/github-controller';
import { authMiddleware } from '../middleware/auth-middleware';
import { createResponse } from '../../utils/createResponse';
import { httpStatusCodes } from '../../utils/httpConstants';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    const status = httpStatusCodes.TOO_MANY_REQUESTS;
    return res
      .status(status)
      .json(createResponse(status, 'Too many requests, please try again later', undefined, 'RATE_LIMIT_EXCEEDED'));
  },
});

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

function asyncRoute(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };
}

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
router.post('/auth/register', authLimiter, asyncRoute(register));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful — sets httpOnly cookies
 *       401:
 *         description: Invalid credentials
 */
router.post('/auth/login', authLimiter, asyncRoute(login));

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token (cookie or body)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/auth/refresh', authLimiter, asyncRoute(refreshToken));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and invalidate tokens
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post(
  '/auth/logout',
  authLimiter,
  authMiddleware,
  asyncRoute(logout),
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *       401:
 *         description: Unauthorized
 */
router.get('/auth/me', authMiddleware, asyncRoute(me));

/**
 * @swagger
 * /auth/github:
 *   get:
 *     summary: Redirect to GitHub OAuth authorization page
 *     tags: [Auth - GitHub]
 *     responses:
 *       302:
 *         description: Redirects to GitHub
 *       500:
 *         description: GitHub OAuth not configured
 */
router.get('/auth/github', authLimiter, githubAuth);

/**
 * @swagger
 * /auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback — exchanges code, upserts user, sets auth cookies
 *     tags: [Auth - GitHub]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to FRONTEND_URL (or returns JSON if not set)
 *       400:
 *         description: Missing code
 *       401:
 *         description: Authorization denied or token exchange failed
 *       403:
 *         description: Invalid CSRF state
 */
router.get('/auth/github/callback', authLimiter, asyncRoute(githubCallback));

export default router;
