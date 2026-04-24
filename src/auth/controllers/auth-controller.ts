import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RegisterUseCase, registerSchema } from '../usecases/register-usecase';
import { LoginUseCase, loginSchema } from '../usecases/login-usecase';
import { RefreshTokenUseCase } from '../usecases/refresh-token-usecase';
import { LogoutUseCase } from '../usecases/logout-usecase';
import { UserRepository } from '../repositories/user-repository';
import { RefreshTokenRepository } from '../repositories/refresh-token-repository';
import { createResponse } from '../../utils/create-response';
import { httpStatusCodes } from '../../utils/http-constants';

const userRepo = new UserRepository();
const refreshTokenRepo = new RefreshTokenRepository();

const registerUseCase = new RegisterUseCase(userRepo);
const loginUseCase = new LoginUseCase(userRepo, refreshTokenRepo);
const refreshTokenUseCase = new RefreshTokenUseCase(userRepo, refreshTokenRepo);
const logoutUseCase = new LogoutUseCase(refreshTokenRepo, userRepo);

const APP_NAME = process.env.APP_NAME ?? 'app';
const AUTH_COOKIE = `${APP_NAME}_token`;
const REFRESH_COOKIE = `${APP_NAME}_refresh`;
const IS_PROD = process.env.NODE_ENV === 'production';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const accessMaxAge = parseInt(process.env.JWT_COOKIE_MAX_AGE_MS ?? '900000', 10);
  const refreshMaxAge = parseInt(process.env.REFRESH_TOKEN_TTL_MS ?? '604800000', 10);

  res.cookie(AUTH_COOKIE, accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: accessMaxAge,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/auth/refresh',
    maxAge: refreshMaxAge,
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/auth/refresh' });
}

function sendValidationError(res: Response, issues: z.ZodIssue[]): void {
  res.status(httpStatusCodes.BAD_REQUEST).json(
    createResponse(
      httpStatusCodes.BAD_REQUEST,
      'Invalid request body',
      { issues: issues.map((i) => ({ path: i.path, message: i.message })) },
      'VALIDATION_ERROR',
    ),
  );
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) { sendValidationError(res, parsed.error.issues); return; }

    await registerUseCase.execute(parsed.data);

    res
      .status(httpStatusCodes.CREATED)
      .json(createResponse(httpStatusCodes.CREATED, 'Registration request received'));
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) { sendValidationError(res, parsed.error.issues); return; }

    const result = await loginUseCase.execute(parsed.data);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(httpStatusCodes.OK).json(
      createResponse(httpStatusCodes.OK, 'Login successful', { user: result.user }),
    );
  } catch (err) {
    next(err);
  }
}

const refreshBodySchema = z.object({ refresh_token: z.string().min(1) });

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cookieToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;

    let rawToken: string | null = cookieToken ?? null;
    if (!rawToken) {
      const parsed = refreshBodySchema.safeParse(req.body);
      rawToken = parsed.success ? parsed.data.refresh_token : null;
    }

    if (!rawToken) {
      res.status(httpStatusCodes.BAD_REQUEST).json(
        createResponse(httpStatusCodes.BAD_REQUEST, 'refresh_token is required', undefined, 'VALIDATION_ERROR'),
      );
      return;
    }

    const result = await refreshTokenUseCase.execute(rawToken);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    if (cookieToken) {
      res.status(httpStatusCodes.OK).json(createResponse(httpStatusCodes.OK, 'Token refreshed'));
      return;
    }

    res.status(httpStatusCodes.OK).json(
      createResponse(httpStatusCodes.OK, 'Token refreshed', {
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user?.id) {
      await logoutUseCase.execute(req.user.id);
    }
    clearAuthCookies(res);
    res.status(httpStatusCodes.OK).json(createResponse(httpStatusCodes.OK, 'Logged out successfully'));
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(httpStatusCodes.UNAUTHORIZED).json(
        createResponse(httpStatusCodes.UNAUTHORIZED, 'Unauthorized', undefined, 'UNAUTHORIZED'),
      );
      return;
    }

    const user = await userRepo.findById(req.user.id);
    if (!user) {
      res.status(httpStatusCodes.UNAUTHORIZED).json(
        createResponse(httpStatusCodes.UNAUTHORIZED, 'Unauthorized', undefined, 'UNAUTHORIZED'),
      );
      return;
    }

    res.status(httpStatusCodes.OK).json(
      createResponse(httpStatusCodes.OK, 'OK', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        githubLogin: user.github_login ?? undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
}
